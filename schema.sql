-- Database creation
CREATE DATABASE IF NOT EXISTS `pharma_db`;
USE `pharma_db`;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default Admin User (Username: admin, Password: admin123)
INSERT INTO `users` (`username`, `password`) 
VALUES ('admin', 'admin123')
ON DUPLICATE KEY UPDATE `password` = 'admin123';

-- Medicines table
CREATE TABLE IF NOT EXISTS `medicines` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `stock_quantity` INT NOT NULL DEFAULT 0,
    `expiry_date` DATE NOT NULL,
    `image_path` VARCHAR(255) DEFAULT 'default-medicine.svg',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales table
CREATE TABLE IF NOT EXISTS `sales` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `customer_name` VARCHAR(100) NOT NULL,
    `customer_phone` VARCHAR(20) NOT NULL,
    `total_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `sale_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sale items table
CREATE TABLE IF NOT EXISTS `sale_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sale_id` INT NOT NULL,
    `medicine_id` INT NOT NULL,
    `quantity` INT NOT NULL,
    `price_at_time` DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`medicine_id`) REFERENCES `medicines`(`id`) ON DELETE CASCADE
);

-- Seed Sample Medicines
INSERT INTO `medicines` (`name`, `description`, `price`, `stock_quantity`, `expiry_date`, `image_path`) VALUES
('Paracetamol 500mg', 'Effective relief from mild to moderate pain and fever.', 4.50, 150, '2027-06-30', 'default-medicine.svg'),
('Amoxicillin 250mg', 'Antibiotic used to treat a wide variety of bacterial infections.', 12.00, 80, '2026-12-15', 'default-medicine.svg'),
('Ibuprofen 400mg', 'Nonsteroidal anti-inflammatory drug (NSAID) for pain, fever, and inflammation.', 6.25, 12, '2026-09-01', 'default-medicine.svg'),
('Omeprazole 20mg', 'Reduces the amount of acid your stomach produces.', 15.80, 45, '2027-01-20', 'default-medicine.svg'),
('Cetirizine 10mg', 'Antihistamine that treats allergy symptoms such as sneezing and runny nose.', 5.00, 5, '2026-08-30', 'default-medicine.svg'),
('Metformin 500mg', 'Used with proper diet and exercise program to control high blood sugar in type 2 diabetes.', 9.50, 200, '2028-03-15', 'default-medicine.svg'),
('Vitamin C 1000mg', 'Immune support supplement with antioxidants.', 8.00, 95, '2027-11-10', 'default-medicine.svg');
