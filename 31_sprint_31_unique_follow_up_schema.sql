-- MICRO-SPRINT 11.4: Unique Pending Follow-ups Constraint

-- 0. Cleanup: Ensure no duplicate pending follow-ups currently exist.
-- We will keep the one with the earliest due_at, and mark the others as Cancelled.
WITH ranked_followups AS (
  SELECT id,
         ROW_NUMBER() OVER(PARTITION BY party_id, follow_up_type ORDER BY due_at ASC NULLS LAST, created_at ASC) as rn
  FROM follow_ups
  WHERE status = 'Pending'
)
UPDATE follow_ups
SET status = 'Cancelled', notes = CONCAT(COALESCE(notes, ''), ' (Auto-cancelled: Duplicate Pending)')
WHERE id IN (
  SELECT id FROM ranked_followups WHERE rn > 1
);

-- 1. Create a unique partial index to ensure only ONE pending follow-up of a specific type can exist per customer at any given time.
-- This enforces duplicate-protection at the database level.
DROP INDEX IF EXISTS idx_unique_pending_followup;
CREATE UNIQUE INDEX idx_unique_pending_followup ON follow_ups (party_id, follow_up_type) WHERE status = 'Pending';
