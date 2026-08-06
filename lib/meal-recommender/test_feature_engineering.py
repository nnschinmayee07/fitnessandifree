"""
Unit tests for feature engineering functions in train.py

This test file validates that all feature engineering functions work correctly
according to the specifications in Requirements 2 and 10.
"""

import sys
sys.path.insert(0, '/Users/yash/fitnessandifree/lib/meal-recommender')

from train import (
    compute_macro_delta,
    compute_cuisine_match,
    compute_meal_slot_match,
    compute_days_since_last_eaten,
    engineer_features
)


def test_compute_macro_delta():
    """Test compute_macro_delta returns correct 4-element array"""
    print("Testing compute_macro_delta...")
    
    meal = {
        'calories': 500,
        'protein_g': 30,
        'carbs_g': 50,
        'fat_g': 15
    }
    
    remaining = {
        'calories': 480,
        'protein_g': 32,
        'carbs_g': 48,
        'fat_g': 16
    }
    
    result = compute_macro_delta(meal, remaining)
    
    # Should return [20, 2, 2, 1]
    assert len(result) == 4, f"Expected 4 elements, got {len(result)}"
    assert result[0] == 20.0, f"Expected calories_delta=20, got {result[0]}"
    assert result[1] == 2.0, f"Expected protein_delta=2, got {result[1]}"
    assert result[2] == 2.0, f"Expected carbs_delta=2, got {result[2]}"
    assert result[3] == 1.0, f"Expected fat_delta=1, got {result[3]}"
    
    print("  ✓ Returns 4-element array with correct absolute differences")


def test_compute_cuisine_match():
    """Test compute_cuisine_match returns 1 for match, 0 otherwise"""
    print("Testing compute_cuisine_match...")
    
    meal_italian = {'cuisine_type': 'italian'}
    meal_mexican = {'cuisine_type': 'mexican'}
    
    # Test match
    assert compute_cuisine_match(meal_italian, 'italian') == 1, "Should return 1 for match"
    
    # Test no match
    assert compute_cuisine_match(meal_mexican, 'italian') == 0, "Should return 0 for no match"
    
    # Test no preference
    assert compute_cuisine_match(meal_italian, None) == 0, "Should return 0 for no preference"
    
    # Test case insensitivity
    assert compute_cuisine_match(meal_italian, 'Italian') == 1, "Should be case insensitive"
    
    print("  ✓ Returns 1 for match, 0 for no match or no preference")


def test_compute_meal_slot_match():
    """Test compute_meal_slot_match returns 1 for match, 0 otherwise"""
    print("Testing compute_meal_slot_match...")
    
    meal_breakfast = {'meal_slot': 'breakfast'}
    meal_dinner = {'meal_slot': 'dinner'}
    
    # Test match
    assert compute_meal_slot_match(meal_breakfast, 'breakfast') == 1, "Should return 1 for match"
    
    # Test no match
    assert compute_meal_slot_match(meal_dinner, 'breakfast') == 0, "Should return 0 for no match"
    
    # Test case insensitivity
    assert compute_meal_slot_match(meal_breakfast, 'Breakfast') == 1, "Should be case insensitive"
    
    print("  ✓ Returns 1 for match, 0 for no match")


def test_compute_days_since_last_eaten():
    """Test compute_days_since_last_eaten returns correct days (999 if never)"""
    print("Testing compute_days_since_last_eaten...")
    
    meal_eaten = {'id': 'meal_123'}
    meal_never = {'id': 'meal_456'}
    
    history = [
        {'meal_id': 'meal_123', 'days_ago': 7},
        {'meal_id': 'meal_789', 'days_ago': 3}
    ]
    
    # Test meal in history
    assert compute_days_since_last_eaten(meal_eaten, history) == 7, "Should return 7 for meal eaten 7 days ago"
    
    # Test meal not in history
    assert compute_days_since_last_eaten(meal_never, history) == 999, "Should return 999 for never eaten meal"
    
    # Test empty history
    assert compute_days_since_last_eaten(meal_eaten, []) == 999, "Should return 999 for empty history"
    
    print("  ✓ Returns days from history or 999 if never eaten")


def test_engineer_features():
    """Test engineer_features combines all features into 7-element vector"""
    print("Testing engineer_features...")
    
    user = {
        'cuisine_preference': 'italian',
        'requested_slot': 'breakfast'
    }
    
    meal = {
        'id': 'meal_001',
        'calories': 380,
        'protein_g': 28,
        'carbs_g': 38,
        'fat_g': 14,
        'cuisine_type': 'italian',
        'meal_slot': 'breakfast'
    }
    
    remaining = {
        'calories': 400,
        'protein_g': 30,
        'carbs_g': 40,
        'fat_g': 15
    }
    
    history = [
        {'meal_id': 'meal_001', 'days_ago': 5}
    ]
    
    result = engineer_features(user, meal, remaining, history)
    
    # Should return 7-element vector
    assert len(result) == 7, f"Expected 7 elements, got {len(result)}"
    
    # Validate each feature
    assert result[0] == 20.0, f"Expected calories_delta=20, got {result[0]}"
    assert result[1] == 2.0, f"Expected protein_delta=2, got {result[1]}"
    assert result[2] == 2.0, f"Expected carbs_delta=2, got {result[2]}"
    assert result[3] == 1.0, f"Expected fat_delta=1, got {result[3]}"
    assert result[4] == 1.0, f"Expected cuisine_match=1, got {result[4]}"
    assert result[5] == 1.0, f"Expected meal_slot_match=1, got {result[5]}"
    assert result[6] == 5.0, f"Expected days_since_last_eaten=5, got {result[6]}"
    
    print("  ✓ Returns 7-element vector with all features in correct order")
    
    # Test with poor fit meal
    poor_meal = {
        'id': 'meal_999',
        'calories': 700,
        'protein_g': 50,
        'carbs_g': 60,
        'fat_g': 25,
        'cuisine_type': 'mexican',
        'meal_slot': 'dinner'
    }
    
    result2 = engineer_features(user, poor_meal, remaining, [])
    
    assert result2[0] == 300.0, "Should have large calorie delta for poor fit"
    assert result2[4] == 0.0, "Should have cuisine_match=0 for different cuisine"
    assert result2[5] == 0.0, "Should have meal_slot_match=0 for different slot"
    assert result2[6] == 999.0, "Should have days=999 for never eaten"
    
    print("  ✓ Correctly handles poor fit meals")


def run_all_tests():
    """Run all feature engineering tests"""
    print("\n" + "="*80)
    print("Feature Engineering Unit Tests")
    print("="*80 + "\n")
    
    try:
        test_compute_macro_delta()
        test_compute_cuisine_match()
        test_compute_meal_slot_match()
        test_compute_days_since_last_eaten()
        test_engineer_features()
        
        print("\n" + "="*80)
        print("✓ All tests passed!")
        print("="*80 + "\n")
        return True
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}\n")
        return False


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
