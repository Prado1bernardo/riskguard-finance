-- Add computed_at timestamp for audit trail
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS computed_at TIMESTAMP WITH TIME ZONE;

-- Add CHECK constraints for anti-bypass validation
ALTER TABLE public.expenses 
ADD CONSTRAINT chk_substitutability CHECK (substitutability IS NULL OR (substitutability >= 0 AND substitutability <= 10));

ALTER TABLE public.expenses 
ADD CONSTRAINT chk_cancellation_fee_pct CHECK (cancellation_fee_pct IS NULL OR (cancellation_fee_pct >= 0 AND cancellation_fee_pct <= 100));

ALTER TABLE public.expenses 
ADD CONSTRAINT chk_contract_months_remaining CHECK (contract_months_remaining IS NULL OR contract_months_remaining >= 0);

ALTER TABLE public.expenses 
ADD CONSTRAINT chk_notice_days CHECK (notice_days IS NULL OR notice_days >= 0);