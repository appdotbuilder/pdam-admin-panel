
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { materialPresetsTable } from '../db/schema';
import { getMaterialPresets } from '../handlers/get_material_presets';

describe('getMaterialPresets', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no presets exist', async () => {
    const result = await getMaterialPresets();
    expect(result).toEqual([]);
  });

  it('should return all material presets', async () => {
    // Insert test data
    await db.insert(materialPresetsTable).values([
      {
        name: 'PVC Pipe',
        default_unit_price: '25.50',
        unit: 'meter'
      },
      {
        name: 'Cable',
        default_unit_price: '15.00',
        unit: 'meter'
      }
    ]).execute();

    const result = await getMaterialPresets();

    expect(result).toHaveLength(2);
    
    // Verify numeric conversion
    result.forEach(preset => {
      expect(typeof preset.default_unit_price).toBe('number');
      expect(preset.id).toBeDefined();
      expect(preset.name).toBeDefined();
      expect(preset.unit).toBeDefined();
      expect(preset.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return presets ordered by name', async () => {
    // Insert test data in non-alphabetical order
    await db.insert(materialPresetsTable).values([
      {
        name: 'Wire',
        default_unit_price: '10.00',
        unit: 'meter'
      },
      {
        name: 'Cable',
        default_unit_price: '15.00',
        unit: 'meter'
      },
      {
        name: 'PVC Pipe',
        default_unit_price: '25.50',
        unit: 'meter'
      }
    ]).execute();

    const result = await getMaterialPresets();

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Cable');
    expect(result[1].name).toBe('PVC Pipe');
    expect(result[2].name).toBe('Wire');
  });

  it('should properly convert numeric fields', async () => {
    await db.insert(materialPresetsTable).values({
      name: 'Test Material',
      default_unit_price: '99.99',
      unit: 'piece'
    }).execute();

    const result = await getMaterialPresets();

    expect(result).toHaveLength(1);
    expect(result[0].default_unit_price).toBe(99.99);
    expect(typeof result[0].default_unit_price).toBe('number');
  });
});
