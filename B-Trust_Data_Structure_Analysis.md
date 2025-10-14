# B-Trust Banking System - Data Structure Analysis

## Overview
**Project**: B-Trust Banking System  
**Database**: PostgreSQL 17  
**Environment**: Production & Development branches  
**Total Tables**: 23 tables across 2 schemas (public, otp)

## Core Business Entities

### 1. Customer Management
- **`customer`** - Core customer information
  - Primary Key: `customer_id` (character)
  - Personal Info: first_name, last_name, gender, date_of_birth, address
  - Contact: phone_number, email, phone_is_verified
  - Identity: nic_number, kyc_status
  - Relationships: agent_id → employee_auth, branch_id → branch

### 2. Account Management
- **`savings_account`** - Customer savings accounts
  - Primary Key: `account_number` (character)
  - Account Details: acc_type_id, branch_id, opening_date, current_balance, status
  - Relationships: acc_type_id → account_type, branch_id → branch

- **`account_type`** - Account type definitions
  - Primary Key: `acc_type_id` (character)
  - Configuration: type_name, minimum_balance, minimum_age, interest_rate, withdrawal_limit

- **`account_ownership`** - Links customers to accounts
  - Links: customer_id → customer, account_number → savings_account

### 3. Transaction System
- **`transaction`** - All financial transactions
  - Primary Key: `transaction_id` (character)
  - Transaction Details: amount, balance_before, reference, date, time, status
  - Relationships: transaction_type_id → transaction_type, agent_id → employee_auth, account_number → savings_account

- **`transaction_type`** - Transaction type definitions
  - Primary Key: `transaction_type_id` (character)

### 4. Employee & Authentication
- **`employee_auth`** - Bank employees/staff
  - Primary Key: `employee_id` (character)
  - Employee Info: role (Agent/Manager), employee_name, password_hash, phone_number, email
  - Profile: profile_picture_url, gender, status
  - Relationships: branch_id → branch

- **`users`** - System users (separate from employees)
  - Primary Key: `id` (integer, auto-increment)
  - User Info: email, password, name, phone, phone_verified
  - Security: two_factor_enabled
  - Timestamps: created_at, updated_at

### 5. Security & Fraud Detection
- **`fraud_detection`** - Fraud monitoring system
  - Primary Key: `flag_id` (character)
  - Fraud Details: severity_level (Low/Medium/High/Critical), status (Open/Resolved/Escalated)
  - Relationships: transaction_id → transaction, reviewed_by → employee_auth, fraudtype_id → fraud_type

- **`fraud_type`** - Fraud type classifications
  - Primary Key: `fraudtype_id` (character)

### 6. OTP & Verification
- **`otp.OtpToken`** - OTP token management (separate schema)
- **`customer_otp`** - Customer OTP verification
- **`employee_otp`** - Employee OTP verification
- **`verification_codes`** - General verification codes

### 7. Session Management
- **`employee_sessiontoken`** - Employee session tokens
- **`refresh_tokens`** - Token refresh mechanism

### 8. Branch & Organization
- **`branch`** - Bank branches
  - Primary Key: `branch_id` (integer)

### 9. Fixed Deposits
- **`fixed_deposit`** - Fixed deposit accounts
- **`fd_type`** - Fixed deposit type definitions

### 10. Alerts & Monitoring
- **`customer_alerts`** - Customer alert system
- **`alert_type`** - Alert type definitions
- **`account_activity_log`** - Account activity tracking
- **`audit_log`** - System audit trail

## Key Relationships

### Primary Relationships:
1. **Customer → Account**: customer → account_ownership → savings_account
2. **Account → Transaction**: savings_account → transaction
3. **Employee → Customer**: employee_auth → customer (via agent_id)
4. **Employee → Transaction**: employee_auth → transaction (via agent_id)
5. **Transaction → Fraud**: transaction → fraud_detection
6. **Branch → Everything**: branch connects to customers, accounts, employees

### Security Relationships:
- OTP tokens link to both customers and employees
- Session tokens manage employee authentication
- Audit logs track all system activities
- Fraud detection monitors all transactions

## Data Flow Architecture

```
Customer Registration → KYC Verification → Account Creation → Transaction Processing → Fraud Monitoring → Audit Logging
```

## Security Features
- Multi-factor authentication (2FA)
- OTP verification for customers and employees
- Session token management
- Comprehensive audit logging
- Real-time fraud detection with severity levels
- Role-based access (Agent/Manager)

## Database Statistics
- **Total Tables**: 23
- **Schemas**: 2 (public, otp)
- **Current Data**: Mostly empty (development/testing phase)
- **Indexes**: Optimized for primary keys and foreign keys
- **Constraints**: Comprehensive referential integrity

## Environment Setup
- **Production Branch**: `br-fragrant-field-adrab7o4` (active)
- **Development Branch**: `br-square-lab-add990qc` (archived)
- **PostgreSQL Version**: 17
- **Region**: AWS US East 1

