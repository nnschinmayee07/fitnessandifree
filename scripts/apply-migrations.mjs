/**
 * Apply SQL migrations to Supabase via REST API
 * Run with: node scripts/apply-migrations.mjs
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local file manually
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = env.SUPABASE_SERVICE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

async function executeSQL(sql) {
  // Try to execute SQL via Supabase's query endpoint
  // Note: This requires the database to have a function that can execute arbitrary SQL
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({ sql_query: sql })
  });

  return response;
}

async function applyMigrations() {
  console.log('🚀 Applying meals table migrations...\n');
  
  const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
  const migrations = [
    'create_meals_table.sql',
    'seed_meals_data.sql'
  ];
  
  console.log('⚠️  Note: Supabase client libraries cannot execute DDL statements directly.');
  console.log('   The migrations need to be run via the Supabase Dashboard.\n');
  
  const projectId = supabaseUrl.split('//')[1].split('.')[0];
  console.log('📋 To apply the migrations:');
  console.log(`\n1. Open: https://app.supabase.com/project/${projectId}/sql`);
  console.log('2. Click "New Query"');
  console.log('3. Copy and run each migration file:\n');
  
  for (const migrationFile of migrations) {
    const filePath = join(migrationsDir, migrationFile);
    console.log(`   📄 ${migrationFile}`);
    console.log(`      Path: ${filePath}\n`);
  }
  
  console.log('4. After running both files, verify with:');
  console.log('   node scripts/verify-meals.mjs\n');
  
  console.log('═'.repeat(80));
  console.log('Migration Files Content:');
  console.log('═'.repeat(80));
  console.log('\n');
  
  for (const migrationFile of migrations) {
    const filePath = join(migrationsDir, migrationFile);
    const sql = readFileSync(filePath, 'utf-8');
    
    console.log(`-- FILE: ${migrationFile}`);
    console.log('-- ' + '─'.repeat(76));
    console.log(sql);
    console.log('\n');
  }
}

applyMigrations();
