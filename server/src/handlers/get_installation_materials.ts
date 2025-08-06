
import { db } from '../db';
import { installationMaterialsTable } from '../db/schema';
import { type InstallationMaterial } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getInstallationMaterials = async (installationId: number): Promise<InstallationMaterial[]> => {
  try {
    const results = await db.select()
      .from(installationMaterialsTable)
      .where(eq(installationMaterialsTable.installation_id, installationId))
      .orderBy(asc(installationMaterialsTable.created_at))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(material => ({
      ...material,
      quantity: parseFloat(material.quantity),
      unit_price: parseFloat(material.unit_price),
      total_cost: parseFloat(material.total_cost)
    }));
  } catch (error) {
    console.error('Failed to get installation materials:', error);
    throw error;
  }
};
