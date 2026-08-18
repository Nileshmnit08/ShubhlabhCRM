-- SPRINT 17: Owner Assignment Activity Logging Fix
-- This updates the trigger from Sprint 16 to synchronously create an activity_log
-- entry when an owner is assigned or reassigned, ensuring visibility in the UI.

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
    v_idempotency_key := NEW.id::TEXT || '_' || NEW.assigned_owner_id::TEXT || '_' || v_trigger_type || '_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT;

    -- Format the message body (Hindi Template)
    v_message_body := 'नमस्ते ' || v_owner_record.display_name || ', कृपया ' || NEW.display_name || ' पार्टी से भुगतान हेतु नियमित रूप से संपर्क बनाए रखें। समय-समय पर विनम्र और पेशेवर फॉलो-अप करने से भुगतान शीघ्र प्राप्त होने की संभावना बढ़ती है। कृपया इस पार्टी पर विशेष ध्यान दें।';

    -- 1. Insert into tracking table securely (using ON CONFLICT DO NOTHING to guarantee idempotency)
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

    -- 2. CREATE THE VISIBLE ACTIVITY LOG
    -- This ensures the UI instantly shows the assignment event regardless of WhatsApp delivery success.
    BEGIN
        INSERT INTO public.activity_logs (
            module, 
            action_type, 
            entity_type, 
            entity_id, 
            summary, 
            metadata
        ) VALUES (
            'Customers',
            CASE WHEN v_trigger_type = 'CREATE_ASSIGNMENT' THEN 'ASSIGNED' ELSE 'REASSIGNED' END,
            'crm_parties',
            NEW.id::TEXT,
            'Assigned owner: ' || v_owner_record.display_name,
            jsonb_build_object(
                'owner_id', NEW.assigned_owner_id,
                'whatsapp_status', v_delivery_status,
                'whatsapp_failure_reason', v_failure_reason
            )
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to log assignment activity: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
