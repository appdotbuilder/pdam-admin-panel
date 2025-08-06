
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, installationsTable, installationMaterialsTable } from '../db/schema';
import { type CreateInstallationMaterialInput } from '../schema';
import { createInstallationMaterial } from '../handlers/create_installation_material';
import { eq } from 'drizzle-orm';

describe('createInstallationMaterial', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let customerId: number;
  let installationId: number;

  beforeEach(async () => {
    // Create customer first
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '123-456-7890',
        subscription_start_date: new Date()
      })
      .returning()
      .execute();

    customerId = customerResult[0].id;

    // Create installation
    const installationResult = await db.insert(installationsTable)
      .values({
        customer_id: customerId,
        installation_fee: '1000.00', // $1000 installation fee
        scheduled_date: new Date()
      })
      .returning()
      .execute();

    installationId = installationResult[0].id;
  });

  const testInput: CreateInstallationMaterialInput = {
    installation_id: 0, // Will be set in tests
    material_name: 'Fiber Optic Cable',
    quantity: 100,
    unit_price: 2.50
  };

  it('should create an installation material', async () => {
    const input = { ...testInput, installation_id: installationId };
    const result = await createInstallationMaterial(input);

    expect(result.installation_id).toEqual(installationId);
    expect(result.material_name).toEqual('Fiber Optic Cable');
    expect(result.quantity).toEqual(100);
    expect(result.unit_price).toEqual(2.50);
    expect(result.total_cost).toEqual(250.00); // 100 * 2.50
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(typeof result.quantity).toBe('number');
    expect(typeof result.unit_price).toBe('number');
    expect(typeof result.total_cost).toBe('number');
  });

  it('should save material to database', async () => {
    const input = { ...testInput, installation_id: installationId };
    const result = await createInstallationMaterial(input);

    const materials = await db.select()
      .from(installationMaterialsTable)
      .where(eq(installationMaterialsTable.id, result.id))
      .execute();

    expect(materials).toHaveLength(1);
    expect(materials[0].material_name).toEqual('Fiber Optic Cable');
    expect(parseFloat(materials[0].quantity)).toEqual(100);
    expect(parseFloat(materials[0].unit_price)).toEqual(2.50);
    expect(parseFloat(materials[0].total_cost)).toEqual(250.00);
  });

  it('should update installation totals', async () => {
    const input = { ...testInput, installation_id: installationId };
    await createInstallationMaterial(input);

    // Check updated installation
    const installations = await db.select()
      .from(installationsTable)
      .where(eq(installationsTable.id, installationId))
      .execute();

    const installation = installations[0];
    expect(parseFloat(installation.total_material_cost)).toEqual(250.00);
    expect(parseFloat(installation.profit_loss)).toEqual(750.00); // 1000 - 250
  });

  it('should accumulate material costs across multiple materials', async () => {
    const input1 = { ...testInput, installation_id: installationId };
    await createInstallationMaterial(input1);

    const input2 = {
      installation_id: installationId,
      material_name: 'Router',
      quantity: 1,
      unit_price: 150.00
    };
    await createInstallationMaterial(input2);

    // Check updated totals
    const installations = await db.select()
      .from(installationsTable)
      .where(eq(installationsTable.id, installationId))
      .execute();

    const installation = installations[0];
    expect(parseFloat(installation.total_material_cost)).toEqual(400.00); // 250 + 150
    expect(parseFloat(installation.profit_loss)).toEqual(600.00); // 1000 - 400
  });

  it('should calculate total cost correctly', async () => {
    const input = {
      installation_id: installationId,
      material_name: 'Cable Modem',
      quantity: 3,
      unit_price: 75.99
    };

    const result = await createInstallationMaterial(input);

    expect(result.total_cost).toEqual(227.97); // 3 * 75.99
  });

  it('should throw error for non-existent installation', async () => {
    const input = { ...testInput, installation_id: 99999 };

    expect(createInstallationMaterial(input)).rejects.toThrow(/installation with id 99999 not found/i);
  });

  it('should handle decimal quantities and prices', async () => {
    const input = {
      installation_id: installationId,
      material_name: 'Connector',
      quantity: 12.5,
      unit_price: 3.75
    };

    const result = await createInstallationMaterial(input);

    expect(result.quantity).toEqual(12.5);
    expect(result.unit_price).toEqual(3.75);
    // Database rounds to 2 decimal places: 12.5 * 3.75 = 46.875 -> 46.88
    expect(result.total_cost).toEqual(46.88);
  });
});
