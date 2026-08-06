/**
 * Apply cuisine_preference migration to Supabase database
 * This script uses the Management API to execute the migration
 * Run with: node scripts/apply-cuisine-preference-migration.mjs
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createClient } from '@supabase/supabase-js';

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

// Read the migration file
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', 'add_cuisine_preference.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

console.log('🚀 Applying cuisine_preference migration to Supabase...\n');
console.log('Migration file:', migrationPath);
console.log('\nSQL to execute:');
console.log('─'.repeat(80));
console.log(migrationSQL);
console.log('─'.repeat(80));
console.log('\n');

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('⚠️  Note: Supabase JS client cannot execute DDL statements directly.');
    console.log('   You need to run this migration via the Supabase Dashboard.\n');
    
    const projectId = supabaseUrl.split('//')[1].split('.')[0];
    console.log('📋 Instructions:');
    console.log(`\n1. Open SQL Editor:`);
    console.log(`   https://app.supabase.com/project/${projectId}/sql\n`);
    console.log(`2. Click "New Query"\n`);
    console.log(`3. Copy and paste the SQL shown above\n`);
    console.log(`4. Click "Run" (or press Cmd+Enter)\n`);
    console.log(`5. Verify success: "Success. No rows returned"\n`);
    console.log(`6. Run verification: node scripts/verify-cuisine-preference.mjs\n`);
    
    console.log('═'.repeat(80));
    console.log('Alternative: Copy SQL to clipboard');
    console.log('═'.repeat(80));
    console.log('\nRun this command to copy SQL to clipboard:');
    console.log(`\npbcopy < ${migrationPath}`);
    console.log('\nThen paste directly in Supabase Dashboard.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
