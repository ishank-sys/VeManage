// Debug script to check available tables in Supabase
import { supabase } from './src/integrations/supabase/client.js';

async function checkTables() {
  console.log('Checking available tables...');
  
  // Try common table names
  const tableNames = ['Project', 'project', 'projects', 'Projects', 'Client', 'client', 'clients', 'Clients'];
  
  for (const tableName of tableNames) {
    try {
      console.log(`\nTrying table: ${tableName}`);
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (!error) {
        console.log(`✅ Table '${tableName}' exists!`);
        console.log('Sample data:', data);
      } else {
        console.log(`❌ Table '${tableName}' error:`, error.message);
      }
    } catch (err) {
      console.log(`❌ Table '${tableName}' failed:`, err.message);
    }
  }
}

checkTables();