# Guía Rápida de Postman

## 🚀 Setup Automático (3 pasos)

### 1. Importar Collection
- Abre Postman
- Click en "Import"
- Arrastra o selecciona: `postman_collection.json`

### 2. Importar Environment
- Click en "Import" nuevamente
- Arrastra o selecciona: `postman_environment.json`

### 3. Seleccionar Environment
- En la esquina superior derecha, selecciona "Jelou B2B - Local"

## ✨ ¡Listo! El JWT se genera automáticamente

Cada vez que hagas un request, el Pre-request Script generará automáticamente un token JWT válido por 24 horas usando las variables del environment.

## 🔧 Variables del Environment

- `customers_base_url`: http://localhost:3001
- `orders_base_url`: http://localhost:3002
- `lambda_base_url`: http://localhost:3000
- `jwt_secret`: your-secret-key-change-in-production
- `service_token`: internal-service-token-change-in-production
- `jwt_token`: (Se genera automáticamente)
- `user_id`: 1
- `user_email`: test@example.com

## 📝 Orden de Prueba Recomendado

### 1. Verificar Servicios
- Customers API → Health Check
- Orders API → Products → Health Check

### 2. Customers
- Create Customer
- List Customers
- Get Customer by ID

### 3. Products
- List Products (ver datos de seed)
- Create Product
- Update Product

### 4. Orders
- Create Order
- Get Order by ID
- Confirm Order (nota el X-Idempotency-Key)
- Reintentar Confirm Order (misma key = misma respuesta)

### 5. Lambda Orchestrator
- Create and Confirm Order (proceso completo)

## 🔍 Ver el Token Generado

Para ver el token que se generó automáticamente:
1. Ve a Environment (esquina superior derecha)
2. Click en el ojo 👁️
3. Busca la variable `jwt_token`

## 💡 Tips

- El token expira en 24 horas
- Si quieres regenerar el token, borra el valor de `jwt_token` en el environment
- Los timestamps en `X-Idempotency-Key` usan `{{$timestamp}}` (valor dinámico de Postman)
- Puedes cambiar `user_id` y `user_email` en el environment para generar tokens diferentes
