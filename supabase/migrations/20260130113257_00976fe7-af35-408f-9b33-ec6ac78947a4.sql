-- Drop the existing check constraint and add 'moneyfusion' as allowed provider
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_provider_check;

ALTER TABLE public.payments ADD CONSTRAINT payments_provider_check 
  CHECK (provider IN ('paystack', 'moneyfusion', 'mobile_money', 'card', 'cash'));