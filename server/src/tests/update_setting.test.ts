
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { settingsTable } from '../db/schema';
import { type UpdateSettingInput } from '../schema';
import { updateSetting } from '../handlers/update_setting';
import { eq } from 'drizzle-orm';

const testInput: UpdateSettingInput = {
  key: 'default_installation_fee',
  value: '5000.00'
};

describe('updateSetting', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new setting when it does not exist', async () => {
    const result = await updateSetting(testInput);

    expect(result.key).toEqual('default_installation_fee');
    expect(result.value).toEqual('5000.00');
    expect(result.id).toBeDefined();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update existing setting when it exists', async () => {
    // Create initial setting
    await db.insert(settingsTable)
      .values({
        key: 'default_installation_fee',
        value: '3000.00',
        updated_at: new Date('2023-01-01')
      })
      .execute();

    // Update the setting
    const result = await updateSetting({
      key: 'default_installation_fee',
      value: '7500.00'
    });

    expect(result.key).toEqual('default_installation_fee');
    expect(result.value).toEqual('7500.00');
    expect(result.id).toBeDefined();
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > new Date('2023-01-01')).toBe(true);
  });

  it('should save setting to database', async () => {
    const result = await updateSetting(testInput);

    const settings = await db.select()
      .from(settingsTable)
      .where(eq(settingsTable.key, 'default_installation_fee'))
      .execute();

    expect(settings).toHaveLength(1);
    expect(settings[0].key).toEqual('default_installation_fee');
    expect(settings[0].value).toEqual('5000.00');
    expect(settings[0].id).toEqual(result.id);
    expect(settings[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle different setting keys', async () => {
    // Create multiple different settings
    const monthlyFeeResult = await updateSetting({
      key: 'monthly_subscription_fee',
      value: '1500.00'
    });

    const companyNameResult = await updateSetting({
      key: 'company_name',
      value: 'Internet Service Provider Co.'
    });

    expect(monthlyFeeResult.key).toEqual('monthly_subscription_fee');
    expect(monthlyFeeResult.value).toEqual('1500.00');
    
    expect(companyNameResult.key).toEqual('company_name');
    expect(companyNameResult.value).toEqual('Internet Service Provider Co.');

    // Verify both are saved to database
    const allSettings = await db.select()
      .from(settingsTable)
      .execute();

    expect(allSettings).toHaveLength(2);
  });

  it('should update timestamp when updating existing setting', async () => {
    // Create setting with old timestamp
    const oldTimestamp = new Date('2023-01-01T10:00:00Z');
    await db.insert(settingsTable)
      .values({
        key: 'test_key',
        value: 'old_value',
        updated_at: oldTimestamp
      })
      .execute();

    // Update the setting
    const result = await updateSetting({
      key: 'test_key',
      value: 'new_value'
    });

    expect(result.value).toEqual('new_value');
    expect(result.updated_at > oldTimestamp).toBe(true);
  });
});
