
import { db } from '../db';
import { materialPresetsTable } from '../db/schema';
import { type MaterialPreset } from '../schema';
import { asc } from 'drizzle-orm';

export const getMaterialPresets = async (): Promise<MaterialPreset[]> => {
  try {
    const results = await db.select()
      .from(materialPresetsTable)
      .orderBy(asc(materialPresetsTable.name))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(preset => ({
      ...preset,
      default_unit_price: parseFloat(preset.default_unit_price)
    }));
  } catch (error) {
    console.error('Failed to get material presets:', error);
    throw error;
  }
};
