-- FuelPool demo seed data
-- Passwords are bcrypt of "password123"
-- Run after schema is created (ddl-auto=update creates tables on first boot)

INSERT IGNORE INTO users (email, password, name, gender, student_id, is_verified, is_driver, driver_rating, passenger_rating)
VALUES
  ('ahmad@utm.my',   '$2a$10$7EqJtq98hPqEX7fNZaFWoOa.sJ5Y7hN2nU0ZbP3qJvK2N3kL5XmZm', 'Ahmad Razif',    'MALE',   'A22EC0001', TRUE,  TRUE,  4.80, 5.00),
  ('nurul@utm.my',   '$2a$10$7EqJtq98hPqEX7fNZaFWoOa.sJ5Y7hN2nU0ZbP3qJvK2N3kL5XmZm', 'Nurul Ain',      'FEMALE', 'A22EC0002', TRUE,  FALSE, 5.00, 4.90),
  ('haziq@utm.my',   '$2a$10$7EqJtq98hPqEX7fNZaFWoOa.sJ5Y7hN2nU0ZbP3qJvK2N3kL5XmZm', 'Haziq Faris',    'MALE',   'A22EC0003', TRUE,  TRUE,  4.60, 4.70),
  ('siti@utm.my',    '$2a$10$7EqJtq98hPqEX7fNZaFWoOa.sJ5Y7hN2nU0ZbP3qJvK2N3kL5XmZm', 'Siti Nabilah',   'FEMALE', 'A22EC0004', TRUE,  FALSE, 5.00, 4.80),
  ('luqman@utm.my',  '$2a$10$7EqJtq98hPqEX7fNZaFWoOa.sJ5Y7hN2nU0ZbP3qJvK2N3kL5XmZm', 'Luqman Hakim',   'MALE',   'A22EC0005', TRUE,  TRUE,  4.90, 5.00);

-- Vehicles (insert after users)
INSERT IGNORE INTO vehicles (user_id, make, model, year, color, plate_number, tank_capacity, avg_efficiency, fuel_type, current_odometer, is_primary)
SELECT u.id, 'Perodua', 'Myvi',  2022, 'Silver', 'JKK1234', 40.00, 16.00, 'RON95_BUDI95', 45230, TRUE  FROM users u WHERE u.email = 'ahmad@utm.my';

INSERT IGNORE INTO vehicles (user_id, make, model, year, color, plate_number, tank_capacity, avg_efficiency, fuel_type, current_odometer, is_primary)
SELECT u.id, 'Perodua', 'Axia',  2023, 'White',  'JKL5678', 35.00, 17.00, 'RON95_MARKET', 12400, TRUE  FROM users u WHERE u.email = 'nurul@utm.my';

INSERT IGNORE INTO vehicles (user_id, make, model, year, color, plate_number, tank_capacity, avg_efficiency, fuel_type, current_odometer, is_primary)
SELECT u.id, 'Proton',  'Saga',  2021, 'Blue',   'JKM9101', 40.00, 15.00, 'RON95_BUDI95', 33000, TRUE  FROM users u WHERE u.email = 'haziq@utm.my';

INSERT IGNORE INTO vehicles (user_id, make, model, year, color, plate_number, tank_capacity, avg_efficiency, fuel_type, current_odometer, is_primary)
SELECT u.id, 'Honda',   'City',  2021, 'Black',  'JKN1122', 47.00, 14.00, 'RON97',         28500, TRUE  FROM users u WHERE u.email = 'luqman@utm.my';
