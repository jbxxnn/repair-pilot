ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS deposit_payment_order_id TEXT,
    ADD COLUMN IF NOT EXISTS deposit_payment_order_name TEXT,
    ADD COLUMN IF NOT EXISTS deposit_payment_method TEXT,
    ADD COLUMN IF NOT EXISTS deposit_collected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deposit_collected_amount NUMERIC(10, 2);
