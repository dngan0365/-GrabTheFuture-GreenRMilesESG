-- =============================================================
-- 03-seed.sql
-- Fixed / immutable reference data
--   - vehicle_profiles  (carbon constants)
--   - rewards           (catalog)
-- =============================================================


-- -------------------------------------------------------------
-- vehicle_profiles
-- Insert petrol baselines first (no self-ref issue),
-- then electric profiles that reference them.
-- Finally, update petrol rows so baseline_profile_id = id (self-ref).
-- -------------------------------------------------------------
INSERT INTO vehicle_profiles (
  id,
  display_name,
  vehicle_class,
  powertrain,
  energy_usage_value,
  energy_usage_unit,
  co2_kg_per_km,
  baseline_profile_id,
  source_note
)
VALUES
-- ── Petrol baselines (baseline_profile_id set to NULL initially) ──────────
(
  'MOTORBIKE_PETRO',
  'Petrol Motorbike',
  'MOTORBIKE', 'PETRO',
  2.12, 'L_PER_100KM',
  0.050000,
  NULL,
  'Average petrol motorbike factor from vehicle fuel usage and Bộ TNMT QĐ 2626.'
),
(
  'CAR_4_PETRO',
  'Petrol 4-seat Car',
  'CAR_4', 'PETRO',
  6.25, 'L_PER_100KM',
  0.140000,
  NULL,
  'Average petrol 4-seat car factor from vehicle fuel usage and Bộ TNMT QĐ 2626.'
),
(
  'SUV_7_PETRO',
  'Petrol 7-seat / SUV',
  'SUV_7', 'PETRO',
  9.36, 'L_PER_100KM',
  0.220000,
  NULL,
  'Average SUV petrol factor from vehicle fuel usage and Bộ TNMT QĐ 2626.'
),

-- ── Electric profiles (reference their petrol baseline) ───────────────────
(
  'MOTORBIKE_ELECTRIC',
  'Electric Motorbike',
  'MOTORBIKE', 'ELECTRIC',
  36.5, 'WH_PER_KM',
  0.024000,
  'MOTORBIKE_PETRO',
  'Average electric motorbike factor using Vietnam grid factor 2023: 0.6592 kg CO2/kWh.'
),
(
  'CAR_4_ELECTRIC',
  'Electric 4-seat Car',
  'CAR_4', 'ELECTRIC',
  127.0, 'WH_PER_KM',
  0.084000,
  'CAR_4_PETRO',
  'Average electric 4-seat car factor using Vietnam grid factor 2023: 0.6592 kg CO2/kWh.'
),
(
  'SUV_7_ELECTRIC',
  'Electric 7-seat / SUV',
  'SUV_7', 'ELECTRIC',
  192.5, 'WH_PER_KM',
  0.127000,
  'SUV_7_PETRO',
  'Average electric SUV factor using Vietnam grid factor 2023: 0.6592 kg CO2/kWh.'
);

-- Petrol profiles are their own baseline (self-referencing)
UPDATE vehicle_profiles
SET    baseline_profile_id = id
WHERE  powertrain = 'PETRO';


-- -------------------------------------------------------------
-- rewards
-- -------------------------------------------------------------
INSERT INTO rewards (id, name, description, required_green_points, value_vnd)
VALUES
(
  '30000000-0000-0000-0000-000000000001',
  'Green Commuter Voucher',
  'Redeem a 50,000 VND voucher for sustainable commuting.',
  1000,
  50000
),
(
  '30000000-0000-0000-0000-000000000002',
  'Top Green Employee Badge',
  'Monthly recognition badge for outstanding green behaviour.',
  2000,
  0
);