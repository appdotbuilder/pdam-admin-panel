
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, installationsTable } from '../db/schema';
import { type ReportQuery } from '../schema';
import { getInstallationReport } from '../handlers/get_installation_report';

describe('getInstallationReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no installations exist', async () => {
    const query: ReportQuery = {};
    const result = await getInstallationReport(query);
    expect(result).toEqual([]);
  });

  it('should return installation report with all fields', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '555-0123',
        subscription_start_date: new Date()
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create test installation
    const installationResult = await db.insert(installationsTable)
      .values({
        customer_id: customerId,
        installation_fee: '1500.00',
        fee_paid: true,
        status: 'completed',
        scheduled_date: new Date('2024-01-15'),
        completed_date: new Date('2024-01-20'),
        total_material_cost: '800.50',
        profit_loss: '699.50' // 1500 - 800.50
      })
      .returning()
      .execute();

    const query: ReportQuery = {};
    const result = await getInstallationReport(query);

    expect(result).toHaveLength(1);
    expect(result[0].installation_id).toEqual(installationResult[0].id);
    expect(result[0].customer_name).toEqual('Test Customer');
    expect(result[0].installation_fee).toEqual(1500);
    expect(result[0].material_cost).toEqual(800.5);
    expect(result[0].profit_loss).toEqual(699.5);
    expect(result[0].status).toEqual('completed');
    expect(result[0].completed_date).toBeInstanceOf(Date);
  });

  it('should filter installations by date range', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '555-0123',
        subscription_start_date: new Date()
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create installations with different completion dates
    await db.insert(installationsTable)
      .values([
        {
          customer_id: customerId,
          installation_fee: '1000.00',
          total_material_cost: '500.00',
          profit_loss: '500.00',
          status: 'completed',
          completed_date: new Date('2024-01-15') // Within range
        },
        {
          customer_id: customerId,
          installation_fee: '2000.00',
          total_material_cost: '1000.00',
          profit_loss: '1000.00',
          status: 'completed',
          completed_date: new Date('2024-03-15') // Outside range
        }
      ])
      .execute();

    // Query with date range
    const query: ReportQuery = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-02-01')
    };

    const result = await getInstallationReport(query);

    expect(result).toHaveLength(1);
    expect(result[0].installation_fee).toEqual(1000);
    expect(result[0].completed_date).toEqual(new Date('2024-01-15'));
  });

  it('should include installations with null completed_date when no date filters applied', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '555-0123',
        subscription_start_date: new Date()
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create installation without completion date
    await db.insert(installationsTable)
      .values({
        customer_id: customerId,
        installation_fee: '1200.00',
        total_material_cost: '600.00',
        profit_loss: '600.00',
        status: 'pending',
        completed_date: null
      })
      .execute();

    const query: ReportQuery = {};
    const result = await getInstallationReport(query);

    expect(result).toHaveLength(1);
    expect(result[0].status).toEqual('pending');
    expect(result[0].completed_date).toBeNull();
  });

  it('should return multiple installations sorted by default database order', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '555-0123',
        subscription_start_date: new Date()
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create multiple installations
    await db.insert(installationsTable)
      .values([
        {
          customer_id: customerId,
          installation_fee: '1000.00',
          total_material_cost: '400.00',
          profit_loss: '600.00',
          status: 'completed',
          completed_date: new Date('2024-01-15')
        },
        {
          customer_id: customerId,
          installation_fee: '1500.00',
          total_material_cost: '800.00',
          profit_loss: '700.00',
          status: 'pending',
          completed_date: null
        }
      ])
      .execute();

    const query: ReportQuery = {};
    const result = await getInstallationReport(query);

    expect(result).toHaveLength(2);
    expect(result[0].installation_fee).toEqual(1000);
    expect(result[1].installation_fee).toEqual(1500);
  });
});
