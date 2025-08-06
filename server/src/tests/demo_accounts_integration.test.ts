import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { createUser } from '../handlers/create_user';
import { login } from '../handlers/login';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateUserInput, type LoginInput } from '../schema';

describe('Demo Accounts Integration Tests', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create and login with admin demo account', async () => {
    // Create admin user exactly as it would be in production
    const adminInput: CreateUserInput = {
      username: 'admin',
      password: 'admin123',
      role: 'admin'
    };

    console.log('🔧 Creating admin user...');
    const createdAdmin = await createUser(adminInput);
    
    // Verify user creation
    expect(createdAdmin.username).toBe('admin');
    expect(createdAdmin.role).toBe('admin');
    expect(createdAdmin.id).toBeDefined();
    expect(createdAdmin.password_hash).toBeDefined();
    expect(createdAdmin.password_hash.length).toBeGreaterThan(20);

    console.log('✅ Admin created:', {
      id: createdAdmin.id,
      username: createdAdmin.username,
      role: createdAdmin.role,
      hashLength: createdAdmin.password_hash.length
    });

    // Verify password hash works immediately
    const immediateVerify = await Bun.password.verify('admin123', createdAdmin.password_hash);
    expect(immediateVerify).toBe(true);
    console.log('✅ Immediate password verification passed');

    // Now test login
    const loginInput: LoginInput = {
      username: 'admin',
      password: 'admin123'
    };

    console.log('🔐 Attempting admin login...');
    const loginResult = await login(loginInput);

    // Verify login success
    expect(loginResult.success).toBe(true);
    expect(loginResult.user).toBeDefined();
    expect(loginResult.user?.username).toBe('admin');
    expect(loginResult.user?.role).toBe('admin');
    expect(loginResult.user?.id).toBe(createdAdmin.id);
    expect(loginResult.token).toBeDefined();

    console.log('✅ Admin login successful:', {
      username: loginResult.user?.username,
      role: loginResult.user?.role,
      hasToken: !!loginResult.token
    });
  });

  it('should create and login with operator demo account', async () => {
    // Create operator user exactly as it would be in production
    const operatorInput: CreateUserInput = {
      username: 'operator',
      password: 'operator123',
      role: 'operator'
    };

    console.log('🔧 Creating operator user...');
    const createdOperator = await createUser(operatorInput);
    
    // Verify user creation
    expect(createdOperator.username).toBe('operator');
    expect(createdOperator.role).toBe('operator');
    expect(createdOperator.id).toBeDefined();
    expect(createdOperator.password_hash).toBeDefined();
    expect(createdOperator.password_hash.length).toBeGreaterThan(20);

    console.log('✅ Operator created:', {
      id: createdOperator.id,
      username: createdOperator.username,
      role: createdOperator.role,
      hashLength: createdOperator.password_hash.length
    });

    // Verify password hash works immediately
    const immediateVerify = await Bun.password.verify('operator123', createdOperator.password_hash);
    expect(immediateVerify).toBe(true);
    console.log('✅ Immediate password verification passed');

    // Now test login
    const loginInput: LoginInput = {
      username: 'operator',
      password: 'operator123'
    };

    console.log('🔐 Attempting operator login...');
    const loginResult = await login(loginInput);

    // Verify login success
    expect(loginResult.success).toBe(true);
    expect(loginResult.user).toBeDefined();
    expect(loginResult.user?.username).toBe('operator');
    expect(loginResult.user?.role).toBe('operator');
    expect(loginResult.user?.id).toBe(createdOperator.id);
    expect(loginResult.token).toBeDefined();

    console.log('✅ Operator login successful:', {
      username: loginResult.user?.username,
      role: loginResult.user?.role,
      hasToken: !!loginResult.token
    });
  });

  it('should handle wrong passwords correctly', async () => {
    // Create admin user
    const adminInput: CreateUserInput = {
      username: 'admin',
      password: 'admin123',
      role: 'admin'
    };
    await createUser(adminInput);

    // Try login with wrong password
    const wrongPasswordLogin: LoginInput = {
      username: 'admin',
      password: 'wrongpassword'
    };

    console.log('🔐 Attempting login with wrong password...');
    const loginResult = await login(wrongPasswordLogin);

    // Should fail
    expect(loginResult.success).toBe(false);
    expect(loginResult.user).toBeUndefined();
    expect(loginResult.token).toBeUndefined();

    console.log('✅ Wrong password login correctly failed');
  });

  it('should handle case sensitivity correctly', async () => {
    // Create user with lowercase username
    const userInput: CreateUserInput = {
      username: 'admin',
      password: 'admin123',
      role: 'admin'
    };
    await createUser(userInput);

    // Try login with different case - should fail (case sensitive)
    const wrongCaseLogin: LoginInput = {
      username: 'Admin',
      password: 'admin123'
    };

    console.log('🔐 Attempting login with wrong case...');
    const loginResult = await login(wrongCaseLogin);

    // Should fail because usernames are case-sensitive
    expect(loginResult.success).toBe(false);

    // But correct case should work
    const correctLogin: LoginInput = {
      username: 'admin',
      password: 'admin123'
    };

    const correctLoginResult = await login(correctLogin);
    expect(correctLoginResult.success).toBe(true);

    console.log('✅ Case sensitivity handled correctly');
  });

  it('should handle whitespace in credentials', async () => {
    // Create user normally
    const userInput: CreateUserInput = {
      username: 'admin',
      password: 'admin123',
      role: 'admin'
    };
    await createUser(userInput);

    // Try login with whitespace - should work due to Zod trimming
    const whitespaceLogin: LoginInput = {
      username: '  admin  ',
      password: '  admin123  '
    };

    console.log('🔐 Attempting login with whitespace...');
    const loginResult = await login(whitespaceLogin);

    expect(loginResult.success).toBe(true);
    expect(loginResult.user?.username).toBe('admin');

    console.log('✅ Whitespace handling works correctly');
  });

  it('should verify both demo accounts can coexist', async () => {
    // Create both demo accounts
    const adminInput: CreateUserInput = {
      username: 'admin',
      password: 'admin123',
      role: 'admin'
    };
    const operatorInput: CreateUserInput = {
      username: 'operator',
      password: 'operator123',
      role: 'operator'
    };

    const adminUser = await createUser(adminInput);
    const operatorUser = await createUser(operatorInput);

    // Verify they have different IDs and hashes
    expect(adminUser.id).not.toBe(operatorUser.id);
    expect(adminUser.password_hash).not.toBe(operatorUser.password_hash);

    // Both should be able to login successfully
    const adminLogin = await login({
      username: 'admin',
      password: 'admin123'
    });
    const operatorLogin = await login({
      username: 'operator',
      password: 'operator123'
    });

    expect(adminLogin.success).toBe(true);
    expect(adminLogin.user?.role).toBe('admin');
    expect(operatorLogin.success).toBe(true);
    expect(operatorLogin.user?.role).toBe('operator');

    // Cross-login should fail
    const crossLogin1 = await login({
      username: 'admin',
      password: 'operator123'
    });
    const crossLogin2 = await login({
      username: 'operator',
      password: 'admin123'
    });

    expect(crossLogin1.success).toBe(false);
    expect(crossLogin2.success).toBe(false);

    console.log('✅ Both demo accounts coexist and work independently');
  });

  it('should verify database persistence', async () => {
    // Create admin user
    const adminInput: CreateUserInput = {
      username: 'admin',
      password: 'admin123',
      role: 'admin'
    };
    const createdUser = await createUser(adminInput);

    // Query directly from database
    const dbUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'admin'))
      .execute();

    expect(dbUsers.length).toBe(1);
    expect(dbUsers[0].id).toBe(createdUser.id);
    expect(dbUsers[0].username).toBe('admin');
    expect(dbUsers[0].role).toBe('admin');

    // Verify stored hash works
    const hashVerification = await Bun.password.verify('admin123', dbUsers[0].password_hash);
    expect(hashVerification).toBe(true);

    console.log('✅ Database persistence verified');
  });

  it('should simulate production seeding scenario', async () => {
    console.log('🌱 Simulating production seeding...');

    // This simulates what happens in the server startup seeding
    const demoAccounts = [
      { username: 'admin', password: 'admin123', role: 'admin' as const },
      { username: 'operator', password: 'operator123', role: 'operator' as const }
    ];

    const createdUsers = [];

    for (const account of demoAccounts) {
      // Check if user exists (like in production seeding)
      const existing = await db.select()
        .from(usersTable)
        .where(eq(usersTable.username, account.username))
        .execute();

      if (existing.length === 0) {
        // Create user
        const user = await createUser(account);
        createdUsers.push(user);
        console.log(`✅ Created ${account.role}: ${account.username}`);

        // Immediate verification
        const verify = await Bun.password.verify(account.password, user.password_hash);
        expect(verify).toBe(true);
      }
    }

    // Test login for all created accounts
    for (const account of demoAccounts) {
      const loginResult = await login({
        username: account.username,
        password: account.password
      });

      expect(loginResult.success).toBe(true);
      expect(loginResult.user?.username).toBe(account.username);
      expect(loginResult.user?.role).toBe(account.role);
      console.log(`✅ Login verified for ${account.role}: ${account.username}`);
    }

    console.log('🎉 Production seeding simulation successful!');
  });
});