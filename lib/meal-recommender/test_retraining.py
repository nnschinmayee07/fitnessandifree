"""
Test script for incremental retraining functionality

This script tests the new retraining functions without requiring
actual production data or database connections.
"""

import sys
import json
import pandas as pd
import numpy as np
from train import (
    convert_events_to_pairs,
    combine_datasets,
    engineer_features
)


def test_convert_events_to_pairs():
    """Test conversion of events to training pairs"""
    print("Testing convert_events_to_pairs()...")
    
    # Create mock events DataFrame
    events_data = [
        {
            'id': 'event1',
            'user_id': 'user1',
            'recommended_meal_ids': ['meal1', 'meal2', 'meal3'],
            'requested_meal_slot': 'breakfast',
            'user_profile_snapshot': json.dumps({'cuisine_preference': 'italian'}),
            'remaining_macros_snapshot': json.dumps({
                'calories': 500,
                'protein_g': 30,
                'carbs_g': 50,
                'fat_g': 15
            }),
            'outcome': 'accepted',
            'accepted_meal_id': 'meal1'
        },
        {
            'id': 'event2',
            'user_id': 'user2',
            'recommended_meal_ids': ['meal4', 'meal5'],
            'requested_meal_slot': 'lunch',
            'user_profile_snapshot': json.dumps({'cuisine_preference': 'mexican'}),
            'remaining_macros_snapshot': json.dumps({
                'calories': 600,
                'protein_g': 35,
                'carbs_g': 60,
                'fat_g': 20
            }),
            'outcome': 'rejected_logged_other',
            'accepted_meal_id': None
        },
        {
            'id': 'event3',
            'user_id': 'user3',
            'recommended_meal_ids': ['meal6'],
            'requested_meal_slot': 'dinner',
            'user_profile_snapshot': json.dumps({'cuisine_preference': None}),
            'remaining_macros_snapshot': json.dumps({
                'calories': 700,
                'protein_g': 40,
                'carbs_g': 70,
                'fat_g': 25
            }),
            'outcome': None,
            'accepted_meal_id': None
        }
    ]
    
    events_df = pd.DataFrame(events_data)
    
    # Create mock meals DataFrame
    meals_data = [
        {
            'id': 'meal1',
            'calories': 480,
            'protein_g': 28,
            'carbs_g': 48,
            'total_fat_g': 14,
            'cuisine_type': 'italian',
            'meal_slot': 'breakfast'
        },
        {
            'id': 'meal2',
            'calories': 520,
            'protein_g': 32,
            'carbs_g': 52,
            'total_fat_g': 16,
            'cuisine_type': 'american',
            'meal_slot': 'breakfast'
        },
        {
            'id': 'meal3',
            'calories': 450,
            'protein_g': 25,
            'carbs_g': 45,
            'total_fat_g': 13,
            'cuisine_type': 'italian',
            'meal_slot': 'breakfast'
        },
        {
            'id': 'meal4',
            'calories': 580,
            'protein_g': 33,
            'carbs_g': 58,
            'total_fat_g': 18,
            'cuisine_type': 'mexican',
            'meal_slot': 'lunch'
        },
        {
            'id': 'meal5',
            'calories': 620,
            'protein_g': 37,
            'carbs_g': 62,
            'total_fat_g': 22,
            'cuisine_type': 'asian',
            'meal_slot': 'lunch'
        },
        {
            'id': 'meal6',
            'calories': 680,
            'protein_g': 38,
            'carbs_g': 68,
            'total_fat_g': 23,
            'cuisine_type': 'american',
            'meal_slot': 'dinner'
        }
    ]
    
    meals_df = pd.DataFrame(meals_data)
    
    # Convert events to pairs
    X, y = convert_events_to_pairs(events_df, meals_df)
    
    # Verify results
    assert len(X) == 6, f"Expected 6 training pairs, got {len(X)}"
    assert len(y) == 6, f"Expected 6 labels, got {len(y)}"
    assert all(len(features) == 7 for features in X), "All feature vectors should have 7 elements"
    
    # Check label values
    # Event 1: meal1 accepted (5.0), meal2 and meal3 not accepted (2.0)
    # Event 2: both meals rejected (1.0)
    # Event 3: meal dismissed (1.5)
    expected_labels = [5.0, 2.0, 2.0, 1.0, 1.0, 1.5]
    assert y == expected_labels, f"Expected labels {expected_labels}, got {y}"
    
    print("✓ convert_events_to_pairs() test passed")
    print(f"  Generated {len(X)} training pairs with correct labels")


def test_combine_datasets():
    """Test combining Food.com and production datasets"""
    print("\nTesting combine_datasets()...")
    
    # Create mock Food.com data
    food_X = [
        [100, 10, 20, 5, 1, 1, 999],
        [150, 15, 25, 8, 0, 1, 999],
        [200, 20, 30, 10, 1, 0, 999]
    ]
    food_y = [3.5, 2.8, 4.2]
    
    # Create mock production data
    production_X = [
        [80, 8, 18, 4, 1, 1, 5],
        [120, 12, 22, 6, 1, 1, 10]
    ]
    production_y = [5.0, 4.5]
    
    # Combine with production weight = 2.0
    X_combined, y_combined = combine_datasets(
        food_X, food_y, 
        production_X, production_y, 
        production_weight=2.0
    )
    
    # Verify results
    # Should have: 3 food samples + 2 production samples * 2 = 7 total
    expected_size = len(food_X) + len(production_X) * 2
    assert len(X_combined) == expected_size, f"Expected {expected_size} samples, got {len(X_combined)}"
    assert len(y_combined) == expected_size, f"Expected {expected_size} labels, got {len(y_combined)}"
    
    # Check that production samples are duplicated
    production_count = sum(1 for y in y_combined if y in [5.0, 4.5])
    assert production_count == 4, f"Expected 4 production samples (2*2), got {production_count}"
    
    print("✓ combine_datasets() test passed")
    print(f"  Combined dataset size: {len(X_combined)} samples")
    print(f"  Production samples (duplicated): {production_count}")


def test_feature_engineering():
    """Test feature engineering function"""
    print("\nTesting engineer_features()...")
    
    # Create test data
    user_context = {
        'cuisine_preference': 'italian',
        'requested_slot': 'breakfast'
    }
    
    meal = {
        'id': 'test_meal',
        'calories': 480,
        'protein_g': 28,
        'carbs_g': 48,
        'fat_g': 14,
        'cuisine_type': 'italian',
        'meal_slot': 'breakfast'
    }
    
    remaining = {
        'calories': 500,
        'protein_g': 30,
        'carbs_g': 50,
        'fat_g': 15
    }
    
    history = []
    
    # Engineer features
    features = engineer_features(user_context, meal, remaining, history)
    
    # Verify feature vector
    assert len(features) == 7, f"Expected 7 features, got {len(features)}"
    
    # Check individual features
    assert features[0] == abs(480 - 500), f"calories_delta should be {abs(480-500)}, got {features[0]}"
    assert features[1] == abs(28 - 30), f"protein_delta should be {abs(28-30)}, got {features[1]}"
    assert features[2] == abs(48 - 50), f"carbs_delta should be {abs(48-50)}, got {features[2]}"
    assert features[3] == abs(14 - 15), f"fat_delta should be {abs(14-15)}, got {features[3]}"
    assert features[4] == 1, f"cuisine_match should be 1, got {features[4]}"
    assert features[5] == 1, f"meal_slot_match should be 1, got {features[5]}"
    assert features[6] == 999, f"days_since_last_eaten should be 999, got {features[6]}"
    
    print("✓ engineer_features() test passed")
    print(f"  Feature vector: {features}")


def test_empty_production_data():
    """Test combining datasets with empty production data"""
    print("\nTesting combine_datasets() with empty production data...")
    
    # Create mock Food.com data
    food_X = [[100, 10, 20, 5, 1, 1, 999]]
    food_y = [3.5]
    
    # Empty production data
    production_X = []
    production_y = []
    
    # Combine
    X_combined, y_combined = combine_datasets(
        food_X, food_y,
        production_X, production_y,
        production_weight=2.0
    )
    
    # Should just return Food.com data
    assert len(X_combined) == len(food_X), "Should have only Food.com data"
    assert len(y_combined) == len(food_y), "Should have only Food.com labels"
    
    print("✓ Empty production data test passed")


if __name__ == '__main__':
    print("="*80)
    print("Testing Incremental Retraining Functionality")
    print("="*80)
    
    try:
        test_feature_engineering()
        test_convert_events_to_pairs()
        test_combine_datasets()
        test_empty_production_data()
        
        print("\n" + "="*80)
        print("All Tests Passed!")
        print("="*80)
        print("\n✓ Retraining functions are working correctly")
        
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
