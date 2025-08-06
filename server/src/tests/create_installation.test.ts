
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { installationsTable, customersTable } from '../db/schema';
import { type CreateInstallationInput } from '../schema';
import { createInstallation } from '../handlers/create_installation';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateInstallationInput = {
  customer_id: 1,
  installation_fee: 250000,
  scheduled_date: new Date('2024-01-15')
};

describe('createInstallation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an installation with custom fee', async () => {
    // Create prerequisite customer first
    await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '1234567890',
        status: 'active',
        subscription_start_date: new Date()
      })
      .execute();

    const result = await createInstallation(testInput);

    // Basic field validation
    expect(result.customer_id).toEqual(1);
    expect(result.installation_fee).toEqual(250000);
    expect(typeof result.installation_fee).toBe('number');
    expect(result.fee_paid).toBe(false);
    expect(result.status).toEqual('pending');
    expect(result.scheduled_date).toEqual(testInput.scheduled_date);
    expect(result.completed_date).toBeNull();
    expect(result.total_material_cost).toEqual(0);
    expect(typeof result.total_material_cost).toBe('number');
    expect(result.profit_loss).toEqual(0);
    expect(typeof result.profit_loss).toBe('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should use default installation fee when not provided', async () => {
    // Create prerequisite customer first
    await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: null,
        status: 'active',
        subscription_start_date: new Date()
      })
      .execute();

    const inputWithoutFee: CreateInstallationInput = {
      customer_id: 1,
      scheduled_date: null
    };

    const result = await createInstallation(inputWithoutFee);

    expect(result.installation_fee).toEqual(300000);
    expect(result.customer_id).toEqual(1);
    expect(result.scheduled_date).toBeNull();
  });

  it('should save installation to database', async () => {
    // Create prerequisite customer first
    await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '1234567890',
        status: 'active',
        subscription_start_date: new Date()
      })
      .execute();

    const result = await createInstallation(testInput);

    // Query using proper drizzle syntax
    const installations = await db.select()
      .from(installationsTable)
      .where(eq(installationsTable.id, result.id))
      .execute();

    expect(installations).toHaveLength(1);
    expect(installations[0].customer_id).toEqual(1);
    expect(parseFloat(installations[0].installation_fee)).toEqual(250000);
    expect(installations[0].fee_paid).toBe(false);
    expect(installations[0].status).toEqual('pending');
    expect(installations[0].scheduled_date).toEqual(testInput.scheduled_date);
    expect(installations[0].completed_date).toBeNull();
    expect(parseFloat(installations[0].total_material_cost)).toEqual(0);
    expect(parseFloat(installations[0].profit_loss)).toEqual(0);
    expect(installations[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when customer does not exist', async () => {
    const invalidInput: CreateInstallationInput = {
      customer_id: 999, // Non-existent customer
      installation_fee: 250000,
      scheduled_date: new Date()
    };

    await expect(createInstallation(invalidInput)).rejects.toThrow(/customer with id 999 not found/i);
  });

  it('should handle null scheduled_date correctly', async () => {
    // Create prerequisite customer first
    await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: null,
        status: 'active',
        subscription_start_date: new Date()
      })
      .execute();

    const inputWithNullDate: CreateInstallationInput = {
      customer_id: 1,
      installation_fee: 200000,
      scheduled_date: null
    };

    const result = await createInstallation(inputWithNullDate);

    expect(result.scheduled_date).toBeNull();
    expect(result.installation_fee).toEqual(200000);
  });
});
