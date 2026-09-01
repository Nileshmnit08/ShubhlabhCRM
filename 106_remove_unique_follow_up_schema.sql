-- Migration: 106_remove_unique_follow_up_schema.sql
-- Description: Removes the unique constraint on pending follow-ups to allow multiple concurrent follow-ups per customer.

DROP INDEX IF EXISTS public.idx_unique_pending_followup;
