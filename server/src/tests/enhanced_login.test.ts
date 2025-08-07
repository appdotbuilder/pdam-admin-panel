import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { login } from '../handlers/login';

const testAdminUser: CreateUserInput = {
  username: 'testadmin',
  password: 'admin123456',
  role: 'admin'
};

const testOperatorUser: CreateUserInput = {
  username: 'testoperator',
  password: 'operator123456',
  role: 'operator'
};

describe('Enhanced Login Functionality', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create user and verify password immediately', async () => {
    console.log('🧪 Testing user creation with immediate verification...');
    
    const user = await createUser(testAdminUser);

    expect(user.id).toBeDefined();
    expect(user.username).toEqual('testadmin');
    expect(user.role).toEqual('admin');
    expect(user.password_hash).toBeDefined();
    expect(user.created_at).toBeInstanceOf(Date);

    // Verify we can immediately log in with the created user
    const loginResult = await login({
      username: 'testadmin',
      password: 'admin123456'
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.user).toBeDefined();
    expect(loginResult.user.id).toEqual(user.id);
    expect(loginResult.token).toBeDefined();
  });

  it('should handle login with whitespace trimming', async () => {
    console.log('🧪 Testing login with whitespace handling...');
    
    await createUser(testOperatorUser);

    // Test login with extra whitespace
    const loginResult = await login({
      username: '  testoperator  ',
      password: '  operator123456  '
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.user).toBeDefined();
    expect(loginResult.user.username).toEqual('testoperator');
  });

  it('should fail login with wrong password', async () => {
    console.log('🧪 Testing login failure with wrong password...');
    
    await createUser(testAdminUser);

    const loginResult = await login({
      username: 'testadmin',
      password: 'wrongpassword'
    });

    expect(loginResult.success).toBe(false);
    expect(loginResult.user).toBeUndefined();
    expect(loginResult.token).toBeUndefined();
  });

  it('should fail login with non-existent user', async () => {
    console.log('🧪 Testing login failure with non-existent user...');
    
    const loginResult = await login({
      username: 'nonexistent',
      password: 'anypassword'
    });

    expect(loginResult.success).toBe(false);
    expect(loginResult.user).toBeUndefined();
    expect(loginResult.token).toBeUndefined();
  });

  it('should prevent duplicate user creation', async () => {
    console.log('🧪 Testing duplicate user prevention...');
    
    await createUser(testAdminUser);

    // Try to create the same user again
    await expect(createUser(testAdminUser)).rejects.toThrow(/already exists/i);
  });

  it('should handle empty credentials', async () => {
    console.log('🧪 Testing empty credentials handling...');
    
    const loginResult1 = await login({
      username: '',
      password: 'password'
    });

    const loginResult2 = await login({
      username: 'username',
      password: ''
    });

    expect(loginResult1.success).toBe(false);
    expect(loginResult2.success).toBe(false);
  });

  it('should create multiple users and verify login for each', async () => {
    console.log('🧪 Testing multiple user creation and login...');
    
    const admin = await createUser(testAdminUser);
    const operator = await createUser(testOperatorUser);

    // Test admin login
    const adminLogin = await login({
      username: 'testadmin',
      password: 'admin123456'
    });

    expect(adminLogin.success).toBe(true);
    expect(adminLogin.user.role).toEqual('admin');

    // Test operator login
    const operatorLogin = await login({
      username: 'testoperator',
      password: 'operator123456'
    });

    expect(operatorLogin.success).toBe(true);
    expect(operatorLogin.user.role).toEqual('operator');
  });
});