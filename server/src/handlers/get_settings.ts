
import { db } from '../db';
import { settingsTable } from '../db/schema';
import { type Settings } from '../schema';

export async function getSettings(): Promise<Settings[]> {
  try {
    // Fetch all settings from database
    const dbSettings = await db.select()
      .from(settingsTable)
      .execute();

    // Create a map of existing settings for quick lookup
    const settingsMap = new Map<string, Settings>();
    dbSettings.forEach(setting => {
      settingsMap.set(setting.key, setting);
    });

    // Define default settings that should always be present
    const defaultSettings = [
      { key: 'monthly_fee', value: '100.00' },
      { key: 'installation_fee', value: '500.00' }
    ];

    // Add default settings if they don't exist
    for (const defaultSetting of defaultSettings) {
      if (!settingsMap.has(defaultSetting.key)) {
        const defaultEntry: Settings = {
          id: 0, // Temporary ID for defaults not in database
          key: defaultSetting.key,
          value: defaultSetting.value,
          updated_at: new Date()
        };
        settingsMap.set(defaultSetting.key, defaultEntry);
      }
    }

    // Return all settings as array
    return Array.from(settingsMap.values());
  } catch (error) {
    console.error('Failed to get settings:', error);
    throw error;
  }
}
