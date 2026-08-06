/**
 * Verification script for meals table
 * Run with: node scripts/verify-meals.mjs
 */

import { createClient } from '@supabase/supabase-js';
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMealsTable() {
  console.log('🔍 Verifying meals table...\n');
  
  try {
    const { data: meals, error, count } = await supabase
      .from('meals')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error querying meals table:', error.message);
      console.log('\n⚠️  The meals table does not exist yet.');
      console.log('   The SQL migrations are ready in:');
      console.log('   - supabase/migrations/create_meals_table.sql');
      console.log('   - supabase/migrations/seed_meals_data.sql\n');
      return false;
    }
    
    console.log(`✅ Meals table exists with ${count} meals`);
    
    const { data: allMeals, error: fetchError } = await supabase
      .from('meals')
      .select('meal_slot, cuisine_type');
    
    if (fetchError) {
      console.error('❌ Error fetching meals:', fetchError.message);
      return false;
    }
    
    const slotCounts = allMeals.reduce((acc, meal) => {
      acc[meal.meal_slot] = (acc[meal.meal_slot] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📊 Meals by slot:');
    for (const [slot, count] of Object.entries(slotCounts)) {
      console.log(`   ${slot}: ${count}`);
    }
    
    const cuisineCounts = allMeals.reduce((acc, meal) => {
      acc[meal.cuisine_type] = (acc[meal.cuisine_type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n🍽️  Meals by cuisine:');
    for (const [cuisine, count] of Object.entries(cuisineCounts)) {
      console.log(`   ${cuisine}: ${count}`);
    }
    
    console.log('\n✓ Requirements validation:');
    const totalCount = count || 0;
    const hasAllSlots = ['breakfast', 'lunch', 'dinner', 'snack'].every(
      slot => slotCounts[slot] > 0
    );
    const cuisineTypeCount = Object.keys(cuisineCounts).length;
    
    console.log(`   ${totalCount >= 100 ? '✅' : '❌'} At least 100 meals (have ${totalCount})`);
    console.log(`   ${hasAllSlots ? '✅' : '❌'} All meal slots covered`);
    console.log(`   ${cuisineTypeCount >= 5 ? '✅' : '❌'} At least 5 cuisine types (have ${cuisineTypeCount})`);
    
    return totalCount >= 100 && hasAllSlots && cuisineTypeCount >= 5;
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return false;
  }
}

verifyMealsTable().then(success => {
  if (success) {
    console.log('\n🎉 All requirements met! Task 6 is complete.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Requirements not yet met.');
    process.exit(1);
  }
});
