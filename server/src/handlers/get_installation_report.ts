
import { db } from '../db';
import { installationsTable, customersTable } from '../db/schema';
import { type InstallationReport, type ReportQuery } from '../schema';
import { eq, and, gte, lte, type SQL } from 'drizzle-orm';

export async function getInstallationReport(query: ReportQuery): Promise<InstallationReport[]> {
  try {
    // Build conditions array for date filtering
    const conditions: SQL<unknown>[] = [];

    if (query.start_date) {
      conditions.push(gte(installationsTable.completed_date, query.start_date));
    }

    if (query.end_date) {
      conditions.push(lte(installationsTable.completed_date, query.end_date));
    }

    // Build the query with join and conditional where
    let baseQuery = db.select({
      installation_id: installationsTable.id,
      customer_name: customersTable.name,
      installation_fee: installationsTable.installation_fee,
      total_material_cost: installationsTable.total_material_cost,
      profit_loss: installationsTable.profit_loss,
      status: installationsTable.status,
      completed_date: installationsTable.completed_date
    })
    .from(installationsTable)
    .innerJoin(customersTable, eq(installationsTable.customer_id, customersTable.id));

    // Apply where clause conditionally
    const finalQuery = conditions.length > 0 
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    const results = await finalQuery.execute();

    // Convert numeric fields and return properly typed data
    return results.map(result => ({
      installation_id: result.installation_id,
      customer_name: result.customer_name,
      installation_fee: parseFloat(result.installation_fee),
      material_cost: parseFloat(result.total_material_cost),
      profit_loss: parseFloat(result.profit_loss),
      status: result.status,
      completed_date: result.completed_date
    }));
  } catch (error) {
    console.error('Installation report generation failed:', error);
    throw error;
  }
}
