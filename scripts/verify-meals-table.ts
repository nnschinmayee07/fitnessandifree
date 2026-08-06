/**
 * Verification script for meals table
 * 
 * This script checks if the meals table exists and has the expected data.
 * Run with: npx tsx scripts/verify-meals-table.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMealsTable() {
  console.log('🔍 Verifying meals table...\n');
  
  try {
    // Check if table exists and count meals
    const { data: meals, error, count } = await supabase
      .from('meals')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error querying meals table:', error.message);
      console.log('\n⚠️  The meals table may not exist yet.');
      console.log('   Please run the SQL migrations in Supabase SQL Editor:');
      console.log('   1. supabase/migrations/create_meals_table.sql');
      console.log('   2. supabase/migrations/seed_meals_data.sql');
      return false;
    }
    
    console.log(`✅ Meals table exists with ${count} meals`);
    
    // Check meal counts by slot
    const { data: slotCounts, error: slotError } = await supabase
      .from('meals')
      .select('meal_slot')
      .then(res => {
        if (res.error) throw res.error;
        const counts = res.data.reduce((acc: any, meal: any) => {
          acc[meal.meal_slot] = (acc[meal.meal_slot] || 0) + 1;
          return acc;
        }, {});
        return { data: counts, error: null };
      });
    
    if (slotError) {
      console.error('❌ Error getting meal slot counts:', slotError.message);
      return false;
    }
    
    console.log('\n📊 Meals by slot:');
    for (const [slot, count] of Object.entries(slotCounts || {})) {
      console.log(`   ${slot}: ${count}`);
    }
    
    // Check cuisine types
    const { data: cuisineCounts, error: cuisineError } = await supabase
      .from('meals')
      .select('cuisine_type')
      .then(res => {
        if (res.error) throw res.error;
        const counts = res.data.reduce((acc: any, meal: any) => {
          acc[meal.cuisine_type] = (acc[meal.cuisine_type] || 0) + 1;
          return acc;
        }, {});
        return { data: counts, error: null };
      });
    
    if (cuisineError) {
      console.error('❌ Error getting cuisine counts:', cuisineError.message);
      return false;
    }
    
    console.log('\n🍽️  Meals by cuisine:');
    for (const [cuisine, count] of Object.entries(cuisineCounts || {})) {
      console.log(`   ${cuisine}: ${count}`);
    }
    
    // Validate requirements
    console.log('\n✓ Requirements validation:');
    const totalCount = count || 0;
    const hasAllSlots = ['breakfast', 'lunch', 'dinner', 'snack'].every(
      slot => (slotCounts as any)?.[slot] > 0
    );
    const cuisineTypeCount = Object.keys(cuisineCounts || {}).length;
    
    console.log(`   ${totalCount >= 100 ? '✅' : '❌'} At least 100 meals (have ${totalCount})`);
    console.log(`   ${hasAllSlots ? '✅' : '❌'} All meal slots covered (breakfast/lunch/dinner/snack)`);
    console.log(`   ${cuisineTypeCount >= 5 ? '✅' : '❌'} At least 5 cuisine types (have ${cuisineTypeCount})`);
    
    return totalCount >= 100 && hasAllSlots && cuisineTypeCount >= 5;
    
  } catch (err: any) {
    console.error('❌ Unexpected error:', err.message);
    return false;
  }
}

verifyMealsTable().then(success => {
  if (success) {
    console.log('\n🎉 All requirements met!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some requirements not met. Please check the output above.');
    process.exit(1);
  }
});
