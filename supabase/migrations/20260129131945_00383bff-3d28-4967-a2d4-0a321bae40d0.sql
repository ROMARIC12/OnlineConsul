-- Add sample weekly availability for doctors that don't yet have any (Mon-Fri 09:00-17:00)
INSERT INTO public.doctor_availability (doctor_id, day_of_week, start_time, end_time, is_active)
SELECT d.id, dow.day_of_week, '09:00:00'::time, '17:00:00'::time, true
FROM public.doctors d
CROSS JOIN (VALUES (1),(2),(3),(4),(5)) AS dow(day_of_week)
WHERE NOT EXISTS (
  SELECT 1 FROM public.doctor_availability da
  WHERE da.doctor_id = d.id AND da.day_of_week = dow.day_of_week AND da.is_active = true
);