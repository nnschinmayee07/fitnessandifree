#!/usr/bin/env python
"""
Standalone script to run the training pipeline.
This avoids the circular import issue when importing train.py as a module.
"""

import sys
import os

# Import all the necessary functions from train module
from train import (
    simulate_user_profiles,
    compute_tdee,
    compute_macro_targets,
    simulate_remaining_macros,
    simulate_cuisine_preference,
    simulate_meal_slot_request,
    engineer_features,
    create_training_pairs,
    evaluate_model,
    save_model_and_metadata
)

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
import lightgbm as lgb

def main():
    """
    Main training pipeline that orchestrates the complete workflow.
    
    Steps:
    1. Load cleaned recipe data from data_prep.py
    2. Generate synthetic user profiles
    3. Create training pairs with feature engineering
    4. Split into train/test sets
    5. Train LGBMRegressor model
    6. Evaluate model performance
    7. Save model and metadata
    """
    print("="*80)
    print("LightGBM Meal Ranker Training Pipeline")
    print("="*80)
    
    # Step 1: Load cleaned recipe data
    print("\n[Step 1/7] Loading cleaned recipe data...")
    recipes_path = './data/RAW_recipes_cleaned.csv'
    
    if not os.path.exists(recipes_path):
        print(f"ERROR: Cleaned recipes file not found at {recipes_path}")
        print("Please run data_prep.py first to prepare the dataset.")
        sys.exit(1)
    
    recipes_df = pd.read_csv(recipes_path)
    print(f"✓ Loaded {len(recipes_df)} recipes")
    
    # Step 2: Generate synthetic user profiles
    print("\n[Step 2/7] Generating synthetic user profiles...")
    n_users = 1000  # Start with 1000 users for reasonable training time
    synthetic_users = simulate_user_profiles(n=n_users)
    print(f"✓ Generated {len(synthetic_users)} synthetic users")
    
    # Step 3: Create training pairs
    print("\n[Step 3/7] Creating training pairs...")
    contexts_per_user = 5  # 5 different contexts per user
    X, y = create_training_pairs(recipes_df, synthetic_users, contexts_per_user)
    
    # Convert to numpy arrays
    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.float32)
    
    print(f"\n✓ Training data shape: X={X.shape}, y={y.shape}")
    
    # Step 4: Train/test split
    print("\n[Step 4/7] Splitting into train/test sets...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.1, random_state=42
    )
    print(f"✓ Train set: {len(X_train):,} samples")
    print(f"✓ Test set: {len(X_test):,} samples")
    
    # Step 5: Train LGBMRegressor
    print("\n[Step 5/7] Training LGBMRegressor...")
    print("Hyperparameters:")
    print("  n_estimators: 100")
    print("  learning_rate: 0.1")
    print("  max_depth: 5")
    print("  num_leaves: 31")
    
    model = lgb.LGBMRegressor(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=5,
        num_leaves=31,
        random_state=42,
        verbose=-1  # Suppress training output
    )
    
    model.fit(X_train, y_train)
    print("✓ Model training complete")
    
    # Step 6: Evaluate model
    print("\n[Step 6/7] Evaluating model...")
    metrics = evaluate_model(model, X_test, y_test)
    
    # Assert NDCG@5 threshold
    if metrics['ndcg_5'] < 0.3:
        error_msg = f"Model quality check FAILED: NDCG@5 ({metrics['ndcg_5']:.4f}) is below threshold (0.3)"
        print(f"\n❌ {error_msg}")
        raise ValueError(error_msg)
    
    # Step 7: Save model and metadata
    print("\n[Step 7/7] Saving model and metadata...")
    feature_names = [
        'macro_delta_calories',
        'macro_delta_protein',
        'macro_delta_carbs',
        'macro_delta_fat',
        'cuisine_match',
        'meal_slot_match',
        'days_since_last_eaten'
    ]
    
    save_model_and_metadata(model, metrics, feature_names)
    
    print("\n" + "="*80)
    print("Training Pipeline Complete!")
    print("="*80)
    print(f"\n📊 Final Metrics:")
    print(f"  NDCG@5: {metrics['ndcg_5']:.4f}")
    print(f"  Precision@5: {metrics['precision_5']:.4f}")
    print(f"  MAE: {metrics['mae']:.4f}")
    print(f"\n✓ Model ready for deployment at: meal_ranker.txt")

if __name__ == '__main__':
    main()
