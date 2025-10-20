-- Fixed Deposit daily interest accrual infrastructure

-- 1) Accrual table (idempotent per fd_number + accrual_date)
CREATE TABLE IF NOT EXISTS fd_interest_accrual (
  id SERIAL PRIMARY KEY,
  fd_number VARCHAR(32) NOT NULL,
  accrual_date DATE NOT NULL,
  interest_amount NUMERIC(18,2) NOT NULL,
  principal_amount NUMERIC(18,2) NOT NULL,
  annual_rate NUMERIC(7,4) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fd_number, accrual_date)
);

-- 2) Helper view: total accrued interest to date per FD
CREATE OR REPLACE VIEW v_fd_interest_accrued AS
SELECT fd_number,
       SUM(interest_amount) AS accrued_interest
FROM fd_interest_accrual
GROUP BY fd_number;

-- 3) Helper view: FD balance at maturity (principal + full simple interest)
--    Note: maturity_amount is already stored in fixed_deposit at opening
--    This view just exposes how much has been accrued so far vs maturity
CREATE OR REPLACE VIEW v_fd_interest_progress AS
SELECT fd.fd_number,
       fd.customer_id,
       fd.principal_amount,
       fd.interest_rate,
       fd.tenure_months,
       fd.opening_date,
       fd.maturity_date,
       fd.maturity_amount,
       COALESCE(a.accrued_interest, 0) AS accrued_interest_to_date,
       (fd.maturity_amount - fd.principal_amount) AS full_interest,
       GREATEST(0, (fd.maturity_amount - fd.principal_amount) - COALESCE(a.accrued_interest, 0)) AS remaining_interest
FROM fixed_deposit fd
LEFT JOIN v_fd_interest_accrued a ON a.fd_number = fd.fd_number;




















