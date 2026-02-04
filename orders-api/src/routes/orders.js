const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { idempotencyMiddleware, saveIdempotencyKey } = require('../middleware/idempotency');
const { createOrderSchema, listOrdersSchema } = require('../validators/orders');
const { validateCustomer } = require('../services/customerService');

// POST /orders
router.post('/', authMiddleware, async (req, res, next) => {
  const connection = await pool.getConnection();
  
  try {
    const { error, value } = createOrderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { customer_id, items } = value;

    // Validate customer
    const customer = await validateCustomer(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await connection.beginTransaction();

    // Validate stock and calculate totals
    let totalCents = 0;
    const orderItems = [];

    for (const item of items) {
      const [products] = await connection.execute(
        'SELECT id, price_cents, stock FROM products WHERE id = ? FOR UPDATE',
        [item.product_id]
      );

      if (products.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: `Product ${item.product_id} not found` });
      }

      const product = products[0];

      if (product.stock < item.qty) {
        await connection.rollback();
        return res.status(400).json({ error: `Insufficient stock for product ${item.product_id}` });
      }

      const subtotalCents = product.price_cents * item.qty;
      totalCents += subtotalCents;

      orderItems.push({
        product_id: item.product_id,
        qty: item.qty,
        unit_price_cents: product.price_cents,
        subtotal_cents: subtotalCents
      });

      // Update stock
      await connection.execute(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.qty, item.product_id]
      );
    }

    // Create order
    const [orderResult] = await connection.execute(
      'INSERT INTO orders (customer_id, status, total_cents) VALUES (?, ?, ?)',
      [customer_id, 'CREATED', totalCents]
    );

    const orderId = orderResult.insertId;

    // Insert order items
    for (const orderItem of orderItems) {
      await connection.execute(
        'INSERT INTO order_items (order_id, product_id, qty, unit_price_cents, subtotal_cents) VALUES (?, ?, ?, ?, ?)',
        [orderId, orderItem.product_id, orderItem.qty, orderItem.unit_price_cents, orderItem.subtotal_cents]
      );
    }

    await connection.commit();

    // Fetch complete order
    const [orders] = await connection.execute(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    const [items_result] = await connection.execute(
      'SELECT * FROM order_items WHERE order_id = ?',
      [orderId]
    );

    const order = orders[0];
    order.items = items_result;

    res.status(201).json(order);
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// GET /orders/:id
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const [items] = await pool.execute(
      'SELECT * FROM order_items WHERE order_id = ?',
      [id]
    );

    const order = orders[0];
    order.items = items;

    res.json(order);
  } catch (err) {
    next(err);
  }
});

// GET /orders
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { error, value } = listOrdersSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { status, from, to, cursor, limit } = value;
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (from) {
      query += ' AND created_at >= ?';
      params.push(from);
    }

    if (to) {
      query += ' AND created_at <= ?';
      params.push(to);
    }

    if (cursor !== undefined && cursor !== null) {
      query += ' AND id > ?';
      params.push(parseInt(cursor));
    }

    // LIMIT no soporta placeholders en prepared statements de MySQL2
    // Usamos interpolación directa (seguro porque viene del validador)
    query += ` ORDER BY id ASC LIMIT ${parseInt(limit)}`;

    const [orders] = await pool.execute(query, params);

    const response = {
      data: orders,
      cursor: orders.length > 0 ? orders[orders.length - 1].id : null,
      hasMore: orders.length === limit
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

// POST /orders/:id/confirm
router.post('/:id/confirm', authMiddleware, idempotencyMiddleware, async (req, res, next) => {
  const connection = await pool.getConnection();
  
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    await connection.beginTransaction();

    const [orders] = await connection.execute(
      'SELECT * FROM orders WHERE id = ? FOR UPDATE',
      [id]
    );

    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    if (order.status === 'CONFIRMED') {
      await connection.commit();
      
      const [items] = await connection.execute(
        'SELECT * FROM order_items WHERE order_id = ?',
        [id]
      );
      
      const result = { ...order, items };
      
      if (req.idempotencyKey) {
        await saveIdempotencyKey(req.idempotencyKey, 'order_confirm', id, result);
      }
      
      return res.json(result);
    }

    if (order.status !== 'CREATED') {
      await connection.rollback();
      return res.status(400).json({ error: 'Order cannot be confirmed' });
    }

    await connection.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      ['CONFIRMED', id]
    );

    await connection.commit();

    const [updatedOrders] = await connection.execute(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );

    const [items] = await connection.execute(
      'SELECT * FROM order_items WHERE order_id = ?',
      [id]
    );

    const result = { ...updatedOrders[0], items };

    if (req.idempotencyKey) {
      await saveIdempotencyKey(req.idempotencyKey, 'order_confirm', id, result);
    }

    res.json(result);
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// POST /orders/:id/cancel
router.post('/:id/cancel', authMiddleware, async (req, res, next) => {
  const connection = await pool.getConnection();
  
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    await connection.beginTransaction();

    const [orders] = await connection.execute(
      'SELECT * FROM orders WHERE id = ? FOR UPDATE',
      [id]
    );

    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    if (order.status === 'CANCELED') {
      await connection.rollback();
      return res.status(400).json({ error: 'Order is already canceled' });
    }

    // Validate cancellation rules
    if (order.status === 'CONFIRMED') {
      const orderAge = Date.now() - new Date(order.created_at).getTime();
      const tenMinutes = 10 * 60 * 1000;
      
      if (orderAge > tenMinutes) {
        await connection.rollback();
        return res.status(400).json({ error: 'Cannot cancel order after 10 minutes' });
      }
    }

    // Restore stock
    const [items] = await connection.execute(
      'SELECT product_id, qty FROM order_items WHERE order_id = ?',
      [id]
    );

    for (const item of items) {
      await connection.execute(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [item.qty, item.product_id]
      );
    }

    await connection.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      ['CANCELED', id]
    );

    await connection.commit();

    const [updatedOrders] = await connection.execute(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );

    const [updatedItems] = await connection.execute(
      'SELECT * FROM order_items WHERE order_id = ?',
      [id]
    );

    const result = { ...updatedOrders[0], items: updatedItems };

    res.json(result);
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

module.exports = router;
