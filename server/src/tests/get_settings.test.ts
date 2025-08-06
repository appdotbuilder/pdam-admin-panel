
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { settingsTable } from '../db/schema';
import { getSettings } from '../handlers/get_settings';

describe('getSettings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return default settings when database is empty', async () => {
    const result = await getSettings();

    expect(result).toHaveLength(2);
    
    const monthlyFeeSetting = result.find(s => s.key === 'monthly_fee');
    expect(monthlyFeeSetting).toBeDefined();
    expect(monthlyFeeSetting?.value).toEqual('100.00');
    expect(monthlyFeeSetting?.updated_at).toBeInstanceOf(Date);

    const installationFeeSetting = result.find(s => s.key === 'installation_fee');
    expect(installationFeeSetting).toBeDefined();
    expect(installationFeeSetting?.value).toEqual('500.00');
    expect(installationFeeSetting?.updated_at).toBeInstanceOf(Date);
  });

  it('should return database settings when they exist', async () => {
    // Insert custom settings into database
    await db.insert(settingsTable)
      .values([
        { key: 'monthly_fee', value: '150.00' },
        { key: 'installation_fee', value: '750.00' },
        { key: 'custom_setting', value: 'custom_value' }
      ])
      .execute();

    const result = await getSettings();

    expect(result).toHaveLength(3);

    const monthlyFeeSetting = result.find(s => s.key === 'monthly_fee');
    expect(monthlyFeeSetting).toBeDefined();
    expect(monthlyFeeSetting?.value).toEqual('150.00');
    expect(monthlyFeeSetting?.id).toBeGreaterThan(0);

    const installationFeeSetting = result.find(s => s.key === 'installation_fee');
    expect(installationFeeSetting).toBeDefined();
    expect(installationFeeSetting?.value).toEqual('750.00');
    expect(installationFeeSetting?.id).toBeGreaterThan(0);

    const customSetting = result.find(s => s.key === 'custom_setting');
    expect(customSetting).toBeDefined();
    expect(customSetting?.value).toEqual('custom_value');
    expect(customSetting?.id).toBeGreaterThan(0);
  });

  it('should merge database settings with defaults', async () => {
    // Insert only one of the default settings
    await db.insert(settingsTable)
      .values([
        { key: 'monthly_fee', value: '200.00' },
        { key: 'other_setting', value: 'other_value' }
      ])
      .execute();

    const result = await getSettings();

    expect(result).toHaveLength(3);

    // Database setting should override default
    const monthlyFeeSetting = result.find(s => s.key === 'monthly_fee');
    expect(monthlyFeeSetting?.value).toEqual('200.00');
    expect(monthlyFeeSetting?.id).toBeGreaterThan(0);

    // Missing default should be added
    const installationFeeSetting = result.find(s => s.key === 'installation_fee');
    expect(installationFeeSetting?.value).toEqual('500.00');
    expect(installationFeeSetting?.id).toEqual(0); // Default entry

    // Custom setting should be included
    const otherSetting = result.find(s => s.key === 'other_setting');
    expect(otherSetting?.value).toEqual('other_value');
    expect(otherSetting?.id).toBeGreaterThan(0);
  });

  it('should return all settings with proper field types', async () => {
    await db.insert(settingsTable)
      .values({ key: 'test_setting', value: 'test_value' })
      .execute();

    const result = await getSettings();

    expect(result.length).toBeGreaterThan(0);
    
    result.forEach(setting => {
      expect(typeof setting.id).toBe('number');
      expect(typeof setting.key).toBe('string');
      expect(typeof setting.value).toBe('string');
      expect(setting.updated_at).toBeInstanceOf(Date);
    });
  });
});
