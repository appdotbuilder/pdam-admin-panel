
import { db } from '../db';
import { materialPresetsTable } from '../db/schema';
import { type CreateMaterialPresetInput, type MaterialPreset } from '../schema';

export const createMaterialPreset = async (input: CreateMaterialPresetInput): Promise<MaterialPreset> => {
  try {
    // Insert material preset record
    const result = await db.insert(materialPresetsTable)
      .values({
        name: input.name,
        default_unit_price: input.default_unit_price.toString(), // Convert number to string for numeric column
        unit: input.unit
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const preset = result[0];
    return {
      ...preset,
      default_unit_price: parseFloat(preset.default_unit_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Material preset creation failed:', error);
    throw error;
  }
};
