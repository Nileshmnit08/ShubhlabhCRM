-- SPRINT FIX: SL-ORDER-SINGLE-SOURCE-OF-TRUTH-01
-- Objective: Make requirement_items the single source of truth for all line-item parameters.

-- 1. Add canonical line item columns to requirement_items
ALTER TABLE public.requirement_items
ADD COLUMN IF NOT EXISTS weight NUMERIC,
ADD COLUMN IF NOT EXISTS gift VARCHAR(255),
ADD COLUMN IF NOT EXISTS other_gift VARCHAR(255);

-- 2. Backfill existing data from requirements.notes (the JSON blob `extras`)
DO $$
DECLARE
    req_row RECORD;
    item_row RECORD;
    extras JSONB;
    item_key TEXT;
    v_weight NUMERIC;
    v_gift VARCHAR;
    v_other_gift VARCHAR;
BEGIN
    -- Loop through all requirements that have JSON notes
    FOR req_row IN SELECT id, notes FROM public.requirements WHERE notes IS NOT NULL AND notes LIKE '{%}' LOOP
        BEGIN
            -- Try cast to jsonb
            extras := (req_row.notes::jsonb)->'extras';
            
            IF extras IS NOT NULL THEN
                -- Loop through items of this requirement
                FOR item_row IN SELECT id, category, product_name FROM public.requirement_items WHERE requirement_id = req_row.id LOOP
                    item_key := item_row.category || '_' || item_row.product_name;
                    
                    IF extras ? item_key THEN
                        v_weight := (extras->item_key->>'weight')::NUMERIC;
                        v_gift := extras->item_key->>'gift';
                        v_other_gift := extras->item_key->>'other_gift';
                        
                        -- Update the item
                        UPDATE public.requirement_items
                        SET weight = v_weight,
                            gift = v_gift,
                            other_gift = v_other_gift
                        WHERE id = item_row.id;
                    END IF;
                END LOOP;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Skip malformed JSON
        END;
    END LOOP;
END;
$$;
