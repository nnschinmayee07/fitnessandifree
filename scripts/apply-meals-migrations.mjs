/**
 * Apply meals table migrations to Supabase
 * 
 * This script programmatically runs the SQL migrations for the meals table.
 * Run with: node scripts/apply-meals-migrations.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQL(sql) {
  // Since Supabase doesn't have a direct SQL execution endpoint without a custom function,
  // we need to execute the SQL statements manually.
  // For CREATE TABLE and INSERT statements, we'll need to use the REST API indirectly
  
  // Check if we can execute via a custom RPC function (if it exists)
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ sql_string: sql })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    return { success: true };
  } catch (err) {
    // exec_sql doesn't exist, return false so we can provide manual instructions
    return { success: false, error: err.message };
  }
}

async function applyMigrations() {
  console.log('🚀 Checking meals table setup...\n');
  
  // First, check if the table already exists and has data
  try {
    const { count, error } = await supabase
      .from('meals')
      .select('*', { count: 'exact', head: true });
    
    if (!error && count !== null && count > 0) {
      console.log(`ℹ️  Meals table already exists with ${count} meals`);
      console.log('   Skipping migrations (table already populated)\n');
      return true;
    }
  } catch (err) {
    // Table doesn't exist, continue with migrations
  }
  
  console.log('📋 Meals table needs to be created. Here are the migration instructions:\n');
  console.log('Since Supabase client libraries cannot execute DDL statements directly,');
  console.log('please run these SQL files manually in the Supabase Dashboard:\n');
  
  const projectId = supabaseUrl.split('//')[1].split('.')[0];
  console.log(`1. Go to: https://app.supabase.com/project/${projectId}/sql`);
  console.log('2. Click "New Query"');
  console.log('3. Run the following SQL files in order:\n');
  
  const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
  const migrations = [
    'create_meals_table.sql',
    'seed_meals_data.sql'
  ];
  
  for (const migrationFile of migrations) {
    const filePath = join(migrationsDir, migrationFile);
    console.log(`   📄 ${migrationFile}`);
    console.log(`      Location: ${filePath}`);
  }
  
  console.log('\n4. After running, verify with:');
  console.log('   node scripts/verify-meals-table.mjs\n');
  
  return false;
}

applyMigrations().then(alreadyExists => {
  if (alreadyExists) {
    console.log('✅ Meals table is ready!');
    console.log('\nYou can verify with:');
    console.log('  node scripts/verify-meals-table.mjs');
    process.exit(0);
  } else {
    console.log('⚠️  Manual migration required. See instructions above.');
    process.exit(0);
  }
});
