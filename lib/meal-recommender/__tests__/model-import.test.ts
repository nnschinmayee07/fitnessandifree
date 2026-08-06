/**
 * Integration test to verify model loading works in module import context
 */

import { describe, it, expect } from 'vitest';

describe('Model Import Integration', () => {
  it('should successfully import model loading functions', async () => {
    const { getModelState, getFeatureSchema, isModelReady } = await import('../inference');
    
    expect(getModelState).toBeDefined();
    expect(getFeatureSchema).toBeDefined();
    expect(isModelReady).toBeDefined();
    
    expect(typeof getModelState).toBe('function');
    expect(typeof getFeatureSchema).toBe('function');
    expect(typeof isModelReady).toBe('function');
  });

  it('should have model loaded after import', async () => {
    const { getModelState } = await import('../inference');
    const state = getModelState();
    
    expect(state.isLoaded).toBe(true);
    expect(state.model).not.toBeNull();
    expect(state.schema).not.toBeNull();
  });

  it('should be able to call functions multiple times', async () => {
    const { isModelReady } = await import('../inference');
    
    const result1 = isModelReady();
    const result2 = isModelReady();
    
    expect(result1).toBe(result2);
    expect(result1).toBe(true);
  });
});
