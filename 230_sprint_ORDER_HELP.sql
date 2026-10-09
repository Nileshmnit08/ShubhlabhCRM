-- Phase 4: FAQ Knowledge Base for Help feature
CREATE TABLE IF NOT EXISTS public.help_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT NOT NULL,
    keywords TEXT,
    language TEXT DEFAULT 'en',
    active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

-- Phase 12: Buyer Security
-- Buyers can only SELECT active help articles
CREATE POLICY "Anyone can read active help articles"
ON public.help_articles
FOR SELECT
USING (active = true);

-- Phase 5: Standard FAQ Content
INSERT INTO public.help_articles (question, answer, category, keywords, language, priority, sort_order)
VALUES 
('How can I place an order?', 'Open New Order, select the products and quantities you need, review your order and confirm it.', 'Orders', 'order,place,new,create', 'en', 1, 1),
('How can I repeat my last order?', 'Open My Orders, select your previous order and use the reorder option.', 'Orders', 'repeat,last,reorder,again', 'en', 1, 2),
('Can I edit an order?', 'If the order is still eligible for editing, open the order details and select Edit Order.', 'Orders', 'edit,change,modify,update', 'en', 1, 3),
('Where is my order?', 'Open My Orders and select the order to view its current status.', 'Delivery', 'where,status,track,delivery', 'en', 1, 4),
('How can I see my current scheme?', 'Open the current Shubh Labh scheme/update available in the app.', 'Schemes', 'scheme,offer,discount,current', 'en', 1, 5),
('How can I change my delivery address?', 'Open your profile or the applicable delivery-address section and update the saved delivery address.', 'Account', 'address,delivery,change,update', 'en', 1, 6),
('How can I contact Shubh Labh?', 'You can contact Shubh Labh Support directly by calling 9461924461.', 'Support', 'contact,call,phone,support', 'en', 1, 7);
