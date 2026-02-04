require('dotenv').config();
const express = require('express');
const cors = require('cors');
const customerRoutes = require('./routes/customers');
const internalRoutes = require('./routes/internal');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'customers-api' });
});

// Routes
app.use('/customers', customerRoutes);
app.use('/internal', internalRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Customers API running on port ${PORT}`);
});
