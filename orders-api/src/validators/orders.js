const Joi = require('joi');

const createProductSchema = Joi.object({
  sku: Joi.string().required().max(100),
  name: Joi.string().required().max(255),
  price_cents: Joi.number().integer().min(0).required(),
  stock: Joi.number().integer().min(0).required()
});

const updateProductSchema = Joi.object({
  price_cents: Joi.number().integer().min(0).optional(),
  stock: Joi.number().integer().min(0).optional()
}).min(1);

const listProductsSchema = Joi.object({
  search: Joi.string().optional().allow(''),
  cursor: Joi.number().integer().min(0).optional(),
  limit: Joi.number().integer().min(1).max(100).optional().default(20)
}).options({ convert: true });

const createOrderSchema = Joi.object({
  customer_id: Joi.number().integer().min(1).required(),
  items: Joi.array().items(
    Joi.object({
      product_id: Joi.number().integer().min(1).required(),
      qty: Joi.number().integer().min(1).required()
    })
  ).min(1).required()
});

const listOrdersSchema = Joi.object({
  status: Joi.string().valid('CREATED', 'CONFIRMED', 'CANCELED').optional(),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  cursor: Joi.number().integer().min(0).optional(),
  limit: Joi.number().integer().min(1).max(100).optional().default(20)
}).options({ convert: true });

module.exports = {
  createProductSchema,
  updateProductSchema,
  listProductsSchema,
  createOrderSchema,
  listOrdersSchema
};
