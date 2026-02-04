const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { createProductSchema, updateProductSchema, listProductsSchema } = require('../validators/orders');

// POST /products
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { error, value } = createProductSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { sku, name, price_cents, stock } = value;

    const [result] = await pool.execute(
      'INSERT INTO products (sku, name, price_cents, stock) VALUES (?, ?, ?, ?)',
      [sku, name, price_cents, stock]
    );

    const [product] = await pool.execute(
      'SELECT * FROM products WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(product[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'SKU already exists' });
    }
    next(err);
  }
});

// GET /products/:id
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const [products] = await pool.execute(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(products[0]);
  } catch (err) {
    next(err);
  }
});

// GET /products
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { error, value } = listProductsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { search, cursor, limit } = value;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (cursor !== undefined && cursor !== null) {
      query += ' AND id > ?';
      params.push(parseInt(cursor));
    }

    // LIMIT no soporta placeholders en prepared statements de MySQL2
    // Usamos interpolación directa (seguro porque viene del validador)
    query += ` ORDER BY id ASC LIMIT ${parseInt(limit)}`;

    const [products] = await pool.execute(query, params);

    const response = {
      data: products,
      cursor: products.length > 0 ? products[products.length - 1].id : null,
      hasMore: products.length === limit
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

// PATCH /products/:id
router.patch('/:id', authMiddleware, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const { error, value } = updateProductSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const updates = [];
    const params = [];

    if (value.price_cents !== undefined) {
      updates.push('price_cents = ?');
      params.push(value.price_cents);
    }
    if (value.stock !== undefined) {
      updates.push('stock = ?');
      params.push(value.stock);
    }

    params.push(id);

    const [result] = await pool.execute(
      `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const [product] = await pool.execute(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    res.json(product[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
