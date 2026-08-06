/**
 * Migration runner script for Supabase
 * 
 * This script prints the SQL commands that need to be run in Supabase SQL Editor.
 * 
 * Usage:
 *   node --loader ts-node/esm scripts/run-migrations.ts
 *   OR just read the SQL files and run them in Supabase Dashboard SQL Editor
 */

import { readFileSync } from 'fs';
import { join } from 'path';

console.log('📋 MEALS TABLE MIGRATION INSTRUCTIONS\n');
console.log('The meals table and seed data SQL files are ready.');
console.log('Please run these SQL files in your Supabase Dashboard:\n');
console.log('1. Go to https://app.supabase.com/project/<your-project>/sql');
console.log('2. Click "New Query"');
console.log('3. Copy and paste the SQL from each file below\n');

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const migrations = ['create_meals_table.sql', 'seed_meals_data.sql'];

for (const migration of migrations) {
  const filePath = join(migrationsDir, migration);
  const sql = readFileSync(filePath, 'utf-8');
  
  console.log('═'.repeat(80));
  console.log(`FILE: ${migration}`);
  console.log('═'.repeat(80));
  console.log(sql);
  console.log('\n');
}

console.log('✅ After running these SQL commands, you will have:');
console.log('   - A meals table with proper schema and constraints');
console.log('   - Indexes on meal_slot and cuisine_type');
console.log('   - 105 diverse meals (25 breakfast, 25 lunch, 30 dinner, 25 snack)');
console.log('   - 5 cuisine types (American, Italian, Mexican, Asian, Mediterranean)');
console.log('   - All macro nutrients validated as non-negative\n');
