-- =============================================================
-- 04-demo-data.sql
-- Demo dataset for hackathon presentation
--
-- Structure:
--   1 company
--   3 departments   (Engineering, Sales, Operations)
--   10 employees + 1 admin
--   ~70 rides       (60% EV, 40% petrol, spread across 30 days)
--   2 reward redemptions
--   2 prediction_logs
--   2 recommendation_logs
-- =============================================================


-- =============================================================
-- COMPANY
-- =============================================================
INSERT INTO companies (id, name, target_monthly_emission_kg, target_weekly_emission_kg)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'GreenCorp Vietnam',
  15000.000,
  3500.000
);


-- =============================================================
-- DEPARTMENTS
-- =============================================================
INSERT INTO departments (id, company_id, name)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Engineering'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Sales'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Operations');


-- =============================================================
-- USERS  (10 employees + 1 admin)
-- password_hash = bcrypt('password123') placeholder
-- =============================================================
INSERT INTO users (id, company_id, department_id, name, email, password_hash, role, green_points, green_score)
VALUES
-- Engineering (3 employees)
(
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Nguyen Minh Tam',     'tam@greencorp.vn',     'mock_hash', 'EMPLOYEE', 2450, 245
),
(
  '20000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Tran Thi Lan',        'lan@greencorp.vn',     'mock_hash', 'EMPLOYEE', 1870, 187
),
(
  '20000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Le Van Duc',          'duc@greencorp.vn',     'mock_hash', 'EMPLOYEE',  980,  98
),
-- Sales (4 employees — more trips, higher emissions per design)
(
  '20000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Pham Thi Hong',       'hong@greencorp.vn',    'mock_hash', 'EMPLOYEE',  620,  62
),
(
  '20000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Vo Quoc Bao',         'bao@greencorp.vn',     'mock_hash', 'EMPLOYEE',  430,  43
),
(
  '20000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Dang Thi My Linh',    'linh@greencorp.vn',    'mock_hash', 'EMPLOYEE',  310,  31
),
(
  '20000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Nguyen Hoang Nam',    'nam@greencorp.vn',     'mock_hash', 'EMPLOYEE',  150,  15
),
-- Operations (3 employees)
(
  '20000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'Bui Thi Thu',         'thu@greencorp.vn',     'mock_hash', 'EMPLOYEE', 1100, 110
),
(
  '20000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'Hoang Van Khanh',     'khanh@greencorp.vn',   'mock_hash', 'EMPLOYEE',  760,  76
),
(
  '20000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'Do Thi Phuong',       'phuong@greencorp.vn',  'mock_hash', 'EMPLOYEE',  540,  54
),
-- Admin
(
  '20000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000001',
  NULL,
  'Company Admin',       'admin@greencorp.vn',   'mock_hash', 'COMPANY_ADMIN', 0, 0
);


-- =============================================================
-- RIDES
-- ~70 rides over the past 30 days
-- 60% EV  /  40% petrol
-- Sales: most rides, higher emissions
-- Engineering & Operations: moderate
--
-- Calculation reference (Section 4):
--   baseline_co2_kg  = distance * baseline.co2_kg_per_km
--   actual_co2_kg    = distance * selected.co2_kg_per_km
--   co2_saved_kg     = max(0, baseline - actual)
--   fuel_saved_liters= distance * baseline.energy_usage_value / 100  (EV only)
--   tree_equivalent  = co2_saved_kg / 21.77
--   green_score_added= round(co2_saved_kg * 10)
--   green_points_added= round(co2_saved_kg * 100)
-- =============================================================

INSERT INTO rides (
  id, user_id, company_id, department_id,
  origin_name, destination_name,
  distance_km,
  vehicle_profile_id, baseline_profile_id,
  purpose, status,
  estimated_duration_minutes, actual_duration_minutes,
  price_vnd, actual_price_vnd,
  baseline_co2_kg, actual_co2_kg, co2_saved_kg,
  fuel_saved_liters, tree_equivalent,
  green_score_added, green_points_added,
  created_at, completed_at
)
VALUES

-- ─────────────────────────────────────────────
-- ENGINEERING — Nguyen Minh Tam (EV-heavy)
-- ─────────────────────────────────────────────
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Quan 7', 'Quan 1 - Van Phong',
  12.500,
  'MOTORBIKE_ELECTRIC', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 30, 28,
  45000, 45000,
  0.625, 0.300, 0.325,
  0.265, 0.015,
  3, 33,
  now() - INTERVAL '1 day', now() - INTERVAL '1 day' + INTERVAL '28 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Quan 7', 'Quan 1 - Van Phong',
  12.500,
  'MOTORBIKE_ELECTRIC', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 30, 31,
  45000, 45000,
  0.625, 0.300, 0.325,
  0.265, 0.015,
  3, 33,
  now() - INTERVAL '2 days', now() - INTERVAL '2 days' + INTERVAL '31 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Quan 7', 'Quan 1 - Van Phong',
  12.500,
  'MOTORBIKE_ELECTRIC', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 30, 27,
  45000, 45000,
  0.625, 0.300, 0.325,
  0.265, 0.015,
  3, 33,
  now() - INTERVAL '3 days', now() - INTERVAL '3 days' + INTERVAL '27 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Van Phong', 'Khach Hang - Binh Thanh',
  8.200,
  'MOTORBIKE_ELECTRIC', 'MOTORBIKE_PETRO',
  'BUSINESS', 'COMPLETED', 20, 22,
  30000, 30000,
  0.410, 0.197, 0.213,
  0.174, 0.010,
  2, 21,
  now() - INTERVAL '5 days', now() - INTERVAL '5 days' + INTERVAL '22 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Nha Rieng - Quan 7', 'Quan 1 - Van Phong',
  12.500,
  'MOTORBIKE_PETRO', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 30, 35,
  0, 0,
  0.625, 0.625, 0.000,
  0.000, 0.000,
  0, 0,
  now() - INTERVAL '8 days', now() - INTERVAL '8 days' + INTERVAL '35 minutes'
),

-- ─────────────────────────────────────────────
-- ENGINEERING — Tran Thi Lan
-- ─────────────────────────────────────────────
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Binh Thanh', 'Quan 1 - Van Phong',
  5.800,
  'MOTORBIKE_ELECTRIC', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 15, 17,
  22000, 22000,
  0.290, 0.139, 0.151,
  0.123, 0.007,
  2, 15,
  now() - INTERVAL '1 day', now() - INTERVAL '1 day' + INTERVAL '17 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Binh Thanh', 'Quan 1 - Van Phong',
  5.800,
  'MOTORBIKE_ELECTRIC', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 15, 16,
  22000, 22000,
  0.290, 0.139, 0.151,
  0.123, 0.007,
  2, 15,
  now() - INTERVAL '3 days', now() - INTERVAL '3 days' + INTERVAL '16 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Binh Thanh', 'Quan 1 - Van Phong',
  5.800,
  'CAR_4_PETRO', 'CAR_4_PETRO',
  'COMMUTE', 'COMPLETED', 18, 20,
  85000, 85000,
  0.812, 0.812, 0.000,
  0.000, 0.000,
  0, 0,
  now() - INTERVAL '6 days', now() - INTERVAL '6 days' + INTERVAL '20 minutes'
),

-- ─────────────────────────────────────────────
-- ENGINEERING — Le Van Duc
-- ─────────────────────────────────────────────
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Thu Duc', 'Quan 1 - Van Phong',
  18.000,
  'CAR_4_ELECTRIC', 'CAR_4_PETRO',
  'COMMUTE', 'COMPLETED', 45, 50,
  120000, 120000,
  2.520, 1.512, 1.008,
  1.125, 0.046,
  10, 101,
  now() - INTERVAL '2 days', now() - INTERVAL '2 days' + INTERVAL '50 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Thu Duc', 'Quan 1 - Van Phong',
  18.000,
  'CAR_4_PETRO', 'CAR_4_PETRO',
  'COMMUTE', 'COMPLETED', 45, 48,
  120000, 120000,
  2.520, 2.520, 0.000,
  0.000, 0.000,
  0, 0,
  now() - INTERVAL '7 days', now() - INTERVAL '7 days' + INTERVAL '48 minutes'
),

-- ─────────────────────────────────────────────
-- SALES — Pham Thi Hong (many trips, some petrol)
-- ─────────────────────────────────────────────
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Quan 10', 'Khach Hang - Quan 12',
  15.000,
  'MOTORBIKE_PETRO', 'MOTORBIKE_PETRO',
  'BUSINESS', 'COMPLETED', 35, 38,
  55000, 55000,
  0.750, 0.750, 0.000,
  0.000, 0.000,
  0, 0,
  now() - INTERVAL '1 day', now() - INTERVAL '1 day' + INTERVAL '38 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Quan 10', 'Khach Hang - Binh Duong',
  28.000,
  'CAR_4_PETRO', 'CAR_4_PETRO',
  'BUSINESS', 'COMPLETED', 60, 65,
  200000, 200000,
  3.920, 3.920, 0.000,
  0.000, 0.000,
  0, 0,
  now() - INTERVAL '3 days', now() - INTERVAL '3 days' + INTERVAL '65 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Quan 10', 'Khach Hang - Thu Duc',
  20.000,
  'MOTORBIKE_ELECTRIC', 'MOTORBIKE_PETRO',
  'BUSINESS', 'COMPLETED', 45, 42,
  70000, 70000,
  1.000, 0.480, 0.520,
  0.424, 0.024,
  5, 52,
  now() - INTERVAL '5 days', now() - INTERVAL '5 days' + INTERVAL '42 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Quan 10', 'Quan 1 - Van Phong',
  9.000,
  'MOTORBIKE_PETRO', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 25, 27,
  35000, 35000,
  0.450, 0.450, 0.000,
  0.000, 0.000,
  0, 0,
  now() - INTERVAL '6 days', now() - INTERVAL '6 days' + INTERVAL '27 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Quan 10', 'Khach Hang - Long An',
  50.000,
  'SUV_7_PETRO', 'SUV_7_PETRO',
  'BUSINESS', 'COMPLETED', 90, 95,
  500000, 500000,
  11.000, 11.000, 0.000,
  0.000, 0.000,
  0, 0,
  now() - INTERVAL '10 days', now() - INTERVAL '10 days' + INTERVAL '95 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Quan 10', 'Khach Hang - Dong Nai',
  60.000,
  'SUV_7_ELECTRIC', 'SUV_7_PETRO',
  'BUSINESS', 'COMPLETED', 90, 88,
  480000, 480000,
  13.200, 7.620, 5.580,
  5.616, 0.256,
  56, 558,
  now() - INTERVAL '12 days', now() - INTERVAL '12 days' + INTERVAL '88 minutes'
),

-- ─────────────────────────────────────────────
-- SALES — Vo Quoc Bao
-- ─────────────────────────────────────────────
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Phu Nhuan', 'Khach Hang - Quan 9',
  22.000,
  'MOTORBIKE_PETRO', 'MOTORBIKE_PETRO',
  'BUSINESS', 'COMPLETED', 50, 52,
  80000, 80000,
  1.100, 1.100, 0.000,
  0.000, 0.000,
  0, 0,
  now() - INTERVAL '2 days', now() - INTERVAL '2 days' + INTERVAL '52 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Phu Nhuan', 'Van Phong',
  6.000,
  'MOTORBIKE_ELECTRIC', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 15, 14,
  22000, 22000,
  0.300, 0.144, 0.156,
  0.127, 0.007,
  2, 16,
  now() - INTERVAL '4 days', now() - INTERVAL '4 days' + INTERVAL '14 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Phu Nhuan', 'Khach Hang - Binh Chanh',
  35.000,
  'CAR_4_PETRO', 'CAR_4_PETRO',
  'BUSINESS', 'COMPLETED', 70, 75,
  280000, 280000,
  4.900, 4.900, 0.000,
  0.000, 0.000,
  0, 0,
  now() - INTERVAL '9 days', now() - INTERVAL '9 days' + INTERVAL '75 minutes'
),

-- ─────────────────────────────────────────────
-- SALES — Dang Thi My Linh
-- ─────────────────────────────────────────────
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Go Vap', 'Van Phong',
  10.000,
  'MOTORBIKE_ELECTRIC', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 25, 27,
  36000, 36000,
  0.500, 0.240, 0.260,
  0.212, 0.012,
  3, 26,
  now() - INTERVAL '1 day', now() - INTERVAL '1 day' + INTERVAL '27 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Go Vap', 'Khach Hang - Quan 3',
  12.000,
  'MOTORBIKE_PETRO', 'MOTORBIKE_PETRO',
  'BUSINESS', 'COMPLETED', 28, 30,
  45000, 45000,
  0.600, 0.600, 0.000,
  0.000, 0.000,
  0, 0,
  now() - INTERVAL '4 days', now() - INTERVAL '4 days' + INTERVAL '30 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Go Vap', 'Van Phong',
  10.000,
  'MOTORBIKE_ELECTRIC', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 25, 24,
  36000, 36000,
  0.500, 0.240, 0.260,
  0.212, 0.012,
  3, 26,
  now() - INTERVAL '8 days', now() - INTERVAL '8 days' + INTERVAL '24 minutes'
),

-- ─────────────────────────────────────────────
-- SALES — Nguyen Hoang Nam
-- ─────────────────────────────────────────────
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Tan Binh', 'Van Phong',
  7.500,
  'MOTORBIKE_PETRO', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 20, 22,
  28000, 28000,
  0.375, 0.375, 0.000,
  0.000, 0.000,
  0, 0,
  now() - INTERVAL '2 days', now() - INTERVAL '2 days' + INTERVAL '22 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Tan Binh', 'Van Phong',
  7.500,
  'MOTORBIKE_ELECTRIC', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 20, 19,
  28000, 28000,
  0.375, 0.180, 0.195,
  0.159, 0.009,
  2, 20,
  now() - INTERVAL '5 days', now() - INTERVAL '5 days' + INTERVAL '19 minutes'
),

-- ─────────────────────────────────────────────
-- OPERATIONS — Bui Thi Thu
-- ─────────────────────────────────────────────
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'Binh Tan', 'Kho Hang - Binh Duong',
  30.000,
  'SUV_7_ELECTRIC', 'SUV_7_PETRO',
  'BUSINESS', 'COMPLETED', 55, 58,
  240000, 240000,
  6.600, 3.810, 2.790,
  2.808, 0.128,
  28, 279,
  now() - INTERVAL '1 day', now() - INTERVAL '1 day' + INTERVAL '58 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'Binh Tan', 'Kho Hang - Long An',
  45.000,
  'SUV_7_PETRO', 'SUV_7_PETRO',
  'BUSINESS', 'COMPLETED', 80, 85,
  380000, 380000,
  9.900, 9.900, 0.000,
  0.000, 0.000,
  0, 0,
  now() - INTERVAL '4 days', now() - INTERVAL '4 days' + INTERVAL '85 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'Binh Tan', 'Kho Hang - Binh Duong',
  30.000,
  'SUV_7_ELECTRIC', 'SUV_7_PETRO',
  'BUSINESS', 'COMPLETED', 55, 55,
  240000, 240000,
  6.600, 3.810, 2.790,
  2.808, 0.128,
  28, 279,
  now() - INTERVAL '7 days', now() - INTERVAL '7 days' + INTERVAL '55 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'Binh Tan', 'Van Phong',
  8.000,
  'MOTORBIKE_ELECTRIC', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 20, 21,
  30000, 30000,
  0.400, 0.192, 0.208,
  0.169, 0.010,
  2, 21,
  now() - INTERVAL '10 days', now() - INTERVAL '10 days' + INTERVAL '21 minutes'
),

-- ─────────────────────────────────────────────
-- OPERATIONS — Hoang Van Khanh
-- ─────────────────────────────────────────────
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'Quan 8', 'Kho Hang - Binh Chanh',
  20.000,
  'CAR_4_ELECTRIC', 'CAR_4_PETRO',
  'BUSINESS', 'COMPLETED', 40, 43,
  160000, 160000,
  2.800, 1.680, 1.120,
  1.250, 0.051,
  11, 112,
  now() - INTERVAL '2 days', now() - INTERVAL '2 days' + INTERVAL '43 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'Quan 8', 'Van Phong',
  11.000,
  'MOTORBIKE_PETRO', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 28, 30,
  40000, 40000,
  0.550, 0.550, 0.000,
  0.000, 0.000,
  0, 0,
  now() - INTERVAL '6 days', now() - INTERVAL '6 days' + INTERVAL '30 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'Quan 8', 'Kho Hang - Thu Duc',
  25.000,
  'CAR_4_ELECTRIC', 'CAR_4_PETRO',
  'BUSINESS', 'COMPLETED', 50, 52,
  200000, 200000,
  3.500, 2.100, 1.400,
  1.563, 0.064,
  14, 140,
  now() - INTERVAL '11 days', now() - INTERVAL '11 days' + INTERVAL '52 minutes'
),

-- ─────────────────────────────────────────────
-- OPERATIONS — Do Thi Phuong
-- ─────────────────────────────────────────────
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'Nha Be', 'Van Phong - Quan 1',
  14.000,
  'MOTORBIKE_ELECTRIC', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 32, 34,
  50000, 50000,
  0.700, 0.336, 0.364,
  0.297, 0.017,
  4, 36,
  now() - INTERVAL '1 day', now() - INTERVAL '1 day' + INTERVAL '34 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'Nha Be', 'Van Phong - Quan 1',
  14.000,
  'MOTORBIKE_PETRO', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 32, 35,
  50000, 50000,
  0.700, 0.700, 0.000,
  0.000, 0.000,
  0, 0,
  now() - INTERVAL '5 days', now() - INTERVAL '5 days' + INTERVAL '35 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'Nha Be', 'Van Phong - Quan 1',
  14.000,
  'MOTORBIKE_ELECTRIC', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 32, 33,
  50000, 50000,
  0.700, 0.336, 0.364,
  0.297, 0.017,
  4, 36,
  now() - INTERVAL '9 days', now() - INTERVAL '9 days' + INTERVAL '33 minutes'
),

-- ─────────────────────────────────────────────
-- Extra rides — spread older (days 13–28) for time-series charts
-- Mix of users and vehicle types
-- ─────────────────────────────────────────────
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Quan 7', 'Quan 1',
  12.500, 'MOTORBIKE_ELECTRIC', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 30, 29, 45000, 45000,
  0.625, 0.300, 0.325, 0.265, 0.015, 3, 33,
  now() - INTERVAL '13 days', now() - INTERVAL '13 days' + INTERVAL '29 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Quan 10', 'Long An',
  50.000, 'SUV_7_PETRO', 'SUV_7_PETRO',
  'BUSINESS', 'COMPLETED', 90, 93, 500000, 500000,
  11.000, 11.000, 0.000, 0.000, 0.000, 0, 0,
  now() - INTERVAL '14 days', now() - INTERVAL '14 days' + INTERVAL '93 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'Binh Tan', 'Binh Duong',
  30.000, 'SUV_7_ELECTRIC', 'SUV_7_PETRO',
  'BUSINESS', 'COMPLETED', 55, 56, 240000, 240000,
  6.600, 3.810, 2.790, 2.808, 0.128, 28, 279,
  now() - INTERVAL '15 days', now() - INTERVAL '15 days' + INTERVAL '56 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Binh Thanh', 'Quan 1',
  5.800, 'MOTORBIKE_ELECTRIC', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 15, 15, 22000, 22000,
  0.290, 0.139, 0.151, 0.123, 0.007, 2, 15,
  now() - INTERVAL '16 days', now() - INTERVAL '16 days' + INTERVAL '15 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Phu Nhuan', 'Binh Chanh',
  35.000, 'CAR_4_PETRO', 'CAR_4_PETRO',
  'BUSINESS', 'COMPLETED', 70, 72, 280000, 280000,
  4.900, 4.900, 0.000, 0.000, 0.000, 0, 0,
  now() - INTERVAL '17 days', now() - INTERVAL '17 days' + INTERVAL '72 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'Quan 8', 'Thu Duc',
  25.000, 'CAR_4_ELECTRIC', 'CAR_4_PETRO',
  'BUSINESS', 'COMPLETED', 50, 54, 200000, 200000,
  3.500, 2.100, 1.400, 1.563, 0.064, 14, 140,
  now() - INTERVAL '18 days', now() - INTERVAL '18 days' + INTERVAL '54 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Thu Duc', 'Quan 1',
  18.000, 'CAR_4_ELECTRIC', 'CAR_4_PETRO',
  'COMMUTE', 'COMPLETED', 45, 46, 120000, 120000,
  2.520, 1.512, 1.008, 1.125, 0.046, 10, 101,
  now() - INTERVAL '19 days', now() - INTERVAL '19 days' + INTERVAL '46 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Go Vap', 'Quan 3',
  12.000, 'MOTORBIKE_PETRO', 'MOTORBIKE_PETRO',
  'BUSINESS', 'COMPLETED', 28, 29, 45000, 45000,
  0.600, 0.600, 0.000, 0.000, 0.000, 0, 0,
  now() - INTERVAL '20 days', now() - INTERVAL '20 days' + INTERVAL '29 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'Nha Be', 'Quan 1',
  14.000, 'MOTORBIKE_ELECTRIC', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 32, 34, 50000, 50000,
  0.700, 0.336, 0.364, 0.297, 0.017, 4, 36,
  now() - INTERVAL '21 days', now() - INTERVAL '21 days' + INTERVAL '34 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Tan Binh', 'Van Phong',
  7.500, 'MOTORBIKE_ELECTRIC', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 20, 20, 28000, 28000,
  0.375, 0.180, 0.195, 0.159, 0.009, 2, 20,
  now() - INTERVAL '22 days', now() - INTERVAL '22 days' + INTERVAL '20 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Quan 7', 'Khach Hang - Binh Thanh',
  8.200, 'MOTORBIKE_ELECTRIC', 'MOTORBIKE_PETRO',
  'BUSINESS', 'COMPLETED', 20, 22, 30000, 30000,
  0.410, 0.197, 0.213, 0.174, 0.010, 2, 21,
  now() - INTERVAL '24 days', now() - INTERVAL '24 days' + INTERVAL '22 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Quan 10', 'Dong Nai',
  60.000, 'SUV_7_ELECTRIC', 'SUV_7_PETRO',
  'BUSINESS', 'COMPLETED', 90, 92, 480000, 480000,
  13.200, 7.620, 5.580, 5.616, 0.256, 56, 558,
  now() - INTERVAL '25 days', now() - INTERVAL '25 days' + INTERVAL '92 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'Binh Tan', 'Van Phong',
  8.000, 'MOTORBIKE_ELECTRIC', 'MOTORBIKE_PETRO',
  'COMMUTE', 'COMPLETED', 20, 22, 30000, 30000,
  0.400, 0.192, 0.208, 0.169, 0.010, 2, 21,
  now() - INTERVAL '27 days', now() - INTERVAL '27 days' + INTERVAL '22 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Binh Thanh', 'Van Phong',
  5.800, 'CAR_4_PETRO', 'CAR_4_PETRO',
  'COMMUTE', 'COMPLETED', 18, 19, 85000, 85000,
  0.812, 0.812, 0.000, 0.000, 0.000, 0, 0,
  now() - INTERVAL '28 days', now() - INTERVAL '28 days' + INTERVAL '19 minutes'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'Quan 8', 'Binh Chanh',
  20.000, 'CAR_4_ELECTRIC', 'CAR_4_PETRO',
  'BUSINESS', 'COMPLETED', 40, 42, 160000, 160000,
  2.800, 1.680, 1.120, 1.250, 0.051, 11, 112,
  now() - INTERVAL '29 days', now() - INTERVAL '29 days' + INTERVAL '42 minutes'
);


-- =============================================================
-- REWARD REDEMPTIONS
-- =============================================================
INSERT INTO reward_redemptions (id, user_id, reward_id, green_points_spent, voucher_code, created_at)
VALUES
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  1000,
  'DEMO-GCV-001',
  now() - INTERVAL '5 days'
),
(
  gen_random_uuid(),
  '20000000-0000-0000-0000-000000000008',
  '30000000-0000-0000-0000-000000000002',
  2000,
  NULL,
  now() - INTERVAL '3 days'
);

-- Deduct points from users (already spent)
UPDATE users SET green_points = green_points - 1000
WHERE id = '20000000-0000-0000-0000-000000000001';

UPDATE users SET green_points = green_points - 2000
WHERE id = '20000000-0000-0000-0000-000000000008';


-- =============================================================
-- PREDICTION LOGS  (2 samples — company scope & employee scope)
-- =============================================================
INSERT INTO prediction_logs (
  id, company_id, user_id, department_id, scope,
  period_from, period_to,
  predicted_period_from, predicted_period_to,
  current_emission_kg, predicted_emission_kg,
  current_saved_kg, predicted_saved_kg,
  predicted_ev_rate, confidence,
  model_id, model_type
)
VALUES
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  NULL, NULL,
  'COMPANY',
  CURRENT_DATE - 30, CURRENT_DATE - 1,
  CURRENT_DATE, CURRENT_DATE + 29,
  112.450, 89.200,
  28.330, 42.500,
  72.50,
  82.00,
  'linear_trend_v1', 'LINEAR_REGRESSION'
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'EMPLOYEE',
  CURRENT_DATE - 30, CURRENT_DATE - 1,
  CURRENT_DATE, CURRENT_DATE + 29,
  2.910, 1.950,
  1.387, 2.300,
  80.00,
  78.50,
  'linear_trend_v1', 'LINEAR_REGRESSION'
);


-- =============================================================
-- RECOMMENDATION LOGS  (2 samples — employee & company scope)
-- =============================================================
INSERT INTO recommendation_logs (
  id, company_id, user_id, department_id, scope,
  period_from, period_to,
  input_summary, output_json,
  provider, model
)
VALUES
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'EMPLOYEE',
  CURRENT_DATE - 30, CURRENT_DATE - 1,
  '{
    "total_trips": 5,
    "ev_trips": 4,
    "petrol_trips": 1,
    "total_distance_km": 53.7,
    "actual_co2_kg": 1.524,
    "co2_saved_kg": 1.386,
    "ev_rate_pct": 80
  }',
  '{
    "summary": "Bạn đã sử dụng xe điện cho 80% chuyến đi. Chuyến đi bằng xăng còn lại tạo ra phần lớn lượng khí thải có thể tránh được.",
    "recommendations": [
      {
        "title": "Chuyển 1 chuyến xe máy xăng sang xe điện tuần tới",
        "reason": "Giảm trực tiếp lượng khí thải 0.325 kg CO2.",
        "estimatedCo2ReductionKg": 0.325
      },
      {
        "title": "Duy trì thói quen đi xe điện hàng ngày",
        "reason": "Bạn đang trong top 20% nhân viên xanh nhất công ty.",
        "estimatedCo2ReductionKg": 0
      }
    ],
    "nextBestAction": "Chọn xe máy điện cho chuyến đi làm tiếp theo để đạt mốc 1000 điểm xanh."
  }',
  'MOCK',
  'mock-v1'
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  NULL, NULL,
  'COMPANY',
  CURRENT_DATE - 30, CURRENT_DATE - 1,
  '{
    "total_trips": 42,
    "ev_trips": 26,
    "petrol_trips": 16,
    "total_distance_km": 714.5,
    "actual_co2_kg": 112.45,
    "co2_saved_kg": 28.33,
    "ev_rate_pct": 62
  }',
  '{
    "summary": "Công ty đang trên đà đạt mục tiêu phát thải tháng. Phòng Sales tạo ra 55% lượng khí thải nhưng chỉ có 40% chuyến đi điện.",
    "recommendations": [
      {
        "title": "Khuyến khích Sales tăng tỷ lệ xe điện lên 60%",
        "reason": "Chỉ cần 3 chuyến xe điện thêm mỗi tuần sẽ giảm 4.5 kg CO2/tháng.",
        "estimatedCo2ReductionKg": 4.5
      },
      {
        "title": "Triển khai chương trình thưởng điểm xanh gấp đôi cho Sales",
        "reason": "Tăng động lực chọn phương tiện xanh cho nhóm có nhiều chuyến công tác nhất.",
        "estimatedCo2ReductionKg": 0
      }
    ],
    "nextBestAction": "Gửi thông báo cho Sales về điểm xanh gấp đôi trong tuần tới."
  }',
  'MOCK',
  'mock-v1'
);