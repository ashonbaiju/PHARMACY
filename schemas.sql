-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 23, 2026 at 08:51 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `pharma_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `medicines`
--

CREATE TABLE `medicines` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `stock_quantity` int(11) NOT NULL DEFAULT 0,
  `expiry_date` date NOT NULL,
  `image_path` varchar(255) DEFAULT 'assets/images/default-medicine.png',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `medicines`
--

INSERT INTO `medicines` (`id`, `name`, `description`, `price`, `stock_quantity`, `expiry_date`, `image_path`, `created_at`) VALUES
(1, 'Paracetamol 500mg', 'Effective relief from mild to moderate pain and fever.', 4.50, 150, '2027-06-30', 'assets/images/default-medicine.png', '2026-08-23 15:16:53'),
(2, 'Amoxicillin 250mg', 'Antibiotic used to treat a wide variety of bacterial infections.', 12.00, 80, '2026-12-15', 'assets/images/default-medicine.png', '2026-08-23 15:16:53'),
(3, 'Ibuprofen 400mg', 'Nonsteroidal anti-inflammatory drug (NSAID) for pain, fever, and inflammation.', 6.25, 12, '2026-09-01', 'assets/images/default-medicine.png', '2026-08-23 15:16:53'),
(4, 'Omeprazole 20mg', 'Reduces the amount of acid your stomach produces.', 15.80, 45, '2027-01-20', 'assets/images/default-medicine.png', '2026-08-23 15:16:53'),
(5, 'Cetirizine 10mg', 'Antihistamine that treats allergy symptoms such as sneezing and runny nose.', 5.00, 5, '2026-08-30', 'assets/images/default-medicine.png', '2026-08-23 15:16:53'),
(6, 'Metformin 500mg', 'Used with proper diet and exercise program to control high blood sugar in type 2 diabetes.', 9.50, 198, '2028-03-15', 'assets/images/default-medicine.png', '2026-08-23 15:16:53'),
(7, 'Vitamin C 1000mg', 'Immune support supplement with antioxidants.', 8.00, 95, '2027-11-10', 'assets/images/default-medicine.png', '2026-08-23 15:16:53'),
(8, 'test1', 'testtttttttttttttttttt', 10.00, 999, '2030-07-11', 'uploads/medicines/1787506970_e222be81db717903895b73a50828beaa.png', '2026-08-23 17:42:50');

-- --------------------------------------------------------

--
-- Table structure for table `sales`
--

CREATE TABLE `sales` (
  `id` int(11) NOT NULL,
  `customer_name` varchar(100) NOT NULL,
  `customer_phone` varchar(20) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `sale_date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sales`
--

INSERT INTO `sales` (`id`, `customer_name`, `customer_phone`, `total_amount`, `sale_date`) VALUES
(1, 'test', '2142335', 19.50, '2026-08-23 17:59:33'),
(2, 'asd', 'asda', 9.50, '2026-08-23 18:09:29');

-- --------------------------------------------------------

--
-- Table structure for table `sale_items`
--

CREATE TABLE `sale_items` (
  `id` int(11) NOT NULL,
  `sale_id` int(11) NOT NULL,
  `medicine_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price_at_time` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sale_items`
--

INSERT INTO `sale_items` (`id`, `sale_id`, `medicine_id`, `quantity`, `price_at_time`) VALUES
(1, 1, 8, 1, 10.00),
(2, 1, 6, 1, 9.50),
(3, 2, 6, 1, 9.50);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password_hash`, `created_at`) VALUES
(1, 'admin', '$2y$10$lSRVkDfS2N6ra.LeGGcG1.K2ktTpla/MwMzpBSRoTCemd4aAQOih2', '2026-08-23 15:16:53');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `medicines`
--
ALTER TABLE `medicines`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sales`
--
ALTER TABLE `sales`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sale_items`
--
ALTER TABLE `sale_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sale_id` (`sale_id`),
  ADD KEY `medicine_id` (`medicine_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `medicines`
--
ALTER TABLE `medicines`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `sales`
--
ALTER TABLE `sales`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `sale_items`
--
ALTER TABLE `sale_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `sale_items`
--
ALTER TABLE `sale_items`
  ADD CONSTRAINT `sale_items_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `sale_items_ibfk_2` FOREIGN KEY (`medicine_id`) REFERENCES `medicines` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
