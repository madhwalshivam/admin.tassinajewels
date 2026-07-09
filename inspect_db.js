const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://swsuqdnwehrdsriyzmkk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3c3VxZG53ZWhyZHNyaXl6bWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MDQ5OTYsImV4cCI6MjA5ODk4MDk5Nn0.ykaP_QfX0RdSEwuhlXRcUZNWnOcUAWso_NSqQMQ0eZU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== CATEGORIES ===");
  const cats = await supabase.from('categories').select('*');
  console.log(JSON.stringify(cats.data, null, 2));

  console.log("=== PRODUCTS ===");
  const prods = await supabase.from('products').select('*');
  console.log(JSON.stringify(prods.data, null, 2));

  console.log("=== SETTINGS ===");
  const settings = await supabase.from('storefront_settings').select('*');
  console.log(JSON.stringify(settings.data, null, 2));
}

main();
