-- Corriger la fonction book_appointment_atomic
-- Problème: FOR UPDATE ne peut pas être utilisé avec COUNT(*) (fonction d'agrégation)
-- Solution: Utiliser pg_advisory_xact_lock() pour le verrouillage et EXISTS pour la vérification

CREATE OR REPLACE FUNCTION public.book_appointment_atomic(
  p_patient_id UUID,
  p_doctor_id UUID,
  p_appointment_date DATE,
  p_appointment_time TIME,
  p_clinic_id UUID DEFAULT NULL,
  p_is_first_visit BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment_id UUID;
  v_lock_key BIGINT;
BEGIN
  -- Créer une clé de verrouillage unique basée sur médecin+date+heure
  -- Cela garantit qu'un seul processus peut réserver ce créneau à la fois
  v_lock_key := hashtext(
    p_doctor_id::text || 
    p_appointment_date::text || 
    p_appointment_time::text
  );
  
  -- Acquérir un verrou consultatif transactionnel
  -- Ce verrou est libéré automatiquement à la fin de la transaction
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  -- Vérifier si le créneau est déjà réservé (sans FOR UPDATE)
  IF EXISTS (
    SELECT 1 FROM appointments
    WHERE doctor_id = p_doctor_id
      AND appointment_date = p_appointment_date
      AND appointment_time = p_appointment_time
      AND status NOT IN ('cancelled')
  ) THEN
    RAISE EXCEPTION 'Ce créneau est déjà réservé';
  END IF;

  -- Insérer le nouveau rendez-vous
  INSERT INTO appointments (
    patient_id,
    doctor_id,
    appointment_date,
    appointment_time,
    clinic_id,
    is_first_visit,
    status,
    confirmation_required
  ) VALUES (
    p_patient_id,
    p_doctor_id,
    p_appointment_date,
    p_appointment_time,
    p_clinic_id,
    p_is_first_visit,
    'pending',
    true
  )
  RETURNING id INTO v_appointment_id;

  RETURN v_appointment_id;
END;
$$;