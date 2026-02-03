-- Lier les médecins vérifiés à des centres de santé pour le test
-- (On lie chaque médecin vérifié au premier centre disponible)

-- Médecin 1: ange brice -> Polyclinique Centrale Abobo
INSERT INTO public.clinic_doctors (doctor_id, clinic_id, is_active)
VALUES 
  ('dae3aa24-48e6-46ff-aa37-313baeb3bbf0', 'eb7cce80-0b63-4c59-b293-ccdd51631b8a', true)
ON CONFLICT DO NOTHING;

-- Médecin 2: romaric koffi -> Clinique Médicale La Chrysalide
INSERT INTO public.clinic_doctors (doctor_id, clinic_id, is_active)
VALUES 
  ('ef8d8bc6-1a4e-4016-9ead-a9e5640b1341', '78feaab9-16bc-44eb-b960-4da690bd8a00', true)
ON CONFLICT DO NOTHING;

-- Médecin 3: Olivier Ehoussou -> Grande Clinique du Dokui  
INSERT INTO public.clinic_doctors (doctor_id, clinic_id, is_active)
VALUES 
  ('41228b5d-f212-4331-8b95-05470c4ad28f', '2765d5eb-bf42-464a-b0c2-cadecc37c4d3', true)
ON CONFLICT DO NOTHING;

-- Médecin 4: Rihanatou Savadogo -> Clinique Sainte Rita de Cascia
INSERT INTO public.clinic_doctors (doctor_id, clinic_id, is_active)
VALUES 
  ('833a328b-f536-473c-af8b-913d3b1a460a', 'e1b02b60-6860-4a2a-b561-7ef6ac7ec8c9', true)
ON CONFLICT DO NOTHING;

-- Médecin 5: Richmond KOUASSI -> Hôpital Général de Grand-Bassam
INSERT INTO public.clinic_doctors (doctor_id, clinic_id, is_active)
VALUES 
  ('89826de5-aa62-4591-a42a-82d0b5334667', 'e78e7c3b-18ac-42eb-b49d-662432e1f2eb', true)
ON CONFLICT DO NOTHING;

-- Médecin 6: Felix Azoah -> Centre Médical Sainte Famille
INSERT INTO public.clinic_doctors (doctor_id, clinic_id, is_active)
VALUES 
  ('fae08740-f081-44f4-8327-7783d344cd98', '2b34d468-d154-4d69-a2ca-446ccea8093c', true)
ON CONFLICT DO NOTHING;

-- Médecin 7: kenny winner -> Polyclinique Centrale Abobo (second médecin)
INSERT INTO public.clinic_doctors (doctor_id, clinic_id, is_active)
VALUES 
  ('8bf87d3d-7482-4068-92db-74ebc5776725', 'eb7cce80-0b63-4c59-b293-ccdd51631b8a', true)
ON CONFLICT DO NOTHING;

-- Ajouter des disponibilités pour les médecins (sinon ils n'affichent pas de créneaux)
-- Lundi à Vendredi 8h-17h pour tous les médecins vérifiés

INSERT INTO public.doctor_availability (doctor_id, day_of_week, start_time, end_time, is_active, max_appointments)
SELECT d.id, day, '08:00:00'::time, '17:00:00'::time, true, 20
FROM doctors d
CROSS JOIN generate_series(1, 5) AS day  -- 1=Lundi ... 5=Vendredi
WHERE d.is_verified = true
ON CONFLICT DO NOTHING;
