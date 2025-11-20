-- Create quote_items table for itemized pre-quote breakdown
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'diagnostic', 'parts', 'labor', 'additional'
  description TEXT, -- Required for 'additional' items, optional for others
  amount DECIMAL(10, 2) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create index for efficient ticket lookups
CREATE INDEX idx_quote_items_ticket ON quote_items(ticket_id);

