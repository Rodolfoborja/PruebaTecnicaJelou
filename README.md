# Jelou B2B Orders System

Sistema de gestión de pedidos B2B compuesto por dos APIs (Customers y Orders) y un Lambda orquestador.

## Estructura del Proyecto

```
├── customers-api/          # API de gestión de clientes
├── orders-api/             # API de gestión de productos y órdenes
├── lambda-orchestrator/    # Lambda orquestador
├── db/                     # Esquemas y datos de la base de datos
│   ├── schema.sql
│   └── seed.sql
├── docker-compose.yml      # Configuración de Docker Compose
└── README.md
```

## Requisitos Previos

- Node.js 22.x
- Docker y Docker Compose
- MySQL 8.0 (incluido en Docker Compose)
- npm o yarn

## Variables de Entorno

Cada servicio tiene un archivo `.env.example` que debe copiarse a `.env`:

### Customers API
```bash
cd customers-api
cp .env.example .env
```

### Orders API
```bash
cd orders-api
cp .env.example .env
```

### Lambda Orchestrator
```bash
cd lambda-orchestrator
cp .env.example .env
```

## Levantamiento con Docker Compose

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd PruebaTecnicaJelou
```

### 2. Configurar variables de entorno
Copiar los archivos `.env.example` a `.env` en cada servicio y ajustar según sea necesario.

### 3. Construir las imágenes
```bash
docker-compose build
```

### 4. Levantar los servicios
```bash
docker-compose up -d
```

### 5. Verificar que los servicios estén corriendo
```bash
# Verificar contenedores
docker-compose ps

# Verificar health checks
curl http://localhost:3001/health
curl http://localhost:3002/health
```

**URLs Base:**
- Customers API: http://localhost:3001
- Orders API: http://localhost:3002
- MySQL: localhost:3306

## Levantamiento Local (Sin Docker)

### 1. Instalar dependencias

```bash
# Customers API
cd customers-api
npm install

# Orders API
cd ../orders-api
npm install

# Lambda Orchestrator
cd ../lambda-orchestrator
npm install
```

### 2. Configurar MySQL
Asegúrate de tener MySQL corriendo localmente y ejecuta:

```bash
cd customers-api
npm run migrate
npm run seed
```

### 3. Iniciar servicios

```bash
# Terminal 1 - Customers API
cd customers-api
npm run dev

# Terminal 2 - Orders API
cd orders-api
npm run dev
```

## Lambda Orquestador

### Ejecución Local

```bash
cd lambda-orchestrator
npm install
npm run dev
```

El Lambda estará disponible en: http://localhost:3000

### Invocar el Lambda (Local)

```bash
curl -X POST http://localhost:3000/orchestrator/create-and-confirm-order \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [
      {
        "product_id": 2,
        "qty": 3
      }
    ],
    "idempotency_key": "abc-123",
    "correlation_id": "req-789"
  }'
```

### Despliegue en AWS

1. Configurar credenciales de AWS:
```bash
aws configure
```

2. Actualizar variables de entorno en `serverless.yml` con las URLs públicas de las APIs.

3. Desplegar:
```bash
cd lambda-orchestrator
npm run deploy
```

### Exponer Lambda Local con ngrok (Opcional)

```bash
ngrok http 3000
```

## Autenticación

### JWT para APIs

**Opción 1: Usar el script helper (Recomendado)**
```bash
node generate-token.js
```

**Opción 2: Generar manualmente con Node.js**
```bash
cd customers-api
node -e "const jwt = require('jsonwebtoken'); console.log(jwt.sign({ userId: 1, email: 'test@example.com' }, 'your-secret-key-change-in-production', { expiresIn: '24h' }));"
```

### Service Token
El token de servicio se define en las variables de entorno como `SERVICE_TOKEN` y se usa para comunicación entre servicios.

## Ejemplos de Uso con cURL

### 1. Crear un Cliente

```bash
curl -X POST http://localhost:3001/customers \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ACME Corporation",
    "email": "ops@acme.com",
    "phone": "+1-555-0100"
  }'
```

### 2. Obtener Cliente

```bash
curl http://localhost:3001/customers/1 \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 3. Listar Clientes

```bash
curl "http://localhost:3001/customers?search=ACME&limit=10" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 4. Actualizar Cliente

```bash
curl -X PUT http://localhost:3001/customers/1 \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ACME Corporation Updated",
    "phone": "+1-555-0101"
  }'
```

### 5. Eliminar Cliente (Soft Delete)

```bash
curl -X DELETE http://localhost:3001/customers/1 \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 6. Crear Producto

```bash
curl -X POST http://localhost:3002/products \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "PROD-006",
    "name": "Wireless Keyboard",
    "price_cents": 7990,
    "stock": 100
  }'
```

### 7. Obtener Producto

```bash
curl http://localhost:3002/products/1 \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 8. Actualizar Producto (Precio/Stock)

```bash
curl -X PATCH http://localhost:3002/products/1 \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "price_cents": 139900,
    "stock": 45
  }'
```

### 9. Crear Orden

```bash
curl -X POST http://localhost:3002/orders \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [
      {
        "product_id": 2,
        "qty": 3
      },
      {
        "product_id": 3,
        "qty": 1
      }
    ]
  }'
```

### 10. Obtener Orden

```bash
curl http://localhost:3002/orders/1 \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 11. Listar Órdenes

```bash
curl "http://localhost:3002/orders?status=CREATED&limit=10" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 12. Confirmar Orden (Idempotente)

```bash
curl -X POST http://localhost:3002/orders/1/confirm \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "X-Idempotency-Key: unique-key-123"
```

### 13. Cancelar Orden

```bash
curl -X POST http://localhost:3002/orders/1/cancel \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 14. Lambda Orquestador - Crear y Confirmar Pedido

```bash
curl -X POST http://localhost:3000/orchestrator/create-and-confirm-order \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [
      {
        "product_id": 2,
        "qty": 3
      }
    ],
    "idempotency_key": "abc-123",
    "correlation_id": "req-789"
  }'
```

**Respuesta esperada (201):**
```json
{
  "success": true,
  "correlationId": "req-789",
  "data": {
    "customer": {
      "id": 1,
      "name": "ACME Corporation",
      "email": "ops@acme.com",
      "phone": "+1-555-0100"
    },
    "order": {
      "id": 1,
      "status": "CONFIRMED",
      "total_cents": 389700,
      "items": [
        {
          "product_id": 2,
          "qty": 3,
          "unit_price_cents": 129900,
          "subtotal_cents": 389700
        }
      ]
    }
  }
}
```

## Scripts NPM Disponibles

### Customers API
- `npm start` - Inicia el servidor en modo producción
- `npm run dev` - Inicia el servidor en modo desarrollo con nodemon
- `npm run build` - No requiere compilación (JavaScript)
- `npm run migrate` - Ejecuta migraciones de base de datos
- `npm run seed` - Inserta datos de ejemplo
- `npm test` - Ejecuta pruebas (no implementado)

### Orders API
- `npm start` - Inicia el servidor en modo producción
- `npm run dev` - Inicia el servidor en modo desarrollo con nodemon
- `npm run build` - No requiere compilación (JavaScript)
- `npm run migrate` - Ejecuta migraciones de base de datos
- `npm run seed` - Inserta datos de ejemplo
- `npm test` - Ejecuta pruebas (no implementado)

### Lambda Orchestrator
- `npm run dev` - Inicia serverless-offline localmente
- `npm run deploy` - Despliega a AWS
- `npm run build` - No requiere compilación (JavaScript)
- `npm test` - Ejecuta pruebas (no implementado)

## Documentación OpenAPI

La documentación OpenAPI 3.0 está disponible en:
- Customers API: `/customers-api/openapi.yaml`
- Orders API: `/orders-api/openapi.yaml`

Puedes visualizarla usando [Swagger Editor](https://editor.swagger.io/) o importarla en Postman/Insomnia.

## Collections para Postman e Insomnia

El proyecto incluye collections listas para importar:
- **Postman**: 
  - Collection: [postman_collection.json](postman_collection.json)
  - Environment: [postman_environment.json](postman_environment.json)
  - **El JWT token se genera AUTOMÁTICAMENTE** al hacer cualquier request
- **Insomnia**: [insomnia_collection.json](insomnia_collection.json)

### Usar Postman (Recomendado)

1. Importa `postman_collection.json`
2. Importa `postman_environment.json`
3. Selecciona el environment "Jelou B2B - Local"
4. ¡Listo! El JWT token se genera automáticamente en cada request

### Generar Token JWT Manualmente (Opcional)

Si prefieres generar el token manualmente:

```bash
node generate-token.js
```

## Características Implementadas

### Customers API
✅ POST /customers - Crear cliente
✅ GET /customers/:id - Obtener cliente
✅ GET /customers - Listar clientes con paginación y búsqueda
✅ PUT /customers/:id - Actualizar cliente
✅ DELETE /customers/:id - Soft delete
✅ GET /internal/customers/:id - Endpoint interno con service token

### Orders API
✅ POST /products - Crear producto
✅ GET /products/:id - Obtener producto
✅ GET /products - Listar productos con paginación
✅ PATCH /products/:id - Actualizar precio/stock
✅ POST /orders - Crear orden (valida cliente, stock, transacción)
✅ GET /orders/:id - Obtener orden con items
✅ GET /orders - Listar órdenes con filtros
✅ POST /orders/:id/confirm - Confirmar orden (idempotente)
✅ POST /orders/:id/cancel - Cancelar orden (restaura stock)

### Lambda Orchestrator
✅ POST /orchestrator/create-and-confirm-order - Orquesta creación y confirmación
✅ Validación de cliente
✅ Creación de orden
✅ Confirmación idempotente
✅ Respuesta consolidada con cliente y orden

### Seguridad y Validación
✅ Autenticación JWT
✅ Service-to-service authentication
✅ Validación con Joi
✅ SQL parametrizado (prevención de SQL injection)
✅ Idempotencia con X-Idempotency-Key

### Base de Datos
✅ Transacciones ACID
✅ Control de stock con locks
✅ Soft delete en customers
✅ Índices optimizados
✅ Schema y seed incluidos

## Arquitectura

```
┌─────────────────┐
│   Lambda        │
│  Orchestrator   │
└────────┬────────┘
         │
         ├──────────────┐
         │              │
    ┌────▼────┐    ┌───▼─────┐
    │Customers│    │ Orders  │
    │   API   │◄───│   API   │
    └────┬────┘    └────┬────┘
         │              │
         └──────┬───────┘
                │
           ┌────▼────┐
           │  MySQL  │
           └─────────┘
```

## Base de Datos

### Tablas
- `customers` - Clientes con soft delete
- `products` - Productos con SKU único
- `orders` - Órdenes con estados
- `order_items` - Items de cada orden
- `idempotency_keys` - Registro de idempotencia

### Estados de Orden
- `CREATED` - Orden creada, stock descontado
- `CONFIRMED` - Orden confirmada
- `CANCELED` - Orden cancelada, stock restaurado

### Reglas de Negocio
- Email único por cliente
- SKU único por producto
- Validación de stock antes de crear orden
- Descuento de stock en transacción
- Cancelación CREATED: sin restricciones
- Cancelación CONFIRMED: solo dentro de 10 minutos
- Idempotencia: misma key retorna misma respuesta

## Troubleshooting

### MySQL no inicia
```bash
docker-compose down -v
docker-compose up -d mysql
```

### Las APIs no se conectan a MySQL
Espera a que MySQL esté completamente iniciado:
```bash
docker-compose logs mysql
```

### Regenerar base de datos
```bash
docker-compose down -v
docker-compose up -d
```

### Ver logs
```bash
docker-compose logs -f customers-api
docker-compose logs -f orders-api
```

## Notas de Producción

Para un ambiente de producción, considera:
- Cambiar todos los secrets y tokens
- Usar variables de entorno seguras
- Implementar rate limiting
- Agregar logging estructurado
- Configurar monitoreo y alertas
- Usar un servicio de secrets management
- Implementar backups de base de datos
- Agregar pruebas unitarias e integración
- Configurar CI/CD

## Licencia

MIT