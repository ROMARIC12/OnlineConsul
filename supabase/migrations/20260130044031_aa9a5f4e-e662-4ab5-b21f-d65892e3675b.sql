-- Allow Paystack as a payment provider (fix payments_provider_check constraint)
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_provider_check;

ALTER TABLE public.payments
ADD CONSTRAINT payments_provider_check
CHECK (
  provider IS NULL
  OR provider = ANY (ARRAY['orange_money'::text, 'mtn_momo'::text, 'wave'::text, 'paystack'::text])
);