-- Create transaction_otp_verification table for audit trail
CREATE TABLE IF NOT EXISTS transaction_otp_verification (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(20) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    transaction_amount DECIMAL(15,2) NOT NULL,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_transaction_otp_verification_account 
ON transaction_otp_verification(account_number);

CREATE INDEX IF NOT EXISTS idx_transaction_otp_verification_phone 
ON transaction_otp_verification(phone_number);

CREATE INDEX IF NOT EXISTS idx_transaction_otp_verification_status 
ON transaction_otp_verification(verification_status);




















