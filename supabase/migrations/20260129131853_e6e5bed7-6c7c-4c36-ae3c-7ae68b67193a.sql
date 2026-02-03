-- Make existing doctors visible to patients by marking them as verified
UPDATE public.doctors
SET is_verified = true
WHERE is_verified IS DISTINCT FROM true;

-- Activate existing availability slots so patients can see/select time slots
UPDATE public.doctor_availability
SET is_active = true
WHERE is_active IS DISTINCT FROM true;