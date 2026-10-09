const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envStr = fs.readFileSync('D:/ShubhLabhCRM/shubhlabh-order/.env', 'utf-8');
const urlMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk1NDg2OSwiZXhwIjoyMTAyNTMwODY5fQ.FYHMjv5x4X3uxV0A6n5N2dqoYB1pNkK72Zn881f13iw';

const supabase = createClient(urlMatch[1].trim(), SERVICE_ROLE_KEY);

async function testPublish() {
  // 1. Get raw material "Khal"
  const { data: rm } = await supabase.from('raw_materials').select('id, name_en').eq('name_en', 'Khal').single();
  console.log("Material:", rm);

  // 2. Publish price for today
  const effectiveDate = new Date().toISOString().split('T')[0];
  const payload = {
    raw_material_id: rm.id,
    price: 1850.50,
    unit: 'Quintal',
    effective_date: effectiveDate,
    is_published: true,
    remarks: 'Test sprint publish'
  };

  const { data: insertData, error: insertError } = await supabase.from('customer_published_prices').insert(payload).select();
  console.log("Insert result:", insertError || insertData);

  // 3. Query exactly as Buyer App does
  let query = supabase
    .from('customer_published_prices')
    .select('id, raw_material_id, price, effective_date, unit, created_at')
    .in('raw_material_id', [rm.id])
    .eq('is_published', true)
    .order('effective_date', { ascending: false })
    .order('created_at', { ascending: false });

  const d = new Date();
  d.setDate(d.getDate() - 7); // week
  query = query.gte('effective_date', d.toISOString().split('T')[0]);

  const { data: priceData, error: priceError } = await query.limit(500);
  console.log("Buyer app query result:", priceError || priceData);
}

testPublish();
