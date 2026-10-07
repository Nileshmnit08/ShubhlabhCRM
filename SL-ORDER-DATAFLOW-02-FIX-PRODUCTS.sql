-- SL-ORDER-DATAFLOW-02-FIX-PRODUCTS.sql
-- Run this script in Supabase SQL Editor to grant Buyers access to products

-- The public.products table currently relies on the "Active users Prods Select" policy,
-- which uses public.is_active_user().
-- In 224_sprint_ORDER_01A_buyer_security.sql, is_active_user() was redefined to explicitly EXCLUDE Buyers
-- to prevent them from falling through to broad CRM policies.
-- As a result, Buyers lost read access to the product master.

-- This policy securely restores SELECT-only access specifically for active Buyers.
-- It does not grant INSERT/UPDATE/DELETE access, preserving CRM admin control over products.

DROP POLICY IF EXISTS "Buyer Products Select" ON public.products;

CREATE POLICY "Buyer Products Select"
  ON public.products FOR SELECT
  USING (public.is_buyer());
