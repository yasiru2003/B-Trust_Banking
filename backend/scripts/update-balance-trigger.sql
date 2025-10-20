-- Automatically sync account.current_balance from approved transactions
-- Safe and idempotent on UPDATE (applies only on false -> true transition)

-- 1) Create function
CREATE OR REPLACE FUNCTION public.apply_transaction_to_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_delta numeric := 0;
  v_acc text;
BEGIN
  -- Determine account number (trim padded CHARs just in case)
  v_acc := btrim(NEW.account_number);

  -- Only add/subtract for deposits/withdrawals
  IF NEW.transaction_type_id = 'DEP001' THEN
    v_delta := NEW.amount;
  ELSIF NEW.transaction_type_id = 'WIT001' THEN
    v_delta := - NEW.amount;
  ELSE
    v_delta := 0;
  END IF;

  -- INSERT case: apply if status is true on insert
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.status, false) = true THEN
      UPDATE public.account
         SET current_balance = COALESCE(current_balance,0) + v_delta,
             updated_at = CURRENT_TIMESTAMP
       WHERE btrim(account_number) = v_acc;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE case: apply only when status transitions from false -> true
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.status,false) = false AND COALESCE(NEW.status,false) = true THEN
      UPDATE public.account
         SET current_balance = COALESCE(current_balance,0) + v_delta,
             updated_at = CURRENT_TIMESTAMP
       WHERE btrim(account_number) = v_acc;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Create trigger on transaction table
DROP TRIGGER IF EXISTS trg_apply_transaction_balance_ins ON public.transaction;
CREATE TRIGGER trg_apply_transaction_balance_ins
AFTER INSERT ON public.transaction
FOR EACH ROW
EXECUTE FUNCTION public.apply_transaction_to_balance();

DROP TRIGGER IF EXISTS trg_apply_transaction_balance_upd ON public.transaction;
CREATE TRIGGER trg_apply_transaction_balance_upd
AFTER UPDATE OF status, amount, transaction_type_id ON public.transaction
FOR EACH ROW
EXECUTE FUNCTION public.apply_transaction_to_balance();






