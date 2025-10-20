-- Update account_type table to include interest_rate and minimum_balance columns
-- This script updates the account types with the correct information

-- Add new columns to account_type table if they don't exist
ALTER TABLE public.account_type 
ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS minimum_balance DECIMAL(15,2) DEFAULT 0.00;

-- Update existing account types with correct information
-- First, delete the old account types
DELETE FROM public.account_type WHERE acc_type_id IN ('SAV001', 'CUR001');

-- Insert the new account types with correct information
INSERT INTO public.account_type (acc_type_id, type_name, description, interest_rate, minimum_balance) VALUES
('CHD001', 'Children', 'For children under 18 - 12% interest, no minimum balance', 12.00, 0.00),
('TEN001', 'Teen', 'For teenagers 13-17 - 11% interest, minimum LKR 500', 11.00, 500.00),
('ADT001', 'Adult (18+)', 'For adults 18-59 - 10% interest, minimum LKR 1000', 10.00, 1000.00),
('SNR001', 'Senior (60+)', 'For seniors 60+ - 13% interest, minimum LKR 1000', 13.00, 1000.00),
('JNT001', 'Joint', 'Joint account for multiple holders - 7% interest, minimum LKR 5000', 7.00, 5000.00)
ON CONFLICT (acc_type_id) DO UPDATE SET
    type_name = EXCLUDED.type_name,
    description = EXCLUDED.description,
    interest_rate = EXCLUDED.interest_rate,
    minimum_balance = EXCLUDED.minimum_balance,
    created_at = CURRENT_TIMESTAMP;

-- Update any existing accounts that reference old account types
-- This is a safety measure in case there are existing accounts
UPDATE public.account 
SET acc_type_id = 'ADT001' 
WHERE acc_type_id = 'SAV001';

UPDATE public.account 
SET acc_type_id = 'JNT001' 
WHERE acc_type_id = 'CUR001';

-- Add comments to document the changes
COMMENT ON COLUMN public.account_type.interest_rate IS 'Annual interest rate percentage for this account type';
COMMENT ON COLUMN public.account_type.minimum_balance IS 'Minimum balance required to open this account type in LKR';

-- Verify the updates
SELECT 
    acc_type_id,
    type_name,
    interest_rate,
    minimum_balance,
    description
FROM public.account_type 
ORDER BY acc_type_id;







