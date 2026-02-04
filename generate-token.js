// Script helper para generar JWT token para pruebas
// Ejecutar con: node generate-token.js

require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Generar token con datos de prueba
const token = jwt.sign(
  {
    userId: 1,
    email: 'test@example.com',
    role: 'admin'
  },
  JWT_SECRET,
  {
    expiresIn: '24h'
  }
);

console.log('\n==============================================');
console.log('  JWT Token generado exitosamente');
console.log('==============================================\n');
console.log('Token:\n');
console.log(token);
console.log('\n==============================================');
console.log('Usa este token en el header Authorization:');
console.log('Authorization: Bearer ' + token);
console.log('==============================================\n');

// También decodificar el token para mostrar el contenido
const decoded = jwt.decode(token);
console.log('Contenido del token:');
console.log(JSON.stringify(decoded, null, 2));
console.log('\n==============================================');
console.log('Expira en:', new Date(decoded.exp * 1000).toLocaleString());
console.log('==============================================\n');
