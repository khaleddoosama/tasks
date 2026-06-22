-- Migration: Add energy_log column for energy entries
-- This replaces the single energy value with a JSON array of energy log entries

-- Step 1: Add energy_log column to days table
ALTER TABLE IF EXISTS days
ADD COLUMN IF NOT EXISTS energy_log jsonb DEFAULT '[]'::jsonb;

-- Step 2: Migrate existing energy data to energy_log (optional - for backwards compatibility)
-- If a single energy value exists, wrap it in an array
UPDATE days
SET energy_log = CASE
  WHEN energy IS NOT NULL AND energy != '' THEN
    jsonb_build_array(jsonb_build_object('level', energy::int))
  ELSE '[]'::jsonb
END
WHERE energy_log = '[]'::jsonb AND energy IS NOT NULL;

-- Step 3: Create index on energy_log for better query performance
CREATE INDEX IF NOT EXISTS idx_days_energy_log ON days USING GIN (energy_log);

-- Step 4: Keep the old energy column for backwards compatibility (commented for future cleanup)
-- ALTER TABLE days DROP COLUMN energy;
