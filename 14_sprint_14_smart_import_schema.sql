-- SPRINT 14: Smart Party Import Upsert

-- 1. Add email field to crm_parties
ALTER TABLE public.crm_parties 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. Add external tally ID if not exists
ALTER TABLE public.crm_parties
ADD COLUMN IF NOT EXISTS tally_ledger_id VARCHAR(255);

-- 3. Create unique index for GSTIN to prevent DB level duplicates (ignoring NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_parties_gst_number 
ON public.crm_parties (gst_number) 
WHERE gst_number IS NOT NULL AND gst_number != '';

-- 4. Create an RPC for executing the batch safely in a transaction
CREATE OR REPLACE FUNCTION execute_party_import_batch(
    p_inserts JSONB, 
    p_updates JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_inserted_count INT := 0;
    v_updated_count INT := 0;
    v_failed_count INT := 0;
    v_row JSONB;
    v_id UUID;
BEGIN
    -- Process Inserts
    IF p_inserts IS NOT NULL AND jsonb_array_length(p_inserts) > 0 THEN
        FOR v_row IN SELECT * FROM jsonb_array_elements(p_inserts)
        LOOP
            BEGIN
                INSERT INTO public.crm_parties (
                    display_name, legal_or_core_name, city, state, mobile, email, gst_number, tally_ledger_id
                ) VALUES (
                    v_row->>'display_name',
                    v_row->>'legal_or_core_name',
                    v_row->>'city',
                    v_row->>'state',
                    v_row->>'mobile',
                    v_row->>'email',
                    v_row->>'gst_number',
                    v_row->>'tally_ledger_id'
                );
                v_inserted_count := v_inserted_count + 1;
            EXCEPTION WHEN OTHERS THEN
                v_failed_count := v_failed_count + 1;
                RAISE NOTICE 'Insert failed for row: % - Error: %', v_row, SQLERRM;
            END;
        END LOOP;
    END IF;

    -- Process Updates (only overwriting if incoming is not null)
    IF p_updates IS NOT NULL AND jsonb_array_length(p_updates) > 0 THEN
        FOR v_row IN SELECT * FROM jsonb_array_elements(p_updates)
        LOOP
            BEGIN
                v_id := (v_row->>'id')::UUID;
                
                UPDATE public.crm_parties 
                SET 
                    display_name = COALESCE(NULLIF(v_row->>'display_name', ''), display_name),
                    legal_or_core_name = COALESCE(NULLIF(v_row->>'legal_or_core_name', ''), legal_or_core_name),
                    city = COALESCE(NULLIF(v_row->>'city', ''), city),
                    state = COALESCE(NULLIF(v_row->>'state', ''), state),
                    mobile = COALESCE(NULLIF(v_row->>'mobile', ''), mobile),
                    email = COALESCE(NULLIF(v_row->>'email', ''), email),
                    gst_number = COALESCE(NULLIF(v_row->>'gst_number', ''), gst_number),
                    tally_ledger_id = COALESCE(NULLIF(v_row->>'tally_ledger_id', ''), tally_ledger_id),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = v_id;
                
                v_updated_count := v_updated_count + 1;
            EXCEPTION WHEN OTHERS THEN
                v_failed_count := v_failed_count + 1;
                RAISE NOTICE 'Update failed for id: % - Error: %', v_id, SQLERRM;
            END;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'inserted', v_inserted_count,
        'updated', v_updated_count,
        'failed', v_failed_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
