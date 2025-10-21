-- Create table for transaction OTP verification audit trail
CREATE TABLE IF NOT EXISTS transaction_otp_verification (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(20) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    transaction_amount DECIMAL(15,2) NOT NULL,
    verification_status VARCHAR(20) NOT NULL CHECK (verification_status IN ('pending', 'verified', 'failed', 'expired')),
    verification_id VARCHAR(100),
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 minutes')
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_verification_account ON transaction_otp_verification(account_number);
CREATE INDEX IF NOT EXISTS idx_otp_verification_phone ON transaction_otp_verification(phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_verification_created ON transaction_otp_verification(created_at);

-- Add comment
COMMENT ON TABLE transaction_otp_verification IS 'Audit trail for transaction OTP verifications';























