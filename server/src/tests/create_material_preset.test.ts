
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { materialPresetsTable } from '../db/schema';
import { type CreateMaterialPresetInput } from '../schema';
import { createMaterialPreset } from '../handlers/create_material_preset';
import { eq } from 'drizzle-orm';

const testInput: CreateMaterialPresetInput = {
  name: 'Test Material',
  default_unit_price: 25.50,
  unit: 'meters'
};

describe('createMaterialPreset', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a material preset', async () => {
    const result = await createMaterialPreset(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Material');
    expect(result.default_unit_price).toEqual(25.50);
    expect(result.unit).toEqual('meters');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(typeof result.default_unit_price).toBe('number');
  });

  it('should save material preset to database', async () => {
    const result = await createMaterialPreset(testInput);

    // Query using proper drizzle syntax
    const presets = await db.select()
      .from(materialPresetsTable)
      .where(eq(materialPresetsTable.id, result.id))
      .execute();

    expect(presets).toHaveLength(1);
    expect(presets[0].name).toEqual('Test Material');
    expect(parseFloat(presets[0].default_unit_price)).toEqual(25.50);
    expect(presets[0].unit).toEqual('meters');
    expect(presets[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle different numeric values', async () => {
    const testInputWithDecimals: CreateMaterialPresetInput = {
      name: 'Precision Material',
      default_unit_price: 0.99,
      unit: 'pieces'
    };

    const result = await createMaterialPreset(testInputWithDecimals);

    expect(result.default_unit_price).toEqual(0.99);
    expect(typeof result.default_unit_price).toBe('number');
  });

  it('should throw error for duplicate material names', async () => {
    // Create first preset
    await createMaterialPreset(testInput);

    // Attempt to create duplicate
    await expect(createMaterialPreset(testInput)).rejects.toThrow(/duplicate key value violates unique constraint|unique constraint/i);
  });

  it('should create multiple presets with different names', async () => {
    const preset1 = await createMaterialPreset({
      name: 'Cable',
      default_unit_price: 15.00,
      unit: 'meters'
    });

    const preset2 = await createMaterialPreset({
      name: 'Connector',
      default_unit_price: 2.50,
      unit: 'pieces'
    });

    expect(preset1.id).toBeDefined();
    expect(preset2.id).toBeDefined();
    expect(preset1.id).not.toEqual(preset2.id);
    expect(preset1.name).toEqual('Cable');
    expect(preset2.name).toEqual('Connector');
  });
});
