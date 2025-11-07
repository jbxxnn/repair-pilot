-- enable pgcrypto for UUIDs if using Postgres < 13 on some hosts
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,          -- offline token
  scope TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'intake',
  customer_id TEXT NOT NULL,
  device_type TEXT,
  device_brand TEXT,
  device_model TEXT,
  serial TEXT,
  issue_description TEXT,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  quoted_amount NUMERIC(10,2),
  deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  intake_order_id TEXT,
  final_order_id TEXT,
  technician_id TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE parts_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sku TEXT,
  quantity INT NOT NULL DEFAULT 1,
  cost NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Shopify Session table for authentication
CREATE TABLE "Session" (
  id TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  state TEXT NOT NULL,
  "isOnline" BOOLEAN NOT NULL DEFAULT false,
  scope TEXT,
  expires TIMESTAMP,
  "accessToken" TEXT NOT NULL,
  "userId" BIGINT,
  "firstName" TEXT,
  "lastName" TEXT,
  email TEXT,
  "accountOwner" BOOLEAN NOT NULL DEFAULT false,
  locale TEXT,
  collaborator BOOLEAN,
  "emailVerified" BOOLEAN
);

