-- Migration: 96_sprint_23_dealer_growth_hub.sql
-- Pivot to Dealer Growth Hub

-- 1. communication_templates
CREATE TABLE IF NOT EXISTS public.communication_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    language VARCHAR(50) DEFAULT 'Hindi',
    variables JSONB,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial Hindi templates
INSERT INTO public.communication_templates (name, content, language) VALUES
('Near Target', 'नमस्ते {{dealer_name}} जी,\nआप {{target_period}} के लक्ष्य के बहुत करीब हैं।\nलक्ष्य: ₹{{target_value}}\nवर्तमान उपलब्धि: ₹{{achievement_value}} ({{achievement_percentage}}%)\nशेष लक्ष्य: ₹{{balance_needed}}\nअंतिम तिथि: {{target_end_date}} (केवल {{days_left}} दिन शेष)\n\n{{scheme_name}} योजना के अंतर्गत अगला लाभ: {{next_reward}}\n\nकृपया शेष लक्ष्य पूरा करने के लिए अपना अगला ऑर्डर जल्द प्लान करें। स्टॉक या ऑर्डर सहायता के लिए {{salesperson_name}} से संपर्क करें: {{salesperson_phone}}।\n\nधन्यवाद,\n{{company_name}}', 'Hindi'),
('One Slab Away', 'नमस्ते {{dealer_name}} जी,\nआप {{scheme_name}} के अगले लाभ स्तर के बहुत करीब हैं।\nवर्तमान उपलब्धि: ₹{{achievement_value}}\nअगला लाभ पाने के लिए आवश्यक शेष खरीद: ₹{{balance_needed}}\nलाभ: {{next_reward}}\nयोजना की अंतिम तिथि: {{target_end_date}}\n\nयह अवसर न चूकें। ऑर्डर सहायता के लिए {{salesperson_name}} से संपर्क करें: {{salesperson_phone}}।\n\nधन्यवाद,\n{{company_name}}', 'Hindi'),
('Target Achieved', 'बधाई हो {{dealer_name}} जी! 🎉\nआपने {{target_period}} का लक्ष्य सफलतापूर्वक प्राप्त कर लिया है।\nलक्ष्य: ₹{{target_value}}\nआपकी उपलब्धि: ₹{{achievement_value}} ({{achievement_percentage}}%)\n\n{{scheme_name}} के अंतर्गत आपका संभावित लाभ: {{next_reward}}।\n\nहम आपके निरंतर सहयोग के लिए धन्यवाद देते हैं। अंतिम लाभ/रिवॉर्ड पात्रता कंपनी के नियमों एवं भुगतान स्थिति के अनुसार सत्यापित की जाएगी।\n\nसादर,\n{{company_name}}', 'Hindi'),
('Target At Risk', 'नमस्ते {{dealer_name}} जी,\n{{target_period}} लक्ष्य की अंतिम तिथि {{target_end_date}} है और केवल {{days_left}} दिन शेष हैं।\nलक्ष्य: ₹{{target_value}}\nवर्तमान उपलब्धि: ₹{{achievement_value}}\nशेष लक्ष्य: ₹{{balance_needed}}\n\nहम आपको लक्ष्य पूरा करने में पूरा सहयोग देना चाहते हैं। कृपया आवश्यक स्टॉक, उत्पाद सुझाव या ऑर्डर प्लानिंग के लिए {{salesperson_name}} से तुरंत संपर्क करें: {{salesperson_phone}}।\n\nधन्यवाद,\n{{company_name}}', 'Hindi'),
('No Recent Activity', 'नमस्ते {{dealer_name}} जी,\nहमें पिछले कुछ दिनों में आपकी ऑर्डर गतिविधि दिखाई नहीं दी है, जबकि {{target_period}} लक्ष्य की अंतिम तिथि {{target_end_date}} है।\nवर्तमान उपलब्धि: ₹{{achievement_value}}\nशेष लक्ष्य: ₹{{balance_needed}}\nशेष दिन: {{days_left}}\n\nकृपया अपनी आगामी आवश्यकता बताएं। स्टॉक और ऑर्डर सहायता के लिए {{salesperson_name}} से संपर्क करें: {{salesperson_phone}}।\n\nधन्यवाद,\n{{company_name}}', 'Hindi'),
('Reward Points Update', 'नमस्ते {{dealer_name}} जी,\n{{scheme_name}} योजना के अंतर्गत आपके वर्तमान रिवॉर्ड पॉइंट्स: {{reward_points}}।\nअपना अगला लाभ प्राप्त करने के लिए लक्ष्य एवं योजना प्रगति की जानकारी के लिए {{salesperson_name}} से संपर्क करें: {{salesperson_phone}}।\n\nधन्यवाद,\n{{company_name}}', 'Hindi')
ON CONFLICT DO NOTHING;

-- 2. dealer_scheme_slabs
CREATE TABLE IF NOT EXISTS public.dealer_scheme_slabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID REFERENCES public.dealer_schemes(id) ON DELETE CASCADE,
    slab_name VARCHAR(100) NOT NULL,
    threshold_value NUMERIC(15,2) NOT NULL,
    reward_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. dealer_targets
CREATE TABLE IF NOT EXISTS public.dealer_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    scheme_id UUID REFERENCES public.dealer_schemes(id) ON DELETE SET NULL,
    target_period VARCHAR(100),
    target_end_date DATE,
    target_value NUMERIC(15,2) NOT NULL DEFAULT 0,
    achievement_value NUMERIC(15,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Active', -- Active, Achieved, Missed, Cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. dealer_target_revisions
CREATE TABLE IF NOT EXISTS public.dealer_target_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id UUID REFERENCES public.dealer_targets(id) ON DELETE CASCADE,
    old_value NUMERIC(15,2),
    new_value NUMERIC(15,2),
    reason TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. dealer_target_alerts
CREATE TABLE IF NOT EXISTS public.dealer_target_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    target_id UUID REFERENCES public.dealer_targets(id) ON DELETE CASCADE,
    alert_type VARCHAR(100), -- Closing Soon, One Slab Away, At Risk, Achieved, No Activity
    priority VARCHAR(50), -- Critical, High, Medium, Informational
    snooze_until TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'Active', -- Active, Reviewed, Snoozed, Dismissed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Rewards
CREATE TABLE IF NOT EXISTS public.dealer_reward_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    scheme_id UUID REFERENCES public.dealer_schemes(id) ON DELETE SET NULL,
    points NUMERIC(15,2),
    transaction_type VARCHAR(50), -- Earned, Redeemed, Expired
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dealer_reward_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    scheme_id UUID REFERENCES public.dealer_schemes(id) ON DELETE SET NULL,
    points_claimed NUMERIC(15,2),
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Approved, Rejected, Dispatched
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Communications
CREATE TABLE IF NOT EXISTS public.dealer_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    channel VARCHAR(50) DEFAULT 'WhatsApp',
    template_id UUID REFERENCES public.communication_templates(id) ON DELETE SET NULL,
    final_message TEXT,
    status VARCHAR(50) DEFAULT 'Sent', -- Draft, Sent, Delivered, Read, Failed
    linked_target_id UUID REFERENCES public.dealer_targets(id) ON DELETE SET NULL,
    linked_scheme_id UUID REFERENCES public.dealer_schemes(id) ON DELETE SET NULL,
    linked_alert_id UUID REFERENCES public.dealer_target_alerts(id) ON DELETE SET NULL,
    sent_by UUID REFERENCES auth.users(id),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- 8. Followups
CREATE TABLE IF NOT EXISTS public.dealer_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    reason TEXT,
    due_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'Pending',
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Audit Logs
CREATE TABLE IF NOT EXISTS public.dealer_program_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type VARCHAR(100),
    table_name VARCHAR(100),
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure is_dealer flag exists conceptually or via relationship_type
-- Usually we just use party_type or relationship_type in v_customer_master

-- 10. v_dealer_growth_hub View
CREATE OR REPLACE VIEW public.v_dealer_growth_hub WITH (security_invoker = true) AS
SELECT 
    cm.id AS customer_id,
    cm.display_name,
    cm.mobile,
    cm.city,
    cm.territory_name,
    cm.assigned_owner_id,
    cm.owner_name,
    
    (SELECT COUNT(*) FROM public.dealer_targets dt WHERE dt.customer_id = cm.id AND dt.status = 'Active') AS active_targets_count,
    (SELECT COUNT(*) FROM public.dealer_scheme_participations sp WHERE sp.party_id = cm.id AND sp.status = 'Enrolled') AS active_schemes_count,
    
    (SELECT MAX(created_at) FROM public.interactions i WHERE i.party_id = cm.id) AS last_engagement_date,
    
    (SELECT SUM(points) FROM public.dealer_reward_ledger rl WHERE rl.customer_id = cm.id AND rl.transaction_type = 'Earned') -
    COALESCE((SELECT SUM(points) FROM public.dealer_reward_ledger rl WHERE rl.customer_id = cm.id AND rl.transaction_type = 'Redeemed'), 0) AS current_reward_points,
    
    (SELECT COUNT(*) FROM public.dealer_reward_claims rc WHERE rc.customer_id = cm.id AND rc.status = 'Pending') AS pending_claims_count
    
FROM public.v_customer_master cm
WHERE cm.relationship_type = 'Dealer';

GRANT SELECT ON public.v_dealer_growth_hub TO authenticated;
