const axios = require('axios');

async function validateCustomer(customerId) {
  try {
    const response = await axios.get(
      `${process.env.CUSTOMERS_API_BASE}/internal/customers/${customerId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SERVICE_TOKEN}`
        }
      }
    );
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw error;
  }
}

module.exports = { validateCustomer };
