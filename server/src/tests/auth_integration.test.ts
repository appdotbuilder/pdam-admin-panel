import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { createUser } from '../handlers/create_user';
import { login } from '../handlers/login';
import { type CreateUserInput, type LoginInput } from '../schema';

describe('Authentication Integration', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create user and login successfully', async () => {
    // Create a test user
    const createUserInput: CreateUserInput = {
      username: 'testuser',
      password: 'testpass123',
      role: 'admin'
    };

    const createdUser = await createUser(createUserInput);
    
    // Verify user was created
    expect(createdUser.username).toBe('testuser');
    expect(createdUser.role).toBe('admin');
    expect(createdUser.id).toBeDefined();

    // Now try to login with the same credentials
    const loginInput: LoginInput = {
      username: 'testuser',
      password: 'testpass123'
    };

    const loginResult = await login(loginInput);

    // Verify login was successful
    expect(loginResult.success).toBe(true);
    expect(loginResult.user).toBeDefined();
    expect(loginResult.user?.username).toBe('testuser');
    expect(loginResult.user?.role).toBe('admin');
    expect(loginResult.user?.id).toBe(createdUser.id);
    expect(loginResult.token).toBeDefined();
  });

  it('should handle whitespace in credentials correctly', async () => {
    // Create a user (Zod will trim the inputs automatically)
    const createUserInput: CreateUserInput = {
      username: '  spaceuser  ', // This will be trimmed to 'spaceuser' by Zod
      password: '  spacepass123  ', // This will be trimmed by Zod
      role: 'operator'
    };

    const createdUser = await createUser(createUserInput);
    // After creation, username should be trimmed
    expect(createdUser.username).toBe('spaceuser');

    // Login with the trimmed values should work
    const loginInput: LoginInput = {
      username: 'spaceuser',
      password: 'spacepass123'
    };

    const loginResult = await login(loginInput);

    // Should succeed
    expect(loginResult.success).toBe(true);
    expect(loginResult.user?.username).toBe('spaceuser');
    
    // Also test login with whitespace (which will be trimmed by Zod)
    const loginWithWhitespace: LoginInput = {
      username: '  spaceuser  ',
      password: '  spacepass123  '
    };

    const loginWithWhitespaceResult = await login(loginWithWhitespace);
    expect(loginWithWhitespaceResult.success).toBe(true);
    expect(loginWithWhitespaceResult.user?.username).toBe('spaceuser');
  });

  it('should fail login with wrong password', async () => {
    // Create a user
    const createUserInput: CreateUserInput = {
      username: 'wrongpassuser',
      password: 'correctpass',
      role: 'admin'
    };

    await createUser(createUserInput);

    // Try login with wrong password
    const loginInput: LoginInput = {
      username: 'wrongpassuser',
      password: 'wrongpass'
    };

    const loginResult = await login(loginInput);

    expect(loginResult.success).toBe(false);
    expect(loginResult.user).toBeUndefined();
    expect(loginResult.token).toBeUndefined();
  });

  it('should fail login with non-existent user', async () => {
    const loginInput: LoginInput = {
      username: 'nonexistent',
      password: 'anypassword'
    };

    const loginResult = await login(loginInput);

    expect(loginResult.success).toBe(false);
    expect(loginResult.user).toBeUndefined();
    expect(loginResult.token).toBeUndefined();
  });

  it('should create different users with different passwords', async () => {
    // Create first user
    const user1Input: CreateUserInput = {
      username: 'user1',
      password: 'pass1',
      role: 'admin'
    };
    const user1 = await createUser(user1Input);

    // Create second user
    const user2Input: CreateUserInput = {
      username: 'user2',
      password: 'pass2', 
      role: 'operator'
    };
    const user2 = await createUser(user2Input);

    // Verify they have different hashes
    expect(user1.password_hash).not.toBe(user2.password_hash);

    // Test login for user1
    const login1Result = await login({
      username: 'user1',
      password: 'pass1'
    });
    expect(login1Result.success).toBe(true);
    expect(login1Result.user?.username).toBe('user1');
    expect(login1Result.user?.role).toBe('admin');

    // Test login for user2
    const login2Result = await login({
      username: 'user2',
      password: 'pass2'
    });
    expect(login2Result.success).toBe(true);
    expect(login2Result.user?.username).toBe('user2');
    expect(login2Result.user?.role).toBe('operator');

    // Cross-login should fail
    const crossLogin1 = await login({
      username: 'user1',
      password: 'pass2'
    });
    expect(crossLogin1.success).toBe(false);

    const crossLogin2 = await login({
      username: 'user2', 
      password: 'pass1'
    });
    expect(crossLogin2.success).toBe(false);
  });

  it('should create admin user for PDAM system', async () => {
    // Create default admin for PDAM system
    const adminInput: CreateUserInput = {
      username: 'admin',
      password: 'admin123',
      role: 'admin'
    };

    const adminUser = await createUser(adminInput);
    expect(adminUser.username).toBe('admin');
    expect(adminUser.role).toBe('admin');

    // Test admin login
    const adminLoginResult = await login({
      username: 'admin',
      password: 'admin123'
    });

    expect(adminLoginResult.success).toBe(true);
    expect(adminLoginResult.user?.username).toBe('admin');
    expect(adminLoginResult.user?.role).toBe('admin');
    expect(adminLoginResult.token).toBeDefined();

    console.log('✅ Default admin user test completed successfully');
    console.log('   Username: admin');  
    console.log('   Password: admin123');
    console.log('   Role: admin');
  });

  it('should create operator user for PDAM system', async () => {
    // Create operator for PDAM system
    const operatorInput: CreateUserInput = {
      username: 'operator',
      password: 'operator123',
      role: 'operator'
    };

    const operatorUser = await createUser(operatorInput);
    expect(operatorUser.username).toBe('operator');
    expect(operatorUser.role).toBe('operator');

    // Test operator login
    const operatorLoginResult = await login({
      username: 'operator',
      password: 'operator123'
    });

    expect(operatorLoginResult.success).toBe(true);
    expect(operatorLoginResult.user?.username).toBe('operator');
    expect(operatorLoginResult.user?.role).toBe('operator');
    expect(operatorLoginResult.token).toBeDefined();

    console.log('✅ Default operator user test completed successfully');
    console.log('   Username: operator');  
    console.log('   Password: operator123');
    console.log('   Role: operator');
  });

  it('should handle common Indonesian username/password combinations', async () => {
    // Test with common Indonesian admin credentials
    const adminInput: CreateUserInput = {
      username: 'administrator',
      password: 'password123',
      role: 'admin'
    };

    await createUser(adminInput);

    // Test successful login
    const successLogin = await login({
      username: 'administrator',
      password: 'password123'
    });
    expect(successLogin.success).toBe(true);

    // Test failed login to simulate 'username dan password salah' scenario
    const failedLogin = await login({
      username: 'administrator',
      password: 'wrongpassword'
    });
    expect(failedLogin.success).toBe(false);

    // Test with wrong username
    const wrongUserLogin = await login({
      username: 'wronguser',
      password: 'password123'
    });
    expect(wrongUserLogin.success).toBe(false);
  });

  it('should handle special characters in passwords', async () => {
    const userInput: CreateUserInput = {
      username: 'specialuser',
      password: 'P@ssw0rd!123',
      role: 'admin'
    };

    await createUser(userInput);

    const loginResult = await login({
      username: 'specialuser',
      password: 'P@ssw0rd!123'
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.user?.username).toBe('specialuser');
  });
});