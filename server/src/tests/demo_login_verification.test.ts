import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { login } from '../handlers/login';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';

describe('Demo Login Verification', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login with admin credentials after manual seeding', async () => {
    // Manually create admin user exactly as in production seeding
    const adminPasswordHash = await Bun.password.hash('admin123');
    
    await db.insert(usersTable)
      .values({
        username: 'admin',
        password_hash: adminPasswordHash,
        role: 'admin'
      })
      .execute();

    console.log('✅ Admin user manually seeded');

    // Verify the user exists in database
    const adminUser = await db.select()
      .from(usersTable)
      .execute();
    
    console.log('👥 Users in database:', adminUser.map(u => ({ 
      username: u.username, 
      role: u.role,
      hashLength: u.password_hash.length 
    })));

    // Test login with exact demo credentials
    const loginInput: LoginInput = {
      username: 'admin',
      password: 'admin123'
    };

    console.log('🔐 Attempting login with demo admin credentials...');
    const loginResult = await login(loginInput);

    console.log('📋 Login result:', {
      success: loginResult.success,
      hasUser: !!loginResult.user,
      hasToken: !!loginResult.token,
      username: loginResult.user?.username,
      role: loginResult.user?.role
    });

    // Assertions
    expect(loginResult.success).toBe(true);
    expect(loginResult.user).toBeDefined();
    expect(loginResult.user?.username).toBe('admin');
    expect(loginResult.user?.role).toBe('admin');
    expect(loginResult.token).toBeDefined();
    expect(typeof loginResult.token).toBe('string');
    expect(loginResult.token!.length).toBeGreaterThan(20);
  });

  it('should login with operator credentials after manual seeding', async () => {
    // Manually create operator user exactly as in production seeding
    const operatorPasswordHash = await Bun.password.hash('operator123');
    
    await db.insert(usersTable)
      .values({
        username: 'operator',
        password_hash: operatorPasswordHash,
        role: 'operator'
      })
      .execute();

    console.log('✅ Operator user manually seeded');

    // Test login with exact demo credentials
    const loginInput: LoginInput = {
      username: 'operator',
      password: 'operator123'
    };

    console.log('🔐 Attempting login with demo operator credentials...');
    const loginResult = await login(loginInput);

    console.log('📋 Login result:', {
      success: loginResult.success,
      hasUser: !!loginResult.user,
      hasToken: !!loginResult.token,
      username: loginResult.user?.username,
      role: loginResult.user?.role
    });

    // Assertions
    expect(loginResult.success).toBe(true);
    expect(loginResult.user).toBeDefined();
    expect(loginResult.user?.username).toBe('operator');
    expect(loginResult.user?.role).toBe('operator');
    expect(loginResult.token).toBeDefined();
    expect(typeof loginResult.token).toBe('string');
    expect(loginResult.token!.length).toBeGreaterThan(20);
  });

  it('should fail login with wrong demo passwords', async () => {
    // Create both demo users
    const adminHash = await Bun.password.hash('admin123');
    const operatorHash = await Bun.password.hash('operator123');
    
    await db.insert(usersTable)
      .values([
        {
          username: 'admin',
          password_hash: adminHash,
          role: 'admin'
        },
        {
          username: 'operator', 
          password_hash: operatorHash,
          role: 'operator'
        }
      ])
      .execute();

    // Test wrong passwords
    const wrongAdminLogin = await login({
      username: 'admin',
      password: 'wrongpassword'
    });

    const wrongOperatorLogin = await login({
      username: 'operator',
      password: 'wrongpassword'
    });

    expect(wrongAdminLogin.success).toBe(false);
    expect(wrongOperatorLogin.success).toBe(false);

    console.log('✅ Wrong passwords correctly rejected');
  });

  it('should demonstrate complete demo workflow', async () => {
    console.log('🎬 Starting complete demo workflow...');
    
    // Step 1: Seed demo data (simulate server startup)
    const demoUsers = [
      { username: 'admin', password: 'admin123', role: 'admin' as const },
      { username: 'operator', password: 'operator123', role: 'operator' as const }
    ];

    for (const demoUser of demoUsers) {
      const hash = await Bun.password.hash(demoUser.password);
      await db.insert(usersTable)
        .values({
          username: demoUser.username,
          password_hash: hash,
          role: demoUser.role
        })
        .execute();
      
      console.log(`✅ Seeded ${demoUser.role}: ${demoUser.username}`);
    }

    // Step 2: Verify both users can login
    for (const demoUser of demoUsers) {
      console.log(`🔐 Testing login for ${demoUser.username}...`);
      
      const loginResult = await login({
        username: demoUser.username,
        password: demoUser.password
      });

      expect(loginResult.success).toBe(true);
      expect(loginResult.user?.username).toBe(demoUser.username);
      expect(loginResult.user?.role).toBe(demoUser.role);
      expect(loginResult.token).toBeDefined();

      console.log(`✅ ${demoUser.username} login successful`);
    }

    // Step 3: Verify cross-authentication fails
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

    console.log('✅ Cross-authentication correctly blocked');
    console.log('🎉 Complete demo workflow successful!');
  });
});