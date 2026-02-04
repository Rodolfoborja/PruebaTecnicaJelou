const axios = require('axios');
const Joi = require('joi');

const requestSchema = Joi.object({
  customer_id: Joi.number().integer().min(1).required(),
  items: Joi.array().items(
    Joi.object({
      product_id: Joi.number().integer().min(1).required(),
      qty: Joi.number().integer().min(1).required()
    })
  ).min(1).required(),
  idempotency_key: Joi.string().required(),
  correlation_id: Joi.string().optional()
});

module.exports.orchestrator = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    // Parse body
    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON body' })
      };
    }

    // Validate request
    const { error, value } = requestSchema.validate(body);
    if (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: error.details[0].message })
      };
    }

    const { customer_id, items, idempotency_key, correlation_id } = value;

    const customersApiBase = process.env.CUSTOMERS_API_BASE;
    const ordersApiBase = process.env.ORDERS_API_BASE;
    const serviceToken = process.env.SERVICE_TOKEN;
    const jwtToken = process.env.JWT_TOKEN;

    // Step 1: Validate customer
    let customer;
    try {
      const customerResponse = await axios.get(
        `${customersApiBase}/internal/customers/${customer_id}`,
        {
          headers: {
            'Authorization': `Bearer ${serviceToken}`
          }
        }
      );
      customer = customerResponse.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Customer not found' })
        };
      }
      throw error;
    }

    // Step 2: Create order
    let order;
    try {
      const orderResponse = await axios.post(
        `${ordersApiBase}/orders`,
        {
          customer_id,
          items
        },
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      order = orderResponse.data;
    } catch (error) {
      if (error.response) {
        return {
          statusCode: error.response.status,
          headers,
          body: JSON.stringify({ error: error.response.data.error || 'Failed to create order' })
        };
      }
      throw error;
    }

    // Step 3: Confirm order
    try {
      const confirmResponse = await axios.post(
        `${ordersApiBase}/orders/${order.id}/confirm`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'X-Idempotency-Key': idempotency_key
          }
        }
      );
      order = confirmResponse.data;
    } catch (error) {
      if (error.response) {
        return {
          statusCode: error.response.status,
          headers,
          body: JSON.stringify({ error: error.response.data.error || 'Failed to confirm order' })
        };
      }
      throw error;
    }

    // Build response
    const response = {
      success: true,
      correlationId: correlation_id || null,
      data: {
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone
        },
        order: {
          id: order.id,
          status: order.status,
          total_cents: order.total_cents,
          items: order.items.map(item => ({
            product_id: item.product_id,
            qty: item.qty,
            unit_price_cents: item.unit_price_cents,
            subtotal_cents: item.subtotal_cents
          }))
        }
      }
    };

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Orchestrator error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
