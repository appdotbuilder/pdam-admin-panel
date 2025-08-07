
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';
import { db } from './db';
import { usersTable, settingsTable } from './db/schema';
import { eq } from 'drizzle-orm';

// Import schemas
import { 
  createUserInputSchema, 
  loginInputSchema,
  createCustomerInputSchema,
  updateCustomerInputSchema,
  generateMonthlyBillsInputSchema,
  createPaymentInputSchema,
  createInstallationInputSchema,
  updateInstallationInputSchema,
  createInstallationMaterialInputSchema,
  createMaterialPresetInputSchema,
  updateSettingInputSchema,
  reportQuerySchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { login } from './handlers/login';
import { createCustomer } from './handlers/create_customer';
import { getCustomers } from './handlers/get_customers';
import { updateCustomer } from './handlers/update_customer';
import { generateMonthlyBills } from './handlers/generate_monthly_bills';
import { getMonthlyBills } from './handlers/get_monthly_bills';
import { createPayment } from './handlers/create_payment';
import { getPayments } from './handlers/get_payments';
import { getCustomerArrears } from './handlers/get_customer_arrears';
import { createInstallation } from './handlers/create_installation';
import { getInstallations } from './handlers/get_installations';
import { updateInstallation } from './handlers/update_installation';
import { createInstallationMaterial } from './handlers/create_installation_material';
import { getInstallationMaterials } from './handlers/get_installation_materials';
import { createMaterialPreset } from './handlers/create_material_preset';
import { getMaterialPresets } from './handlers/get_material_presets';
import { updateSetting } from './handlers/update_setting';
import { getSettings } from './handlers/get_settings';
import { getMonthlyReport } from './handlers/get_monthly_report';
import { getArrearsReport } from './handlers/get_arrears_report';
import { getInstallationReport } from './handlers/get_installation_report';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Demo data management
  seedDemoData: publicProcedure.mutation(async () => {
    await seedDemoData();
    return { success: true, message: 'Demo data seeded successfully' };
  }),

  verifyDemoCredentials: publicProcedure.query(async () => {
    const results = [];
    
    // Check admin
    const adminUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'admin'))
      .limit(1)
      .execute();

    if (adminUser.length > 0) {
      const adminVerification = await Bun.password.verify('admin123', adminUser[0].password_hash);
      results.push({
        username: 'admin',
        role: 'admin',
        exists: true,
        passwordValid: adminVerification
      });
    } else {
      results.push({
        username: 'admin',
        role: 'admin',
        exists: false,
        passwordValid: false
      });
    }

    // Check operator
    const operatorUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'operator'))
      .limit(1)
      .execute();

    if (operatorUser.length > 0) {
      const operatorVerification = await Bun.password.verify('operator123', operatorUser[0].password_hash);
      results.push({
        username: 'operator',
        role: 'operator',
        exists: true,
        passwordValid: operatorVerification
      });
    } else {
      results.push({
        username: 'operator',
        role: 'operator',
        exists: false,
        passwordValid: false
      });
    }

    return {
      success: true,
      accounts: results,
      allAccountsReady: results.every(r => r.exists && r.passwordValid)
    };
  }),

  // Authentication
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  // Customer Management
  createCustomer: publicProcedure
    .input(createCustomerInputSchema)
    .mutation(({ input }) => createCustomer(input)),
  getCustomers: publicProcedure
    .input(z.object({ customerId: z.number().optional() }).optional())
    .query(({ input }) => getCustomers(input?.customerId)),
  updateCustomer: publicProcedure
    .input(updateCustomerInputSchema)
    .mutation(({ input }) => updateCustomer(input)),

  // Monthly Billing
  generateMonthlyBills: publicProcedure
    .input(generateMonthlyBillsInputSchema)
    .mutation(({ input }) => generateMonthlyBills(input)),
  getMonthlyBills: publicProcedure
    .input(z.object({ 
      customerId: z.number().optional(), 
      month: z.string().optional() 
    }).optional())
    .query(({ input }) => getMonthlyBills(input?.customerId, input?.month)),

  // Payments
  createPayment: publicProcedure
    .input(createPaymentInputSchema)
    .mutation(({ input }) => createPayment(input)),
  getPayments: publicProcedure
    .input(z.object({ customerId: z.number().optional() }).optional())
    .query(({ input }) => getPayments(input?.customerId)),

  // Arrears Management
  getCustomerArrears: publicProcedure
    .input(z.object({ customerId: z.number().optional() }).optional())
    .query(({ input }) => getCustomerArrears(input?.customerId)),

  // Installation Management
  createInstallation: publicProcedure
    .input(createInstallationInputSchema)
    .mutation(({ input }) => createInstallation(input)),
  getInstallations: publicProcedure
    .input(z.object({ customerId: z.number().optional() }).optional())
    .query(({ input }) => getInstallations(input?.customerId)),
  updateInstallation: publicProcedure
    .input(updateInstallationInputSchema)
    .mutation(({ input }) => updateInstallation(input)),

  // Installation Materials
  createInstallationMaterial: publicProcedure
    .input(createInstallationMaterialInputSchema)
    .mutation(({ input }) => createInstallationMaterial(input)),
  getInstallationMaterials: publicProcedure
    .input(z.object({ installationId: z.number() }))
    .query(({ input }) => getInstallationMaterials(input.installationId)),

  // Material Presets
  createMaterialPreset: publicProcedure
    .input(createMaterialPresetInputSchema)
    .mutation(({ input }) => createMaterialPreset(input)),
  getMaterialPresets: publicProcedure
    .query(() => getMaterialPresets()),

  // Settings
  updateSetting: publicProcedure
    .input(updateSettingInputSchema)
    .mutation(({ input }) => updateSetting(input)),
  getSettings: publicProcedure
    .query(() => getSettings()),

  // Reports
  getMonthlyReport: publicProcedure
    .input(reportQuerySchema)
    .query(({ input }) => getMonthlyReport(input)),
  getArrearsReport: publicProcedure
    .query(() => getArrearsReport()),
  getInstallationReport: publicProcedure
    .input(reportQuerySchema)
    .query(({ input }) => getInstallationReport(input)),
});

export type AppRouter = typeof appRouter;

// Demo data seeding function
async function seedDemoData() {
  console.log('🌱 Starting demo data seeding...');
  
  try {
    // Check if admin user already exists
    const existingAdmin = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'admin'))
      .limit(1)
      .execute();

    if (existingAdmin.length === 0) {
      console.log('📝 Creating admin user...');
      const adminPasswordHash = await Bun.password.hash('admin123');
      
      const adminResult = await db.insert(usersTable)
        .values({
          username: 'admin',
          password_hash: adminPasswordHash,
          role: 'admin'
        })
        .returning()
        .execute();

      console.log('✅ Admin user created:', {
        id: adminResult[0].id,
        username: adminResult[0].username,
        role: adminResult[0].role
      });

      // Verify the password hash immediately
      const adminVerify = await Bun.password.verify('admin123', adminResult[0].password_hash);
      console.log('🔐 Admin password verification:', adminVerify);
    } else {
      console.log('ℹ️  Admin user already exists');
      
      // Verify existing admin password to ensure it works
      const adminVerify = await Bun.password.verify('admin123', existingAdmin[0].password_hash);
      console.log('🔐 Existing admin password verification:', adminVerify);
      
      // If verification fails, update the password
      if (!adminVerify) {
        console.log('🔧 Updating admin password...');
        const newAdminHash = await Bun.password.hash('admin123');
        await db.update(usersTable)
          .set({ password_hash: newAdminHash })
          .where(eq(usersTable.username, 'admin'))
          .execute();
        console.log('✅ Admin password updated');
      }
    }

    // Check if operator user already exists
    const existingOperator = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'operator'))
      .limit(1)
      .execute();

    if (existingOperator.length === 0) {
      console.log('📝 Creating operator user...');
      const operatorPasswordHash = await Bun.password.hash('operator123');
      
      const operatorResult = await db.insert(usersTable)
        .values({
          username: 'operator',
          password_hash: operatorPasswordHash,
          role: 'operator'
        })
        .returning()
        .execute();

      console.log('✅ Operator user created:', {
        id: operatorResult[0].id,
        username: operatorResult[0].username,
        role: operatorResult[0].role
      });

      // Verify the password hash immediately
      const operatorVerify = await Bun.password.verify('operator123', operatorResult[0].password_hash);
      console.log('🔐 Operator password verification:', operatorVerify);
    } else {
      console.log('ℹ️  Operator user already exists');
      
      // Verify existing operator password to ensure it works
      const operatorVerify = await Bun.password.verify('operator123', existingOperator[0].password_hash);
      console.log('🔐 Existing operator password verification:', operatorVerify);
      
      // If verification fails, update the password
      if (!operatorVerify) {
        console.log('🔧 Updating operator password...');
        const newOperatorHash = await Bun.password.hash('operator123');
        await db.update(usersTable)
          .set({ password_hash: newOperatorHash })
          .where(eq(usersTable.username, 'operator'))
          .execute();
        console.log('✅ Operator password updated');
      }
    }

    // Seed default settings if they don't exist
    const defaultSettings = [
      { key: 'monthly_subscription_fee', value: '30000' },
      { key: 'installation_fee', value: '300000' }
    ];

    for (const setting of defaultSettings) {
      const existingSetting = await db.select()
        .from(settingsTable)
        .where(eq(settingsTable.key, setting.key))
        .limit(1)
        .execute();

      if (existingSetting.length === 0) {
        await db.insert(settingsTable)
          .values(setting)
          .execute();
        console.log(`⚙️  Default setting created: ${setting.key} = ${setting.value}`);
      }
    }

    // Final verification - list all users
    const allUsers = await db.select()
      .from(usersTable)
      .execute();
    
    console.log('👥 All users in database:');
    for (const user of allUsers) {
      console.log(`  - ${user.username} (${user.role}) - ID: ${user.id}`);
    }

    console.log('🎉 Demo data seeding completed successfully!');
    console.log('');
    console.log('📋 Demo Credentials:');
    console.log('   Admin    → Username: admin,    Password: admin123');
    console.log('   Operator → Username: operator, Password: operator123');
    console.log('');

  } catch (error) {
    console.error('❌ Demo data seeding failed:', error);
  }
}

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  
  // Seed demo data on startup
  await seedDemoData();
  
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`PDAM Swadaya TRPC server listening at port: ${port}`);
}

start();
