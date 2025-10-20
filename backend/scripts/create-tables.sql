-- Create account_type table
CREATE TABLE IF NOT EXISTS public.account_type (
    acc_type_id VARCHAR(10) PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create account table
CREATE TABLE IF NOT EXISTS public.account (
    account_id SERIAL PRIMARY KEY,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    customer_id VARCHAR(20) NOT NULL,
    acc_type_id VARCHAR(10) NOT NULL,
    branch_id INTEGER NOT NULL,
    current_balance DECIMAL(15,2) DEFAULT 0.00,
    status BOOLEAN DEFAULT true,
    opening_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id),
    FOREIGN KEY (acc_type_id) REFERENCES public.account_type(acc_type_id),
    FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id)
);

-- Create transaction_type table
CREATE TABLE IF NOT EXISTS public.transaction_type (
    transaction_type_id VARCHAR(10) PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create transaction table
CREATE TABLE IF NOT EXISTS public.transaction (
    transaction_id SERIAL PRIMARY KEY,
    transaction_number VARCHAR(20) UNIQUE NOT NULL,
    transaction_type_id VARCHAR(10) NOT NULL,
    account_number VARCHAR(20) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2),
    reference VARCHAR(255),
    description TEXT,
    status BOOLEAN DEFAULT true,
    agent_id VARCHAR(20) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_type_id) REFERENCES public.transaction_type(transaction_type_id),
    FOREIGN KEY (account_number) REFERENCES public.account(account_number),
    FOREIGN KEY (agent_id) REFERENCES public.employee_auth(employee_id)
);

-- Insert default account types
INSERT INTO public.account_type (acc_type_id, type_name, description) VALUES
('SAV001', 'Savings Account', 'Standard savings account for rural customers'),
('CUR001', 'Current Account', 'Current account for business customers')
ON CONFLICT (acc_type_id) DO NOTHING;

-- Insert default transaction types
INSERT INTO public.transaction_type (transaction_type_id, type_name, description) VALUES
('DEP001', 'Deposit', 'Money deposit transaction'),
('WIT001', 'Withdraw', 'Money withdrawal transaction'),
('INT001', 'Interest_Calculation', 'Interest calculation transaction')
ON CONFLICT (transaction_type_id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_account_customer_id ON public.account(customer_id);
CREATE INDEX IF NOT EXISTS idx_account_number ON public.account(account_number);
CREATE INDEX IF NOT EXISTS idx_transaction_account_number ON public.transaction(account_number);
CREATE INDEX IF NOT EXISTS idx_transaction_agent_id ON public.transaction(agent_id);
CREATE INDEX IF NOT EXISTS idx_transaction_date ON public.transaction(transaction_date);



















