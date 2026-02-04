const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { createCustomerSchema, updateCustomerSchema, listCustomersSchema } = require('../validators/customer');

// POST /customers
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { error, value } = createCustomerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, email, phone } = value;

    const [result] = await pool.execute(
      'INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)',
      [name, email, phone || null]
    );

    const [customer] = await pool.execute(
      'SELECT id, name, email, phone, created_at FROM customers WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(customer[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    next(err);
  }
});

// GET /customers/:id
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }

    const [customers] = await pool.execute(
      'SELECT id, name, email, phone, created_at FROM customers WHERE id = ? AND deleted_at IS NULL',
      [id]
    );

    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customers[0]);
  } catch (err) {
    next(err);
  }
});

// GET /customers
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { error, value } = listCustomersSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { search, cursor, limit } = value;
    let query = 'SELECT id, name, email, phone, created_at FROM customers WHERE deleted_at IS NULL';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (cursor !== undefined && cursor !== null) {
      query += ' AND id > ?';
      params.push(parseInt(cursor));
    }

    // LIMIT no soporta placeholders en prepared statements de MySQL2
    // Usamos interpolación directa (seguro porque viene del validador)
    query += ` ORDER BY id ASC LIMIT ${parseInt(limit)}`;

    const [customers] = await pool.execute(query, params);

    const response = {
      data: customers,
      cursor: customers.length > 0 ? customers[customers.length - 1].id : null,
      hasMore: customers.length === limit
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

// PUT /customers/:id
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }

    const { error, value } = updateCustomerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const updates = [];
    const params = [];

    if (value.name !== undefined) {
      updates.push('name = ?');
      params.push(value.name);
    }
    if (value.email !== undefined) {
      updates.push('email = ?');
      params.push(value.email);
    }
    if (value.phone !== undefined) {
      updates.push('phone = ?');
      params.push(value.phone || null);
    }

    params.push(id);

    const [result] = await pool.execute(
      `UPDATE customers SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const [customer] = await pool.execute(
      'SELECT id, name, email, phone, created_at FROM customers WHERE id = ?',
      [id]
    );

    res.json(customer[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    next(err);
  }
});

// DELETE /customers/:id (soft delete)
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }

    const [result] = await pool.execute(
      'UPDATE customers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
