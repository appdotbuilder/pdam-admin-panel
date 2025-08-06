
import { db } from '../db';
import { settingsTable } from '../db/schema';
import { type UpdateSettingInput, type Settings } from '../schema';
import { eq } from 'drizzle-orm';

export const updateSetting = async (input: UpdateSettingInput): Promise<Settings> => {
  try {
    // Try to update existing setting first
    const updateResult = await db.update(settingsTable)
      .set({
        value: input.value,
        updated_at: new Date()
      })
      .where(eq(settingsTable.key, input.key))
      .returning()
      .execute();

    // If setting exists, return the updated record
    if (updateResult.length > 0) {
      return updateResult[0];
    }

    // If setting doesn't exist, create it (upsert behavior)
    const insertResult = await db.insert(settingsTable)
      .values({
        key: input.key,
        value: input.value,
        updated_at: new Date()
      })
      .returning()
      .execute();

    return insertResult[0];
  } catch (error) {
    console.error('Setting update failed:', error);
    throw error;
  }
};
