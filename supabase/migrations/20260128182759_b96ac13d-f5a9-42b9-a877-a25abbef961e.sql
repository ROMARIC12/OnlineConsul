-- Create notifications table for real-time alerts
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('appointment', 'payment', 'reminder', 'urgent', 'system', 'queue_update')),
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

-- Policy: Staff can create notifications for anyone
CREATE POLICY "Staff can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'secretary') OR 
  has_role(auth.uid(), 'doctor')
);

-- Policy: System can create notifications (for triggers)
CREATE POLICY "System notifications insert"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create index for fast queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create atomic booking function to prevent double-booking
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
  v_existing_count INTEGER;
BEGIN
  -- Lock the row to prevent concurrent bookings
  SELECT COUNT(*) INTO v_existing_count
  FROM appointments
  WHERE doctor_id = p_doctor_id
    AND appointment_date = p_appointment_date
    AND appointment_time = p_appointment_time
    AND status NOT IN ('cancelled')
  FOR UPDATE;

  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'Ce créneau est déjà réservé';
  END IF;

  -- Insert the appointment
  INSERT INTO appointments (
    patient_id,
    doctor_id,
    appointment_date,
    appointment_time,
    clinic_id,
    is_first_visit,
    status
  ) VALUES (
    p_patient_id,
    p_doctor_id,
    p_appointment_date,
    p_appointment_time,
    p_clinic_id,
    p_is_first_visit,
    'pending'
  )
  RETURNING id INTO v_appointment_id;

  RETURN v_appointment_id;
END;
$$;

-- Function to calculate queue position
CREATE OR REPLACE FUNCTION public.get_queue_position(
  p_appointment_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_position INTEGER;
  v_doctor_id UUID;
  v_appointment_date DATE;
  v_appointment_time TIME;
BEGIN
  -- Get appointment details
  SELECT doctor_id, appointment_date, appointment_time
  INTO v_doctor_id, v_appointment_date, v_appointment_time
  FROM appointments
  WHERE id = p_appointment_id;

  IF v_doctor_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate position (count confirmed appointments before this one)
  SELECT COUNT(*) + 1 INTO v_position
  FROM appointments
  WHERE doctor_id = v_doctor_id
    AND appointment_date = v_appointment_date
    AND status IN ('confirmed', 'pending')
    AND appointment_time < v_appointment_time;

  RETURN v_position;
END;
$$;