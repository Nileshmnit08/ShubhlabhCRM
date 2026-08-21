-- MICRO-SPRINT 14.2: WHATSAPP TEMPLATE ENGINE
-- Create controlled reusable WhatsApp templates

CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    purpose VARCHAR(100) NOT NULL,
    body TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    variables JSONB DEFAULT '[]'::jsonb, -- e.g. ["customer_name", "salesperson_name"]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_whatsapp_templates_modtime ON public.whatsapp_templates;
CREATE TRIGGER update_whatsapp_templates_modtime
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated to read active templates" ON public.whatsapp_templates 
FOR SELECT TO authenticated 
USING (is_active = true OR EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'Admin'));

CREATE POLICY "Allow admin to manage templates" ON public.whatsapp_templates 
FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'Admin')) 
WITH CHECK (EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'Admin'));

-- Seed defaults
INSERT INTO public.whatsapp_templates (name, purpose, body, variables) VALUES
('General Check-in', 'General Check-in', 'Hello {{customer_name}}, just checking in to see how everything is going with your recent feed supply.', '["customer_name"]'::jsonb),
('Payment Reminder', 'Payment Reminder', 'Hello {{customer_name}}, this is a gentle reminder regarding the outstanding payment. Please let us know when it can be cleared.', '["customer_name"]'::jsonb),
('Requirement Check', 'Requirement Check', 'Hello {{customer_name}}, do you have any upcoming feed requirements for this week?', '["customer_name"]'::jsonb),
('Custom', 'Custom', '', '[]'::jsonb);
