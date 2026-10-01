-- SPRINT: Fix Staff New Order → Admin Notification
-- Migration: 153_sprint_order_created_notification.sql
-- Generates ORDER_CREATED notification when an order is created in requirements table

-- 1. Ensure created_by column exists on public.requirements
ALTER TABLE public.requirements
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. Trigger function to notify all active Admins when a new Order is created
CREATE OR REPLACE FUNCTION public.fn_notify_admin_on_order_created()
RETURNS TRIGGER AS $$
DECLARE
    admin_rec RECORD;
    v_creator_name TEXT;
    v_creator_id UUID;
    v_customer_name TEXT;
    v_order_ref TEXT;
    v_created_time TEXT;
    v_already_notified BOOLEAN;
BEGIN
    -- Duplicate protection check
    SELECT EXISTS (
        SELECT 1 FROM public.crm_notifications 
        WHERE entity_type = 'order' 
          AND entity_id = NEW.id 
          AND notification_type = 'ORDER_CREATED'
    ) INTO v_already_notified;

    IF v_already_notified THEN
        RETURN NEW;
    END IF;

    -- Resolve creator ID: prioritize created_by, then assigned_to, then auth.uid()
    v_creator_id := COALESCE(NEW.created_by, NEW.assigned_to, auth.uid());

    -- Resolve creator name from app_users
    IF v_creator_id IS NOT NULL THEN
        SELECT COALESCE(display_name, email, 'Staff') INTO v_creator_name 
        FROM public.app_users 
        WHERE id = v_creator_id;
    END IF;

    IF v_creator_name IS NULL OR v_creator_name = '' THEN
        v_creator_name := 'Staff';
    END IF;

    -- Resolve customer name from crm_parties
    IF NEW.party_id IS NOT NULL THEN
        SELECT COALESCE(display_name, 'Customer') INTO v_customer_name
        FROM public.crm_parties
        WHERE id = NEW.party_id;
    END IF;

    IF v_customer_name IS NULL OR v_customer_name = '' THEN
        v_customer_name := 'Customer';
    END IF;

    -- Format order reference (using demand_ref or short UUID)
    v_order_ref := COALESCE(NEW.demand_ref, 'Order #' || UPPER(SUBSTRING(NEW.id::text, 1, 8)));

    -- Format creation timestamp
    v_created_time := to_char(COALESCE(NEW.created_at, NOW()), 'DD Mon YYYY, HH:MI AM');

    -- Insert notification for all active Admin users
    FOR admin_rec IN 
        SELECT id FROM public.app_users 
        WHERE role = 'Admin' AND (is_active IS NULL OR is_active = true)
    LOOP
        INSERT INTO public.crm_notifications (
            user_id,
            party_id,
            entity_type,
            entity_id,
            notification_type,
            title,
            message,
            link_url,
            is_read,
            created_at
        ) VALUES (
            admin_rec.id,
            NEW.party_id,
            'order',
            NEW.id,
            'ORDER_CREATED',
            '🔔 New Order',
            v_order_ref || ' created by ' || v_creator_name || E'\nCustomer: ' || v_customer_name || E'\nCreated: ' || v_created_time,
            '/requirements/' || NEW.id,
            false,
            NOW()
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to public.requirements AFTER INSERT
DROP TRIGGER IF EXISTS trg_notify_admin_on_order_created ON public.requirements;
CREATE TRIGGER trg_notify_admin_on_order_created
AFTER INSERT ON public.requirements
FOR EACH ROW
EXECUTE FUNCTION public.fn_notify_admin_on_order_created();
