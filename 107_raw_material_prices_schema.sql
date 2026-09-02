-- Migration: 107_raw_material_prices_schema.sql
-- Description: Adds schema and seed data for the Raw Material Prices module.

-- Enable UUID extension if not enabled (usually enabled in 01_sprint_1_schema, but ensuring here)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. raw_materials
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en VARCHAR(255) NOT NULL,
    name_hi VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    category VARCHAR(100),
    default_unit VARCHAR(50) DEFAULT 'Quintal',
    default_price_type VARCHAR(50) DEFAULT 'Delivered',
    daily_tracking_required BOOLEAN DEFAULT true,
    active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. material_quality_grades
CREATE TABLE IF NOT EXISTS public.material_quality_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_material_id UUID REFERENCES public.raw_materials(id) ON DELETE CASCADE,
    grade_name VARCHAR(255) NOT NULL,
    grade_name_hi VARCHAR(255),
    specification TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. brokers
CREATE TABLE IF NOT EXISTS public.brokers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_name VARCHAR(255) NOT NULL,
    firm_name VARCHAR(255),
    mobile VARCHAR(50),
    whatsapp_number VARCHAR(50),
    market_location VARCHAR(255),
    state VARCHAR(100),
    active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. broker_materials
CREATE TABLE IF NOT EXISTS public.broker_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID REFERENCES public.brokers(id) ON DELETE CASCADE,
    raw_material_id UUID REFERENCES public.raw_materials(id) ON DELETE CASCADE,
    UNIQUE(broker_id, raw_material_id)
);

-- 5. raw_material_price_entries
CREATE TABLE IF NOT EXISTS public.raw_material_price_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    raw_material_id UUID REFERENCES public.raw_materials(id),
    quality_grade_id UUID REFERENCES public.material_quality_grades(id),
    quality_description TEXT,
    broker_id UUID REFERENCES public.brokers(id),
    market_location VARCHAR(255),
    state VARCHAR(100),
    price NUMERIC(12, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    price_type VARCHAR(50) NOT NULL,
    gst_included BOOLEAN DEFAULT false,
    freight_included BOOLEAN DEFAULT false,
    minimum_quantity NUMERIC(10, 2),
    valid_till TIMESTAMP WITH TIME ZONE,
    source VARCHAR(100),
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_raw_material_price_entries_date ON public.raw_material_price_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_raw_material_price_entries_material ON public.raw_material_price_entries(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_raw_material_price_entries_broker ON public.raw_material_price_entries(broker_id);

-- 6. whatsapp_price_reports
CREATE TABLE IF NOT EXISTS public.whatsapp_price_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    language VARCHAR(10) DEFAULT 'hi',
    selection_method VARCHAR(50) DEFAULT 'latest',
    message_content TEXT,
    status VARCHAR(50) DEFAULT 'Draft',
    generated_by UUID,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_by UUID,
    sent_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- 7. whatsapp_price_report_recipients
CREATE TABLE IF NOT EXISTS public.whatsapp_price_report_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES public.whatsapp_price_reports(id) ON DELETE CASCADE,
    recipient_name VARCHAR(255),
    recipient_number VARCHAR(50),
    delivery_status VARCHAR(50),
    sent_at TIMESTAMP WITH TIME ZONE
);

-- 8. raw_material_price_settings
CREATE TABLE IF NOT EXISTS public.raw_material_price_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    whatsapp_reminder_time TIME DEFAULT '18:00:00',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    alert_threshold_percentage NUMERIC(5,2) DEFAULT 3.00,
    default_selection_method VARCHAR(50) DEFAULT 'latest',
    show_broker_in_report BOOLEAN DEFAULT false,
    show_previous_day_change BOOLEAN DEFAULT true,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initialize default settings
INSERT INTO public.raw_material_price_settings (id) VALUES (uuid_generate_v4()) ON CONFLICT DO NOTHING;

-- 9. raw_material_price_audit_logs
CREATE TABLE IF NOT EXISTS public.raw_material_price_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(100),
    entity_id UUID,
    action VARCHAR(50),
    old_data JSONB,
    new_data JSONB,
    performed_by UUID,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add update triggers (using existing update_modified_column function)
DROP TRIGGER IF EXISTS update_raw_materials_modtime ON public.raw_materials;
CREATE TRIGGER update_raw_materials_modtime BEFORE UPDATE ON public.raw_materials FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_material_quality_grades_modtime ON public.material_quality_grades;
CREATE TRIGGER update_material_quality_grades_modtime BEFORE UPDATE ON public.material_quality_grades FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_brokers_modtime ON public.brokers;
CREATE TRIGGER update_brokers_modtime BEFORE UPDATE ON public.brokers FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_raw_material_price_entries_modtime ON public.raw_material_price_entries;
CREATE TRIGGER update_raw_material_price_entries_modtime BEFORE UPDATE ON public.raw_material_price_entries FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_raw_material_price_settings_modtime ON public.raw_material_price_settings;
CREATE TRIGGER update_raw_material_price_settings_modtime BEFORE UPDATE ON public.raw_material_price_settings FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable RLS for all new tables (matching Sprint 1 open style for development)
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_quality_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_material_price_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_price_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_price_report_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_material_price_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_material_price_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on raw_materials') THEN
        CREATE POLICY "Allow all on raw_materials" ON public.raw_materials FOR ALL USING (true) WITH CHECK (true);
        CREATE POLICY "Allow all on material_quality_grades" ON public.material_quality_grades FOR ALL USING (true) WITH CHECK (true);
        CREATE POLICY "Allow all on brokers" ON public.brokers FOR ALL USING (true) WITH CHECK (true);
        CREATE POLICY "Allow all on broker_materials" ON public.broker_materials FOR ALL USING (true) WITH CHECK (true);
        CREATE POLICY "Allow all on raw_material_price_entries" ON public.raw_material_price_entries FOR ALL USING (true) WITH CHECK (true);
        CREATE POLICY "Allow all on whatsapp_price_reports" ON public.whatsapp_price_reports FOR ALL USING (true) WITH CHECK (true);
        CREATE POLICY "Allow all on whatsapp_price_report_recipients" ON public.whatsapp_price_report_recipients FOR ALL USING (true) WITH CHECK (true);
        CREATE POLICY "Allow all on raw_material_price_settings" ON public.raw_material_price_settings FOR ALL USING (true) WITH CHECK (true);
        CREATE POLICY "Allow all on raw_material_price_audit_logs" ON public.raw_material_price_audit_logs FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ==========================================
-- SEED DATA
-- ==========================================

-- Seed Raw Materials
INSERT INTO public.raw_materials (id, name_en, name_hi, code, category, display_order)
VALUES 
    ('d2b51347-1946-4e5a-ab3a-966fc29b71f0', 'Maize', 'मक्का', 'RM-001', 'Grains', 1),
    ('c48d4c79-e3fa-4a69-95e2-225f6e8c8b1a', 'Bajra', 'बाजरा', 'RM-002', 'Grains', 2),
    ('a81e3a6c-59bc-4889-8d8a-6b8f36c53e01', 'Barley', 'जौ', 'RM-003', 'Grains', 3),
    ('7154563a-8687-4d9f-a4bc-fbdf6a2a0ebc', 'Wheat Bran', 'गेहूं चोकर', 'RM-004', 'Brans', 4),
    ('3a2c4d98-17a4-4f51-b847-f32df36b418a', 'Rice Bran', 'राइस ब्रान', 'RM-005', 'Brans', 5),
    ('90680d22-1d54-4a41-8bf4-6cc5c2dcbb04', 'De-oiled Rice Bran', 'डी-ऑयल्ड राइस ब्रान', 'RM-006', 'De-oiled Cakes', 6),
    ('e6c8e3cc-7294-4d83-8a39-39f50bc1295b', 'Soybean Meal', 'सोया डी-ऑयल्ड केक', 'RM-007', 'Oil Cakes', 7),
    ('1126786c-ec44-48f8-b3f7-925be023158c', 'Groundnut Oil Cake', 'मूंगफली खली', 'RM-008', 'Oil Cakes', 8),
    ('fcb61fa4-ec3c-449e-b2d2-817ab3275267', 'Mustard Oil Cake', 'सरसों खली', 'RM-009', 'Oil Cakes', 9),
    ('5c9e13d9-a36c-4869-9a25-2e6fca78d2b7', 'Cottonseed Oil Cake', 'बिनौला खली', 'RM-010', 'Oil Cakes', 10),
    ('b3ab2e7b-eb63-424a-9eb4-6c39f015b6d7', 'Guar Korma', 'ग्वार कोरमा', 'RM-011', 'Protein Sources', 11),
    ('f9f6d4ea-f6c1-4b13-8cf4-2c70d4bc9a7a', 'Molasses', 'शीरा', 'RM-012', 'Liquid Additives', 12),
    ('3d8c5bb7-827c-4033-91ec-893f47d4e5f2', 'Mineral Mixture', 'मिनरल मिक्सचर', 'RM-013', 'Minerals', 13),
    ('97b39ea3-a8d9-43c3-b788-b26a635df027', 'Salt', 'नमक', 'RM-014', 'Minerals', 14),
    ('d19b4fcb-bc1e-450f-a359-22a45a34ec8d', 'DCP', 'डीसीपी', 'RM-015', 'Minerals', 15)
ON CONFLICT (id) DO NOTHING;

-- Seed Quality Grades (For some materials)
INSERT INTO public.material_quality_grades (id, raw_material_id, grade_name, grade_name_hi, specification)
VALUES
    ('4b92c4cd-f268-45b4-ae62-c16e7887588a', 'd2b51347-1946-4e5a-ab3a-966fc29b71f0', 'Clean, Moisture <14%', 'साफ माल, नमी 14% तक', 'Premium quality maize'),
    ('8574d717-b7f5-4dc7-ba8e-c9060ab60f64', 'e6c8e3cc-7294-4d83-8a39-39f50bc1295b', 'Protein 46%', 'प्रोटीन 46%', 'Standard Soybean Meal'),
    ('34d4a8e6-12a8-42f5-b6d8-659f8166d1f9', 'fcb61fa4-ec3c-449e-b2d2-817ab3275267', 'Oil 7-8%', 'तेल 7-8%', 'Mustard Cake')
ON CONFLICT (id) DO NOTHING;

-- Seed Brokers
INSERT INTO public.brokers (id, broker_name, firm_name, mobile, market_location, state)
VALUES
    ('a97dc6bf-01ab-431f-bc87-d4fc99db4b86', 'Ramesh Agarwal', 'Agarwal Trading Co.', '9876543210', 'Jaipur', 'Rajasthan'),
    ('f9c4db9a-d345-424d-b94f-a88fc23f4f10', 'Suresh Kumar', 'Kumar & Sons Brokers', '9988776655', 'Indore', 'Madhya Pradesh'),
    ('b3f1c9ad-ea4b-483d-8153-a5c9f9d784bb', 'Vikas Jain', 'Jain Enterprises', '9812345678', 'Delhi', 'Delhi'),
    ('d46a89ef-650a-4933-9428-1b2c3d4e5f60', 'Manoj Sharma', 'Sharma Commodities', '9123456789', 'Kanpur', 'Uttar Pradesh'),
    ('e9ab34dc-7650-4122-b5e2-6f3ab1cd5e9a', 'Rajesh Patel', 'Patel Agro', '9012345678', 'Ahmedabad', 'Gujarat')
ON CONFLICT (id) DO NOTHING;

-- Seed dummy price records for the last year
DO $$
DECLARE
    curr_date DATE;
    rm_id UUID;
    broker_id UUID;
    base_price NUMERIC;
    daily_price NUMERIC;
BEGIN
    curr_date := CURRENT_DATE - INTERVAL '365 days';
    
    WHILE curr_date <= CURRENT_DATE LOOP
        -- Skip some Sundays just to have realistic missing data
        IF EXTRACT(DOW FROM curr_date) != 0 THEN
            
            -- Maize by Ramesh
            base_price := 2300 + (sin(EXTRACT(DOY FROM curr_date) * 0.05) * 200); -- Seasonal sine wave
            daily_price := base_price + (random() * 50 - 25); -- Random daily noise
            INSERT INTO public.raw_material_price_entries (entry_date, raw_material_id, quality_grade_id, broker_id, market_location, state, price, unit, price_type)
            VALUES (curr_date, 'd2b51347-1946-4e5a-ab3a-966fc29b71f0', '4b92c4cd-f268-45b4-ae62-c16e7887588a', 'a97dc6bf-01ab-431f-bc87-d4fc99db4b86', 'Jaipur', 'Rajasthan', round(daily_price, 2), 'Quintal', 'Delivered');

            -- Soybean Meal by Suresh
            base_price := 4000 + (cos(EXTRACT(DOY FROM curr_date) * 0.03) * 400); 
            daily_price := base_price + (random() * 100 - 50); 
            INSERT INTO public.raw_material_price_entries (entry_date, raw_material_id, quality_grade_id, broker_id, market_location, state, price, unit, price_type)
            VALUES (curr_date, 'e6c8e3cc-7294-4d83-8a39-39f50bc1295b', '8574d717-b7f5-4dc7-ba8e-c9060ab60f64', 'f9c4db9a-d345-424d-b94f-a88fc23f4f10', 'Indore', 'Madhya Pradesh', round(daily_price, 2), 'Quintal', 'Ex-mandi');

            -- Wheat Bran by Vikas
            base_price := 1800 + (sin(EXTRACT(DOY FROM curr_date) * 0.06) * 150); 
            daily_price := base_price + (random() * 40 - 20); 
            INSERT INTO public.raw_material_price_entries (entry_date, raw_material_id, broker_id, market_location, state, price, unit, price_type)
            VALUES (curr_date, '7154563a-8687-4d9f-a4bc-fbdf6a2a0ebc', 'b3f1c9ad-ea4b-483d-8153-a5c9f9d784bb', 'Delhi', 'Delhi', round(daily_price, 2), 'Quintal', 'Delivered');

        END IF;
        
        curr_date := curr_date + INTERVAL '1 day';
    END LOOP;
END $$;
