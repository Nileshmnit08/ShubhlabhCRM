ALTER TABLE public.transporter_metadata 
ADD COLUMN IF NOT EXISTS contact_number VARCHAR(100);
