CREATE DATABASE IF NOT EXISTS inventory_db;
USE inventory_db;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(120),
  email VARCHAR(180),
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'ADMIN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  barcode VARCHAR(80) NOT NULL UNIQUE,
  product_name VARCHAR(180) NOT NULL,
  category VARCHAR(100),
  supplier VARCHAR(150),
  category_id BIGINT,
  supplier_id BIGINT,
  purchase_price DECIMAL(12,2) NOT NULL,
  selling_price DECIMAL(12,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  minimum_stock_level INT NOT NULL DEFAULT 0,
  last_alert_at TIMESTAMP NULL,
  last_critical_alert_at TIMESTAMP NULL,
  restocked_above_min BOOLEAN DEFAULT TRUE,
  manager_email VARCHAR(180),
  admin_email VARCHAR(180),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_product_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  local_transaction_id VARCHAR(100) NOT NULL UNIQUE,
  product_id BIGINT NOT NULL,
  transaction_type VARCHAR(20) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_status VARCHAR(20) NOT NULL DEFAULT 'SYNCED',
  CONSTRAINT fk_transaction_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS stock_alerts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT NOT NULL,
  product_name VARCHAR(180) NOT NULL,
  sku VARCHAR(80),
  stock_at_alert INT NOT NULL DEFAULT 0,
  current_stock INT,
  minimum_stock_level INT NOT NULL,
  recommended_reorder_quantity INT DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  retry_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  alert_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP NULL,
  last_error VARCHAR(1000),
  next_retry_at TIMESTAMP NULL,
  recipient_email VARCHAR(180),
  is_critical BOOLEAN DEFAULT FALSE,
  message VARCHAR(1000)
);

CREATE TABLE IF NOT EXISTS alert_recipient_configs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(30) NOT NULL DEFAULT 'GLOBAL',
  target VARCHAR(100) NOT NULL DEFAULT 'DEFAULT',
  manager_email VARCHAR(180),
  admin_email VARCHAR(180),
  extra_emails VARCHAR(500),
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_transaction_date ON transactions(transaction_date);
CREATE INDEX idx_transaction_product ON transactions(product_id);
CREATE INDEX idx_alert_status ON stock_alerts(status);
CREATE INDEX idx_alert_date ON stock_alerts(alert_date);
CREATE INDEX idx_recipient_type_target ON alert_recipient_configs(type, target);

INSERT IGNORE INTO categories(name) VALUES ('Grocery'),('Personal Care'),('Beverages');
INSERT IGNORE INTO suppliers(name) VALUES ('ABC Traders'),('Fresh Supply Co'),('City Wholesale');

INSERT IGNORE INTO products
(barcode, product_name, category_id, supplier_id, purchase_price, selling_price, quantity, minimum_stock_level)
SELECT '8901234567890','Rice',1,1,900,1050,50,10
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode='8901234567890');

INSERT IGNORE INTO products
(barcode, product_name, category_id, supplier_id, purchase_price, selling_price, quantity, minimum_stock_level)
SELECT '8901234567891','Sugar',1,1,40,50,35,8
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode='8901234567891');

INSERT IGNORE INTO products
(barcode, product_name, category_id, supplier_id, purchase_price, selling_price, quantity, minimum_stock_level)
SELECT '8901234567892','Wheat',1,2,45,55,28,8
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode='8901234567892');

INSERT IGNORE INTO products
(barcode, product_name, category_id, supplier_id, purchase_price, selling_price, quantity, minimum_stock_level)
SELECT '8901234567893','Milk',3,2,35,42,12,5
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode='8901234567893');

INSERT IGNORE INTO products
(barcode, product_name, category_id, supplier_id, purchase_price, selling_price, quantity, minimum_stock_level)
SELECT '8901234567894','Oil',1,3,120,145,20,5
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode='8901234567894');

INSERT IGNORE INTO products
(barcode, product_name, category_id, supplier_id, purchase_price, selling_price, quantity, minimum_stock_level)
SELECT '8901234567895','Soap',2,3,25,32,40,10
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode='8901234567895');

INSERT IGNORE INTO products
(barcode, product_name, category_id, supplier_id, purchase_price, selling_price, quantity, minimum_stock_level)
SELECT '8901234567896','Shampoo',2,3,90,120,18,5
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode='8901234567896');

INSERT IGNORE INTO products
(barcode, product_name, category_id, supplier_id, purchase_price, selling_price, quantity, minimum_stock_level)
SELECT '8901234567897','Biscuits',1,2,20,28,45,10
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode='8901234567897');

INSERT IGNORE INTO products
(barcode, product_name, category_id, supplier_id, purchase_price, selling_price, quantity, minimum_stock_level)
SELECT '8901234567898','Coffee',3,1,180,220,15,5
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode='8901234567898');

INSERT IGNORE INTO products
(barcode, product_name, category_id, supplier_id, purchase_price, selling_price, quantity, minimum_stock_level)
SELECT '8901234567899','Tea',3,1,150,190,22,6
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode='8901234567899');
