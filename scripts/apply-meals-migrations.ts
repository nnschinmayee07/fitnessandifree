/**
 * Apply meals table migrations to Supabase
 * 
 * This script programmatically runs the SQL migrations for the meals table.
 * Run with: npx tsx scripts/apply-meals-migrations.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigrations() {
  console.log('🚀 Applying meals table migrations...\n');
  
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  const migrations = [
    'create_meals_table.sql',
    'seed_meals_data.sql'
  ];
  
  for (const migrationFile of migrations) {
    const filePath = join(migrationsDir, migrationFile);
    const sql = readFileSync(filePath, 'utf-8');
    
    console.log(`📄 Running ${migrationFile}...`);
    
    try {
      // Execute the SQL using the Supabase REST API
      const { error } = await supabase.rpc('exec_sql', { sql_string: sql });
      
      if (error) {
        // If exec_sql doesn't exist, we need to run it directly via the REST API
        // For tables creation, we can use the from() API with raw SQL
        throw new Error(`exec_sql not available: ${error.message}`);
      }
      
      console.log(`✅ ${migrationFile} completed successfully\n`);
    } catch (err: any) {
      console.error(`❌ Error running ${migrationFile}:`, err.message);
      console.log('\n⚠️  The SQL needs to be run manually in Supabase Dashboard:');
      console.log(`   1. Go to https://app.supabase.com/project/${supabaseUrl.split('//')[1].split('.')[0]}/sql`);
      console.log(`   2. Copy the SQL from: ${filePath}`);
      console.log(`   3. Paste and run it in the SQL Editor\n`);
      return false;
    }
  }
  
  return true;
}

applyMigrations().then(success => {
  if (success) {
    console.log('🎉 All migrations completed successfully!');
    console.log('\nNext step: Run verification script:');
    console.log('  npx tsx scripts/verify-meals-table.ts');
    process.exit(0);
  } else {
    process.exit(1);
  }
});
