"""
Test script to verify the training pipeline implementation.
"""
import os
import json
import lightgbm as lgb
import numpy as np

def test_model_file_exists():
    """Test that model file was created."""
    assert os.path.exists('meal_ranker.txt'), "Model file not found"
    print("✓ Model file exists")

def test_feature_schema_exists():
    """Test that feature schema file was created."""
    assert os.path.exists('feature_schema.json'), "Feature schema file not found"
    print("✓ Feature schema file exists")

def test_training_metrics_exists():
    """Test that training metrics file was created."""
    assert os.path.exists('training_metrics.json'), "Training metrics file not found"
    print("✓ Training metrics file exists")

def test_feature_schema_structure():
    """Test that feature schema has correct structure."""
    with open('feature_schema.json', 'r') as f:
        schema = json.load(f)
    
    assert 'version' in schema, "Missing version field"
    assert 'feature_count' in schema, "Missing feature_count field"
    assert 'feature_names' in schema, "Missing feature_names field"
    assert 'feature_types' in schema, "Missing feature_types field"
    assert 'feature_descriptions' in schema, "Missing feature_descriptions field"
    
    assert schema['feature_count'] == 7, f"Expected 7 features, got {schema['feature_count']}"
    assert len(schema['feature_names']) == 7, f"Expected 7 feature names, got {len(schema['feature_names'])}"
    
    expected_features = [
        'macro_delta_calories',
        'macro_delta_protein',
        'macro_delta_carbs',
        'macro_delta_fat',
        'cuisine_match',
        'meal_slot_match',
        'days_since_last_eaten'
    ]
    assert schema['feature_names'] == expected_features, f"Feature names don't match expected"
    
    print("✓ Feature schema structure is correct")

def test_training_metrics_structure():
    """Test that training metrics have correct structure."""
    with open('training_metrics.json', 'r') as f:
        metrics = json.load(f)
    
    assert 'version' in metrics, "Missing version field"
    assert 'training_date' in metrics, "Missing training_date field"
    assert 'metrics' in metrics, "Missing metrics field"
    assert 'baseline_thresholds' in metrics, "Missing baseline_thresholds field"
    assert 'model_config' in metrics, "Missing model_config field"
    
    # Check metrics
    assert 'ndcg_5' in metrics['metrics'], "Missing NDCG@5 metric"
    assert 'precision_5' in metrics['metrics'], "Missing precision@5 metric"
    assert 'mae' in metrics['metrics'], "Missing MAE metric"
    
    # Check NDCG@5 threshold
    ndcg_5 = metrics['metrics']['ndcg_5']
    assert ndcg_5 >= 0.3, f"NDCG@5 ({ndcg_5:.4f}) is below threshold (0.3)"
    
    # Check model config
    assert metrics['model_config']['n_estimators'] == 100
    assert metrics['model_config']['learning_rate'] == 0.1
    assert metrics['model_config']['max_depth'] == 5
    assert metrics['model_config']['num_leaves'] == 31
    
    print("✓ Training metrics structure is correct")
    print(f"  NDCG@5: {ndcg_5:.4f}")
    print(f"  Precision@5: {metrics['metrics']['precision_5']:.4f}")
    print(f"  MAE: {metrics['metrics']['mae']:.4f}")

def test_model_can_load():
    """Test that the model can be loaded."""
    model = lgb.Booster(model_file='meal_ranker.txt')
    assert model is not None, "Failed to load model"
    print("✓ Model can be loaded")

def test_model_can_predict():
    """Test that the model can make predictions."""
    model = lgb.Booster(model_file='meal_ranker.txt')
    
    # Create a sample feature vector
    # [cal_delta, protein_delta, carbs_delta, fat_delta, cuisine_match, slot_match, days_since]
    sample_features = np.array([[200.0, 20.0, 30.0, 10.0, 1.0, 1.0, 5.0]])
    
    prediction = model.predict(sample_features)
    assert len(prediction) == 1, "Expected 1 prediction"
    assert isinstance(prediction[0], (int, float, np.number)), "Prediction should be numeric"
    
    print(f"✓ Model can make predictions (sample prediction: {prediction[0]:.4f})")

if __name__ == '__main__':
    print("="*80)
    print("Testing Training Pipeline Implementation")
    print("="*80)
    
    # Change to the meal-recommender directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    test_model_file_exists()
    test_feature_schema_exists()
    test_training_metrics_exists()
    test_feature_schema_structure()
    test_training_metrics_structure()
    test_model_can_load()
    test_model_can_predict()
    
    print("\n" + "="*80)
    print("All Tests Passed!")
    print("="*80)
