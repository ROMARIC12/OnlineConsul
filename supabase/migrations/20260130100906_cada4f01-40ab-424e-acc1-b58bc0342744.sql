-- Verify all existing doctors so they can be seen by patients
UPDATE doctors SET is_verified = true WHERE is_verified = false;

-- Add default availability for all doctors (Monday to Friday, 8h-17h)
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, is_active, max_appointments)
SELECT 
  d.id,
  day_num,
  '08:00'::time,
  '17:00'::time,
  true,
  20
FROM doctors d
CROSS JOIN generate_series(1, 5) AS day_num -- Monday (1) to Friday (5)
ON CONFLICT DO NOTHING;