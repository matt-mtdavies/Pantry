-- Already applied directly to D1
ALTER TABLE recipes ADD COLUMN cost_currency TEXT NOT NULL DEFAULT 'USD';
