CREATE INDEX IF NOT EXISTS idx_tickets_shop_status ON tickets(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_ticket ON audit_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_session_shop ON "Session"(shop);
CREATE INDEX IF NOT EXISTS idx_session_expires ON "Session"(expires);

