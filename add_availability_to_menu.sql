-- Migration: Add availability status to menu table
-- Purpose: Support Out of Stock feature
-- This allows admins to mark items as unavailable without hiding them

ALTER TABLE menu
ADD COLUMN is_available BOOLEAN DEFAULT true;

-- Add comment documenting the field
COMMENT ON COLUMN menu.is_available IS 'true = Available, false = Out of Stock. Item is still visible but Add button is disabled.';
