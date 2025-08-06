
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

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
    .query(() => getCustomers()),
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

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
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
