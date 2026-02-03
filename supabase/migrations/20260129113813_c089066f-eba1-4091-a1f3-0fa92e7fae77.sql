-- =============================================================================
-- NOTIFICATION TRIGGERS FOR REAL-TIME CROSS-PROFILE COMMUNICATION
-- =============================================================================

-- Function: Notify when a new appointment is created
CREATE OR REPLACE FUNCTION public.notify_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_patient_name TEXT;
  v_doctor_user_id UUID;
  v_secretary_record RECORD;
BEGIN
  -- Get patient name
  SELECT CONCAT(p.first_name, ' ', p.last_name) INTO v_patient_name
  FROM profiles p
  JOIN patients pat ON pat.profile_id = p.id
  WHERE pat.id = NEW.patient_id;

  -- Get doctor user ID
  SELECT d.profile_id INTO v_doctor_user_id
  FROM doctors d WHERE d.id = NEW.doctor_id;

  -- Notify the doctor
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_doctor_user_id,
    'appointment',
    'Nouveau rendez-vous',
    FORMAT('Nouveau patient %s le %s à %s',
      COALESCE(v_patient_name, 'Inconnu'),
      TO_CHAR(NEW.appointment_date, 'DD/MM/YYYY'),
      TO_CHAR(NEW.appointment_time, 'HH24:MI')),
    jsonb_build_object('appointment_id', NEW.id, 'action', 'new')
  );

  -- Notify all secretaries
  FOR v_secretary_record IN
    SELECT user_id FROM user_roles WHERE role = 'secretary'
  LOOP
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      v_secretary_record.user_id,
      'appointment',
      'Nouveau RDV à confirmer',
      FORMAT('%s - %s à %s',
        COALESCE(v_patient_name, 'Inconnu'),
        TO_CHAR(NEW.appointment_date, 'DD/MM/YYYY'),
        TO_CHAR(NEW.appointment_time, 'HH24:MI')),
      jsonb_build_object('appointment_id', NEW.id, 'action', 'confirm_required')
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Notify when appointment status changes
CREATE OR REPLACE FUNCTION public.notify_appointment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_patient_name TEXT;
  v_patient_user_id UUID;
  v_doctor_user_id UUID;
  v_doctor_name TEXT;
  v_secretary_record RECORD;
BEGIN
  -- Only process if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get patient info
  SELECT 
    CONCAT(p.first_name, ' ', p.last_name),
    p.id
  INTO v_patient_name, v_patient_user_id
  FROM profiles p
  JOIN patients pat ON pat.profile_id = p.id
  WHERE pat.id = NEW.patient_id;

  -- Get doctor info
  SELECT 
    d.profile_id,
    CONCAT(p.first_name, ' ', p.last_name)
  INTO v_doctor_user_id, v_doctor_name
  FROM doctors d
  JOIN profiles p ON d.profile_id = p.id
  WHERE d.id = NEW.doctor_id;

  -- Handle different status changes
  CASE NEW.status
    WHEN 'confirmed' THEN
      -- Notify patient
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        v_patient_user_id,
        'appointment',
        'RDV confirmé',
        FORMAT('Votre rendez-vous avec Dr %s le %s à %s est confirmé',
          COALESCE(v_doctor_name, ''),
          TO_CHAR(NEW.appointment_date, 'DD/MM/YYYY'),
          TO_CHAR(NEW.appointment_time, 'HH24:MI')),
        jsonb_build_object('appointment_id', NEW.id, 'status', 'confirmed')
      );
      -- Notify doctor
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        v_doctor_user_id,
        'appointment',
        'RDV confirmé',
        FORMAT('RDV avec %s le %s à %s confirmé',
          COALESCE(v_patient_name, 'Inconnu'),
          TO_CHAR(NEW.appointment_date, 'DD/MM/YYYY'),
          TO_CHAR(NEW.appointment_time, 'HH24:MI')),
        jsonb_build_object('appointment_id', NEW.id, 'status', 'confirmed')
      );

    WHEN 'cancelled' THEN
      -- Notify patient
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        v_patient_user_id,
        'appointment',
        'RDV annulé',
        FORMAT('Votre rendez-vous du %s à %s a été annulé. %s',
          TO_CHAR(NEW.appointment_date, 'DD/MM/YYYY'),
          TO_CHAR(NEW.appointment_time, 'HH24:MI'),
          COALESCE('Raison: ' || NEW.cancellation_reason, '')),
        jsonb_build_object('appointment_id', NEW.id, 'status', 'cancelled', 'reason', NEW.cancellation_reason)
      );
      -- Notify doctor
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        v_doctor_user_id,
        'appointment',
        'RDV annulé',
        FORMAT('RDV avec %s le %s annulé',
          COALESCE(v_patient_name, 'Inconnu'),
          TO_CHAR(NEW.appointment_date, 'DD/MM/YYYY')),
        jsonb_build_object('appointment_id', NEW.id, 'status', 'cancelled')
      );

    WHEN 'completed' THEN
      -- Notify patient
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        v_patient_user_id,
        'appointment',
        'Consultation terminée',
        FORMAT('Votre consultation avec Dr %s est terminée',
          COALESCE(v_doctor_name, '')),
        jsonb_build_object('appointment_id', NEW.id, 'status', 'completed')
      );
      -- Notify secretaries for billing
      FOR v_secretary_record IN
        SELECT user_id FROM user_roles WHERE role = 'secretary'
      LOOP
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
          v_secretary_record.user_id,
          'payment',
          'Consultation terminée - Facturation',
          FORMAT('Consultation de %s terminée - facturation à prévoir',
            COALESCE(v_patient_name, 'Inconnu')),
          jsonb_build_object('appointment_id', NEW.id, 'action', 'billing_required')
        );
      END LOOP;

    WHEN 'no_show' THEN
      -- Notify patient
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        v_patient_user_id,
        'appointment',
        'Absence signalée',
        FORMAT('Vous avez été marqué absent pour votre RDV du %s',
          TO_CHAR(NEW.appointment_date, 'DD/MM/YYYY')),
        jsonb_build_object('appointment_id', NEW.id, 'status', 'no_show')
      );

    ELSE
      -- No notification for other status changes
      NULL;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Notify when urgent request is created
CREATE OR REPLACE FUNCTION public.notify_urgent_request()
RETURNS TRIGGER AS $$
DECLARE
  v_patient_name TEXT;
  v_secretary_record RECORD;
BEGIN
  -- Get patient name
  SELECT CONCAT(p.first_name, ' ', p.last_name) INTO v_patient_name
  FROM profiles p
  JOIN patients pat ON pat.profile_id = p.id
  WHERE pat.id = NEW.patient_id;

  -- Notify all secretaries with urgent type
  FOR v_secretary_record IN
    SELECT user_id FROM user_roles WHERE role = 'secretary'
  LOOP
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      v_secretary_record.user_id,
      'urgent',
      '⚠️ Demande urgente',
      FORMAT('Demande urgente de %s - %s',
        COALESCE(v_patient_name, 'Inconnu'),
        COALESCE(NEW.notes, 'Pas de détails')),
      jsonb_build_object('urgent_request_id', NEW.id, 'patient_id', NEW.patient_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Audit log for critical appointment changes
CREATE OR REPLACE FUNCTION public.audit_appointment_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
    VALUES (
      auth.uid(),
      'appointment_status_change',
      'appointments',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'cancellation_reason', NEW.cancellation_reason
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_new_appointment ON appointments;
CREATE TRIGGER trigger_notify_new_appointment
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_appointment();

DROP TRIGGER IF EXISTS trigger_notify_appointment_status_change ON appointments;
CREATE TRIGGER trigger_notify_appointment_status_change
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_status_change();

DROP TRIGGER IF EXISTS trigger_notify_urgent_request ON urgent_requests;
CREATE TRIGGER trigger_notify_urgent_request
  AFTER INSERT ON urgent_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_urgent_request();

DROP TRIGGER IF EXISTS trigger_audit_appointment_changes ON appointments;
CREATE TRIGGER trigger_audit_appointment_changes
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION audit_appointment_changes();