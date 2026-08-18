-- SPRINT 16: Owner WhatsApp Notification Logic
-- This schema introduces the tracking table and the backend trigger 
-- for dispatching WhatsApp notifications when an owner is assigned to a customer.

-- 1. Create the Notification Tracking Table
CREATE TABLE IF NOT EXISTS public.owner_whatsapp_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    customer_name_snapshot VARCHAR(255) NOT NULL,
    owner_id UUID REFERENCES public.app_users(id) ON DELETE CASCADE,
    owner_name_snapshot VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL, -- 'CREATE_ASSIGNMENT' or 'REASSIGNMENT'
    template_key VARCHAR(100) DEFAULT 'owner_followup_hindi',
    message_body TEXT,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    delivery_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, SENT, FAILED, SKIPPED
    failure_reason TEXT,
    provider_message_id VARCHAR(255),
    provider_response_json JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMPTZ
);

-- Index for querying pending notifications (if pulled via cron instead of webhook)
CREATE INDEX IF NOT EXISTS idx_owner_wa_notifs_status ON public.owner_whatsapp_notifications (delivery_status);

-- 2. Create the Trigger Function
CREATE OR REPLACE FUNCTION fn_queue_owner_whatsapp_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_owner_record RECORD;
    v_trigger_type VARCHAR(50);
    v_idempotency_key VARCHAR(255);
    v_message_body TEXT;
    v_delivery_status VARCHAR(50) := 'PENDING';
    v_failure_reason TEXT := NULL;
BEGIN
    -- Determine trigger type and skip if no relevant owner change occurred
    IF TG_OP = 'INSERT' THEN
        IF NEW.assigned_owner_id IS NOT NULL THEN
            v_trigger_type := 'CREATE_ASSIGNMENT';
        ELSE
            RETURN NEW; -- No owner assigned on creation
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only trigger if owner changed to a non-null value
        IF NEW.assigned_owner_id IS DISTINCT FROM OLD.assigned_owner_id AND NEW.assigned_owner_id IS NOT NULL THEN
            v_trigger_type := 'REASSIGNMENT';
        ELSE
            RETURN NEW; -- No owner change or removed owner
        END IF;
    END IF;

    -- Fetch owner details
    SELECT display_name, whatsapp INTO v_owner_record 
    FROM public.app_users 
    WHERE id = NEW.assigned_owner_id;

    -- Check if owner has a WhatsApp number
    IF v_owner_record.whatsapp IS NULL OR v_owner_record.whatsapp = '' THEN
        v_delivery_status := 'SKIPPED';
        v_failure_reason := 'Owner has no WhatsApp number configured';
    END IF;

    -- Generate a deterministic idempotency key for this exact assignment event
    -- (using epoch time cast to prevent rapid dual-fires)
    v_idempotency_key := NEW.id::TEXT || '_' || NEW.assigned_owner_id::TEXT || '_' || v_trigger_type || '_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT;

    -- Format the message body (Hindi Template)
    v_message_body := 'नमस्ते ' || v_owner_record.display_name || ', कृपया ' || NEW.display_name || ' पार्टी से भुगतान हेतु नियमित रूप से संपर्क बनाए रखें। समय-समय पर विनम्र और पेशेवर फॉलो-अप करने से भुगतान शीघ्र प्राप्त होने की संभावना बढ़ती है। कृपया इस पार्टी पर विशेष ध्यान दें।';

    -- Insert into tracking table securely (using ON CONFLICT DO NOTHING to guarantee idempotency)
    BEGIN
        INSERT INTO public.owner_whatsapp_notifications (
            customer_id, 
            customer_name_snapshot, 
            owner_id, 
            owner_name_snapshot, 
            trigger_type, 
            message_body, 
            idempotency_key, 
            delivery_status,
            failure_reason
        ) VALUES (
            NEW.id,
            NEW.display_name,
            NEW.assigned_owner_id,
            v_owner_record.display_name,
            v_trigger_type,
            v_message_body,
            v_idempotency_key,
            v_delivery_status,
            v_failure_reason
        )
        ON CONFLICT (idempotency_key) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        -- Never fail the customer save due to a notification logging error
        RAISE WARNING 'Failed to queue WhatsApp notification: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Trigger to crm_parties
DROP TRIGGER IF EXISTS trg_owner_whatsapp_notification ON public.crm_parties;
CREATE TRIGGER trg_owner_whatsapp_notification
AFTER INSERT OR UPDATE ON public.crm_parties
FOR EACH ROW
EXECUTE FUNCTION fn_queue_owner_whatsapp_notification();
