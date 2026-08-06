"""
Create minimal test dataset for training pipeline testing.

This script creates a small synthetic dataset that mimics the structure
of the cleaned Food.com data, allowing us to test the training pipeline
without downloading the full dataset.
"""

import pandas as pd
import numpy as np
import os

def create_test_recipes(n=200):
    """Create synthetic recipe data for testing."""
    np.random.seed(42)
    
    cuisines = ['american', 'italian', 'mexican', 'chinese', 'indian']
    meal_slots = ['breakfast', 'lunch', 'dinner', 'snack']
    
    recipes = []
    for i in range(n):
        # Generate realistic nutritional values
        calories = np.random.randint(150, 800)
        protein_g = np.random.uniform(5, 50)
        carbs_g = np.random.uniform(10, 100)
        total_fat_g = np.random.uniform(5, 40)
        
        recipes.append({
            'id': i + 1,
            'name': f'Recipe_{i+1}',
            'cuisine_type': np.random.choice(cuisines),
            'meal_slot': np.random.choice(meal_slots),
            'calories': calories,
            'protein_g': round(protein_g, 1),
            'carbs_g': round(carbs_g, 1),
            'total_fat_g': round(total_fat_g, 1),
            'sugar_g': round(np.random.uniform(5, 30), 1),
            'sodium_mg': round(np.random.uniform(100, 1000), 1),
            'saturated_fat_g': round(total_fat_g * 0.3, 1),
            'tags': '[]',
            'ingredients': '[]',
            'nutrition': f'[{calories}, {total_fat_g}, 10, 500, {protein_g}, {total_fat_g*0.3}, {carbs_g}]'
        })
    
    return pd.DataFrame(recipes)

def main():
    """Create test data directory and files."""
    # Create data directory
    os.makedirs('./data', exist_ok=True)
    
    # Create test recipes
    print("Creating test recipe data...")
    recipes_df = create_test_recipes(n=200)
    
    # Save to CSV
    output_path = './data/RAW_recipes_cleaned.csv'
    recipes_df.to_csv(output_path, index=False)
    print(f"✓ Saved {len(recipes_df)} test recipes to {output_path}")
    
    # Create empty interactions file (not needed for basic training)
    interactions_df = pd.DataFrame({
        'user_id': [],
        'recipe_id': [],
        'rating': []
    })
    interactions_path = './data/RAW_interactions_cleaned.csv'
    interactions_df.to_csv(interactions_path, index=False)
    print(f"✓ Saved empty interactions file to {interactions_path}")
    
    print("\nTest data creation complete!")

if __name__ == '__main__':
    main()
