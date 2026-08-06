/**
 * Execute SQL migrations directly using fetch to Supabase PostgREST
 * This is a workaround since DDL cannot be executed via the standard client
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
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
const serviceKey = env.SUPABASE_SERVICE_KEY || '';

console.log('🚀 SQL Migration Executor for Meals Table\n');
console.log('Since the Supabase client cannot execute DDL (CREATE TABLE, etc.),');
console.log('you have two options:\n');

const projectId = supabaseUrl.split('//')[1].split('.')[0];
console.log('OPTION 1: Use Supabase Dashboard (Recommended)');
console.log('─'.repeat(80));
console.log(`1. Visit: https://app.supabase.com/project/${projectId}/sql`);
console.log('2. Click "New Query"');
console.log('3. Copy and paste the SQL from these files:');
console.log('   a) supabase/migrations/create_meals_table.sql');
console.log('   b) supabase/migrations/seed_meals_data.sql');
console.log('4. Click "Run" for each file\n');

console.log('OPTION 2: Use Supabase CLI (if installed)');
console.log('─'.repeat(80));
console.log('1. Install Supabase CLI: https://supabase.com/docs/guides/cli');
console.log('2. Link project: supabase link --project-ref ' + projectId);
console.log('3. Run: supabase db push\n');

console.log('═'.repeat(80));
console.log('SQL TO EXECUTE:');
console.log('═'.repeat(80));
console.log('\n');

const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
const files = ['create_meals_table.sql', 'seed_meals_data.sql'];

for (const file of files) {
  const content = readFileSync(join(migrationsDir, file), 'utf-8');
  console.log(`-- ${file}`);
  console.log('-- ' + '─'.repeat(76));
  console.log(content);
  console.log('\n');
}

console.log('═'.repeat(80));
console.log('\n✅ After running the SQL, verify with:');
console.log('   node scripts/verify-meals.mjs\n');
