-- Migration: Update technician system to use Shopify Staff Members
-- This migration removes the local technicians table and ensures technician_id
-- is TEXT type to store Shopify StaffMember GIDs (e.g., gid://shopify/StaffMember/123)

-- Drop foreign key constraint if it exists (checking for any FK on technician_id)
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find any foreign key constraint on technician_id column
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.table_name = 'tickets'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'technician_id'
    LIMIT 1;
    
    -- Drop the constraint if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE tickets DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
    END IF;
END $$;

-- Ensure technician_id is TEXT (it should already be, but we're making sure)
ALTER TABLE tickets 
ALTER COLUMN technician_id TYPE TEXT;

-- Drop technicians table if it exists
DROP TABLE IF EXISTS technicians CASCADE;

-- Ensure the index exists (it should from the schema, but we'll make sure)
CREATE INDEX IF NOT EXISTS idx_tickets_technician ON tickets(technician_id);
