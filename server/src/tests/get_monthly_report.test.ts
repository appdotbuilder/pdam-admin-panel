
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, monthlyBillsTable, paymentsTable, installationsTable, installationMaterialsTable } from '../db/schema';
import { type ReportQuery } from '../schema';
import { getMonthlyReport } from '../handlers/get_monthly_report';

describe('getMonthlyReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate empty report when no data exists', async () => {
    const query: ReportQuery = {
      month: '2024-01'
    };

    const result = await getMonthlyReport(query);

    expect(result.month).toEqual('2024-01');
    expect(result.subscription_income).toEqual(0);
    expect(result.installation_income).toEqual(0);
    expect(result.total_income).toEqual(0);
    expect(result.material_expenses).toEqual(0);
    expect(result.net_balance).toEqual(0);
    expect(result.total_customers).toEqual(0);
    expect(result.new_installations).toEqual(0);
  });

  it('should calculate subscription income correctly', async () => {
    // Create customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '123-456-7890',
        subscription_start_date: new Date('2024-01-01')
      })
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    // Create monthly bill for January 2024
    const billResult = await db.insert(monthlyBillsTable)
      .values({
        customer_id: customerId,
        bill_month: '2024-01',
        amount: '50.00',
        due_date: new Date('2024-01-15')
      })
      .returning()
      .execute();
    const billId = billResult[0].id;

    // Create payment for the bill in January 2024
    await db.insert(paymentsTable)
      .values({
        customer_id: customerId,
        bill_id: billId,
        amount: '50.00',
        payment_date: new Date('2024-01-10')
      })
      .execute();

    const result = await getMonthlyReport({ month: '2024-01' });

    expect(result.subscription_income).toEqual(50);
    expect(result.total_income).toEqual(50);
    expect(result.net_balance).toEqual(50);
  });

  it('should calculate installation income and expenses', async () => {
    // Create customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '123-456-7890',
        subscription_start_date: new Date('2024-01-01')
      })
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    // Create completed installation in January 2024
    const installationResult = await db.insert(installationsTable)
      .values({
        customer_id: customerId,
        installation_fee: '100.00',
        fee_paid: true,
        status: 'completed',
        completed_date: new Date('2024-01-15')
      })
      .returning()
      .execute();
    const installationId = installationResult[0].id;

    // Add installation material
    await db.insert(installationMaterialsTable)
      .values({
        installation_id: installationId,
        material_name: 'Cable',
        quantity: '10.000',
        unit_price: '2.50',
        total_cost: '25.00'
      })
      .execute();

    const result = await getMonthlyReport({ month: '2024-01' });

    expect(result.installation_income).toEqual(100);
    expect(result.material_expenses).toEqual(25);
    expect(result.total_income).toEqual(100);
    expect(result.net_balance).toEqual(75);
    expect(result.new_installations).toEqual(1);
  });

  it('should count total active customers', async () => {
    // Create active customer
    await db.insert(customersTable)
      .values({
        name: 'Active Customer',
        address: '123 Test St',
        phone: '123-456-7890',
        status: 'active',
        subscription_start_date: new Date('2024-01-01')
      })
      .execute();

    // Create inactive customer (should not be counted)
    await db.insert(customersTable)
      .values({
        name: 'Inactive Customer',
        address: '456 Test Ave',
        phone: '987-654-3210',
        status: 'inactive',
        subscription_start_date: new Date('2024-01-01')
      })
      .execute();

    const result = await getMonthlyReport({ month: '2024-01' });

    expect(result.total_customers).toEqual(1);
  });

  it('should use current month when no month specified', async () => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    const result = await getMonthlyReport({});

    expect(result.month).toEqual(currentMonth);
  });

  it('should only include data from specified month', async () => {
    // Create customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '123-456-7890',
        subscription_start_date: new Date('2024-01-01')
      })
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    // Create bill for January
    const billResult = await db.insert(monthlyBillsTable)
      .values({
        customer_id: customerId,
        bill_month: '2024-01',
        amount: '50.00',
        due_date: new Date('2024-01-15')
      })
      .returning()
      .execute();
    const billId = billResult[0].id;

    // Payment in January (should be included)
    await db.insert(paymentsTable)
      .values({
        customer_id: customerId,
        bill_id: billId,
        amount: '30.00',
        payment_date: new Date('2024-01-10')
      })
      .execute();

    // Payment in February (should not be included)
    await db.insert(paymentsTable)
      .values({
        customer_id: customerId,
        bill_id: billId,
        amount: '20.00',
        payment_date: new Date('2024-02-10')
      })
      .execute();

    const result = await getMonthlyReport({ month: '2024-01' });

    expect(result.subscription_income).toEqual(30);
    expect(result.total_income).toEqual(30);
  });

  it('should calculate comprehensive report with all components', async () => {
    // Create customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '123-456-7890',
        subscription_start_date: new Date('2024-01-01')
      })
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    // Create monthly bill and payment
    const billResult = await db.insert(monthlyBillsTable)
      .values({
        customer_id: customerId,
        bill_month: '2024-01',
        amount: '75.00',
        due_date: new Date('2024-01-15')
      })
      .returning()
      .execute();

    await db.insert(paymentsTable)
      .values({
        customer_id: customerId,
        bill_id: billResult[0].id,
        amount: '75.00',
        payment_date: new Date('2024-01-10')
      })
      .execute();

    // Create installation with materials
    const installationResult = await db.insert(installationsTable)
      .values({
        customer_id: customerId,
        installation_fee: '150.00',
        fee_paid: true,
        status: 'completed',
        completed_date: new Date('2024-01-20')
      })
      .returning()
      .execute();

    await db.insert(installationMaterialsTable)
      .values({
        installation_id: installationResult[0].id,
        material_name: 'Cable',
        quantity: '20.000',
        unit_price: '3.00',
        total_cost: '60.00'
      })
      .execute();

    const result = await getMonthlyReport({ month: '2024-01' });

    expect(result.month).toEqual('2024-01');
    expect(result.subscription_income).toEqual(75);
    expect(result.installation_income).toEqual(150);
    expect(result.total_income).toEqual(225);
    expect(result.material_expenses).toEqual(60);
    expect(result.net_balance).toEqual(165);
    expect(result.total_customers).toEqual(1);
    expect(result.new_installations).toEqual(1);
  });
});
