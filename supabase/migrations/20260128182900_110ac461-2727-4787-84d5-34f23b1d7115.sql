-- Fix permissive RLS policy by removing the overly permissive INSERT policy
-- and keeping only the staff-controlled insert policy
DROP POLICY IF EXISTS "System notifications insert" ON public.notifications;