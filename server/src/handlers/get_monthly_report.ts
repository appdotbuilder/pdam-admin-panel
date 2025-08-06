
import { db } from '../db';
import { customersTable, monthlyBillsTable, paymentsTable, installationsTable, installationMaterialsTable } from '../db/schema';
import { type MonthlyReport, type ReportQuery } from '../schema';
import { eq, and, gte, lte, between } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function getMonthlyReport(query: ReportQuery): Promise<MonthlyReport> {
  try {
    // Use provided month or default to current month
    const reportMonth = query.month || new Date().toISOString().substring(0, 7);
    
    // Calculate date range for the month
    const startDate = new Date(`${reportMonth}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);

    // Calculate subscription income from payments for bills in this month
    const subscriptionIncomeResult = await db.select({
      total: sql<string>`COALESCE(SUM(${paymentsTable.amount}), 0)`
    })
    .from(paymentsTable)
    .innerJoin(monthlyBillsTable, eq(paymentsTable.bill_id, monthlyBillsTable.id))
    .where(
      and(
        eq(monthlyBillsTable.bill_month, reportMonth),
        between(paymentsTable.payment_date, startDate, endDate)
      )
    )
    .execute();

    const subscriptionIncome = parseFloat(subscriptionIncomeResult[0]?.total || '0');

    // Calculate installation income from installations completed in this month
    const installationIncomeResult = await db.select({
      total: sql<string>`COALESCE(SUM(${installationsTable.installation_fee}), 0)`
    })
    .from(installationsTable)
    .where(
      and(
        eq(installationsTable.fee_paid, true),
        between(installationsTable.completed_date, startDate, endDate)
      )
    )
    .execute();

    const installationIncome = parseFloat(installationIncomeResult[0]?.total || '0');

    // Calculate material expenses for installations completed in this month
    const materialExpensesResult = await db.select({
      total: sql<string>`COALESCE(SUM(${installationMaterialsTable.total_cost}), 0)`
    })
    .from(installationMaterialsTable)
    .innerJoin(installationsTable, eq(installationMaterialsTable.installation_id, installationsTable.id))
    .where(
      between(installationsTable.completed_date, startDate, endDate)
    )
    .execute();

    const materialExpenses = parseFloat(materialExpensesResult[0]?.total || '0');

    // Calculate total customers (all active customers)
    const totalCustomersResult = await db.select({
      count: sql<string>`COUNT(*)`
    })
    .from(customersTable)
    .where(eq(customersTable.status, 'active'))
    .execute();

    const totalCustomers = parseInt(totalCustomersResult[0]?.count || '0');

    // Count new installations completed in this month
    const newInstallationsResult = await db.select({
      count: sql<string>`COUNT(*)`
    })
    .from(installationsTable)
    .where(
      and(
        eq(installationsTable.status, 'completed'),
        between(installationsTable.completed_date, startDate, endDate)
      )
    )
    .execute();

    const newInstallations = parseInt(newInstallationsResult[0]?.count || '0');

    // Calculate totals
    const totalIncome = subscriptionIncome + installationIncome;
    const netBalance = totalIncome - materialExpenses;

    return {
      month: reportMonth,
      subscription_income: subscriptionIncome,
      installation_income: installationIncome,
      total_income: totalIncome,
      material_expenses: materialExpenses,
      net_balance: netBalance,
      total_customers: totalCustomers,
      new_installations: newInstallations
    };
  } catch (error) {
    console.error('Monthly report generation failed:', error);
    throw error;
  }
}
