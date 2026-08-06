"""
Unit tests for data_prep.py module

These tests verify the data preparation functions work correctly
without requiring actual dataset downloads.
"""

import pytest
import pandas as pd
import numpy as np
from data_prep import (
    infer_cuisine_type,
    infer_meal_slot,
    validate_nutrition,
    load_recipes
)


class TestInferCuisineType:
    """Test cuisine type inference from recipe metadata"""
    
    def test_italian_from_tags(self):
        recipe = {'tags': ['italian', 'pasta'], 'name': 'Generic Recipe'}
        assert infer_cuisine_type(recipe) == 'italian'
    
    def test_mexican_from_name(self):
        recipe = {'tags': ['main-dish'], 'name': 'Chicken Taco Bowl'}
        assert infer_cuisine_type(recipe) == 'mexican'
    
    def test_chinese_from_tags(self):
        recipe = {'tags': ['chinese', 'stir-fry'], 'name': 'Vegetable Dish'}
        assert infer_cuisine_type(recipe) == 'chinese'
    
    def test_default_to_american(self):
        recipe = {'tags': ['main-dish'], 'name': 'Generic Food'}
        assert infer_cuisine_type(recipe) == 'american'
    
    def test_empty_recipe(self):
        recipe = {'tags': [], 'name': ''}
        assert infer_cuisine_type(recipe) == 'american'


class TestInferMealSlot:
    """Test meal slot classification"""
    
    def test_breakfast_from_tags(self):
        recipe = {'tags': ['breakfast', 'quick'], 'name': 'Morning Food'}
        assert infer_meal_slot(recipe) == 'breakfast'
    
    def test_breakfast_from_name(self):
        recipe = {'tags': ['main-dish'], 'name': 'Fluffy Pancakes'}
        assert infer_meal_slot(recipe) == 'breakfast'
    
    def test_snack_from_tags(self):
        recipe = {'tags': ['snack', 'appetizer'], 'name': 'Bites'}
        assert infer_meal_slot(recipe) == 'snack'
    
    def test_lunch_from_tags(self):
        recipe = {'tags': ['lunch', 'sandwich'], 'name': 'Turkey Club'}
        assert infer_meal_slot(recipe) == 'lunch'
    
    def test_default_to_dinner(self):
        recipe = {'tags': ['main-dish'], 'name': 'Chicken Recipe'}
        assert infer_meal_slot(recipe) == 'dinner'


class TestValidateNutrition:
    """Test nutritional data validation"""
    
    def test_valid_nutrition(self):
        """Valid nutrition data should pass through unchanged"""
        df = pd.DataFrame({
            'nutrition': [
                [200, 10, 5, 100, 15, 3, 25],
                [300, 15, 10, 150, 20, 5, 30]
            ]
        })
        result = validate_nutrition(df)
        assert len(result) == 2
        assert 'calories' in result.columns
        assert 'protein_g' in result.columns
        assert result['calories'].iloc[0] == 200
    
    def test_removes_negative_values(self):
        """Rows with negative nutrition values should be removed"""
        df = pd.DataFrame({
            'nutrition': [
                [200, -10, 5, 100, 15, 3, 25],  # negative fat
                [300, 15, 10, 150, 20, 5, 30]    # valid
            ]
        })
        result = validate_nutrition(df)
        assert len(result) == 1
        assert result['calories'].iloc[0] == 300
    
    def test_removes_missing_macros(self):
        """Rows with missing essential macros should be removed"""
        df = pd.DataFrame({
            'nutrition': [
                [200, 10, 5, 100],  # missing protein, sat_fat, carbs
                [300, 15, 10, 150, 20, 5, 30]  # complete
            ]
        })
        result = validate_nutrition(df)
        assert len(result) == 1
    
    def test_creates_macro_columns(self):
        """Should create separate columns for each macro nutrient"""
        df = pd.DataFrame({
            'nutrition': [[200, 10, 5, 100, 15, 3, 25]]
        })
        result = validate_nutrition(df)
        
        expected_columns = [
            'calories', 'total_fat_g', 'sugar_g', 'sodium_mg',
            'protein_g', 'saturated_fat_g', 'carbs_g'
        ]
        for col in expected_columns:
            assert col in result.columns


class TestLoadRecipes:
    """Test recipe loading and validation"""
    
    def test_missing_file_raises_error(self):
        """Should raise FileNotFoundError for missing files"""
        with pytest.raises(FileNotFoundError):
            load_recipes('/nonexistent/path/recipes.csv')


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
