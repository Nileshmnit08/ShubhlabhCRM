const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fwkjddflpzkowlawkmka.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProducts() {
  const { data: activeProducts, error: err1 } = await supabase.from('products').select('*').eq('active', true);
  const { data: allProducts, error: err2 } = await supabase.from('products').select('*');
  
  console.log("Active Products:", activeProducts?.length);
  console.log("All Products:", allProducts?.length);
  if (allProducts && allProducts.length > 0) {
     console.log("Sample product:", allProducts[0]);
  }
}

checkProducts();
