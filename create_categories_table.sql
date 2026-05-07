-- Create categories table for GarxechChai
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    icon VARCHAR(10) DEFAULT '🍽️',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, icon) VALUES
    ('tea', '☕'),
    ('meal', '🍔'),
    ('juice', '🥤'),
    ('roaster', '🍖')
ON CONFLICT (name) DO NOTHING;

-- Add comment
COMMENT ON TABLE categories IS 'Food and beverage categories for menu items';