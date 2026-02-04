const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { serviceAuthMiddleware } = require('../middleware/auth');

// GET /internal/customers/:id
router.get('/customers/:id', serviceAuthMiddleware, async (req, res, next) => {
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

module.exports = router;
