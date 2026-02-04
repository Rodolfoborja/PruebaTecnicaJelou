const Joi = require('joi');

const createCustomerSchema = Joi.object({
  name: Joi.string().required().min(1).max(255),
  email: Joi.string().email().required().max(255),
  phone: Joi.string().optional().allow('').max(50)
});

const updateCustomerSchema = Joi.object({
  name: Joi.string().optional().min(1).max(255),
  email: Joi.string().email().optional().max(255),
  phone: Joi.string().optional().allow('').max(50)
}).min(1);

const listCustomersSchema = Joi.object({
  search: Joi.string().optional().allow(''),
  cursor: Joi.number().integer().min(0).optional(),
  limit: Joi.number().integer().min(1).max(100).optional().default(20)
}).options({ convert: true });

module.exports = {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersSchema
};
