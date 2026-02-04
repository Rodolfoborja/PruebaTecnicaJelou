-- Seed data for Jelou B2B Orders System

-- Insert sample customers
INSERT INTO customers (name, email, phone) VALUES
('ACME Corporation', 'ops@acme.com', '+1-555-0100'),
('TechStart Inc', 'contact@techstart.com', '+1-555-0101'),
('Global Solutions', 'info@globalsol.com', '+1-555-0102'),
('Innovation Labs', 'sales@innovlabs.com', '+1-555-0103');

-- Insert sample products
INSERT INTO products (sku, name, price_cents, stock) VALUES
('PROD-001', 'Laptop Professional 15"', 129900, 50),
('PROD-002', 'Wireless Mouse', 2990, 200),
('PROD-003', 'Mechanical Keyboard', 8990, 100),
('PROD-004', 'USB-C Hub 7-in-1', 4990, 150),
('PROD-005', '27" Monitor 4K', 39900, 75);
