const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://fwkjddflpzkowlawkmka.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const productsToInsert = [
  { category: 'Pallet', name: '8000' },
  { category: 'Pallet', name: 'Diamond' },
  { category: 'Pallet', name: 'Shubh Labh' },
  { category: 'Pallet', name: 'Gori' },
  { category: 'Pallet', name: 'Naman' },
  { category: 'Churi', name: 'Chana Churi' },
  { category: 'Churi', name: 'Makka Aata' },
  { category: 'Churi', name: 'Makka Daliya' },
  { category: 'Churi', name: 'Soya Churi' },
  { category: 'Mix', name: 'Dry Mix' },
  { category: 'Mix', name: 'Lapti Mix' },
  { category: 'Daliya', name: 'Makka Daliya' },
  { category: 'Daliya', name: 'Wheat Daliya' },
  { category: 'Feed', name: 'Mix - Lapti' },
  { category: 'Feed', name: 'Mix Pallet + Khal + Kakde' },
  { category: 'Feed', name: 'Mix Dry Powder' },
  { category: 'ByPass Protein', name: 'Bypass Pallet' },
  { category: 'ByPass Fat', name: 'ByPassFat' }
];

async function insertProducts() {
  console.log('Fetching existing products...');
  const { data: existing, error: fetchError } = await supabase.from('products').select('*');
  
  if (fetchError) {
    console.error('Error fetching existing products:', fetchError);
    return;
  }

  const toInsert = productsToInsert.map(p => ({
    name: p.name,
    category: p.category,
    active: true,
    unit_of_measure: 'Bags',
    bag_conversion_factor: 1.0
  })).filter(p => !existing.some(e => e.name === p.name && e.category === p.category));

  if (toInsert.length > 0) {
    console.log(`Inserting ${toInsert.length} products...`);
    const { data, error } = await supabase.from('products').insert(toInsert);
    if (error) {
      console.error('Error inserting:', error);
    } else {
      console.log('Inserted successfully!');
    }
  } else {
    console.log('No new products to insert.');
  }

  const toUpdate = existing.filter(e => productsToInsert.some(p => p.name === e.name && p.category === e.category && !e.active));
  if (toUpdate.length > 0) {
    console.log(`Updating ${toUpdate.length} products to active...`);
    for (const p of toUpdate) {
       await supabase.from('products').update({ active: true }).eq('id', p.id);
    }
  }

  const { data: finalData } = await supabase.from('products').select('id, name, category, active');
  fs.writeFileSync('SL-ORDER-09-FINAL-PRODUCTS.json', JSON.stringify(finalData, null, 2));
}

insertProducts();
