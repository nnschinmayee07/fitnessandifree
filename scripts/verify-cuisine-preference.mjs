/**
 * Verify that cuisine_preference column exists in nutrition_profiles table
 * Run with: node scripts/verify-cuisine-preference.mjs
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

async function verifyColumn() {
  console.log('🔍 Verifying cuisine_preference column in nutrition_profiles table...\n');
  
  try {
    // Query the table schema via Supabase REST API
    const response = await fetch(
      `${supabaseUrl}/rest/v1/nutrition_profiles?select=cuisine_preference&limit=1`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    if (response.ok) {
      console.log('✅ SUCCESS: cuisine_preference column exists!');
      console.log('   The migration has been applied correctly.\n');
      
      const data = await response.json();
      if (data.length > 0) {
        console.log('📊 Sample data found:');
        console.log(`   cuisine_preference: ${data[0].cuisine_preference || 'NULL'}\n`);
      } else {
        console.log('ℹ️  No data in table yet (table is empty)\n');
      }
      
      return true;
    } else if (response.status === 400) {
      const error = await response.json();
      if (error.message && error.message.includes('cuisine_preference')) {
        console.log('❌ COLUMN DOES NOT EXIST');
        console.log('   The migration has NOT been applied yet.\n');
        console.log('🚀 To apply the migration:');
        console.log('   1. Open: https://app.supabase.com/project/osnnnvzuywfzhzhbcvha/sql');
        console.log('   2. Click "New Query"');
        console.log('   3. Copy contents of: supabase/migrations/add_cuisine_preference.sql');
        console.log('   4. Paste and click "Run"\n');
        return false;
      }
    }
    
    console.log(`⚠️  Unexpected response: ${response.status}`);
    console.log(await response.text());
    return false;
    
  } catch (error) {
    console.error('❌ Error verifying column:', error.message);
    return false;
  }
}

verifyColumn();
