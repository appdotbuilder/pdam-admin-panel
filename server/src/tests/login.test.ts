
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login } from '../handlers/login';

const testUser = {
  username: 'testuser',
  password: 'password123',
  role: 'admin' as const
};

const testInput: LoginInput = {
  username: 'testuser',
  password: 'password123'
};

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login successfully with correct credentials', async () => {
    // Create test user with hashed password
    const hashedPassword = await Bun.password.hash(testUser.password);
    await db.insert(usersTable)
      .values({
        username: testUser.username,
        password_hash: hashedPassword,
        role: testUser.role
      })
      .execute();

    const result = await login(testInput);

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.username).toBe('testuser');
    expect(result.user?.role).toBe('admin');
    expect(result.user?.id).toBeDefined();
    expect(result.user?.created_at).toBeInstanceOf(Date);
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
  });

  it('should fail login with incorrect password', async () => {
    // Create test user with hashed password
    const hashedPassword = await Bun.password.hash(testUser.password);
    await db.insert(usersTable)
      .values({
        username: testUser.username,
        password_hash: hashedPassword,
        role: testUser.role
      })
      .execute();

    const wrongPasswordInput: LoginInput = {
      username: 'testuser',
      password: 'wrongpassword'
    };

    const result = await login(wrongPasswordInput);

    expect(result.success).toBe(false);
    expect(result.user).toBeUndefined();
    expect(result.token).toBeUndefined();
  });

  it('should fail login with non-existent username', async () => {
    const nonExistentInput: LoginInput = {
      username: 'nonexistent',
      password: 'password123'
    };

    const result = await login(nonExistentInput);

    expect(result.success).toBe(false);
    expect(result.user).toBeUndefined();
    expect(result.token).toBeUndefined();
  });

  it('should return valid JWT token on successful login', async () => {
    // Create test user with hashed password
    const hashedPassword = await Bun.password.hash(testUser.password);
    await db.insert(usersTable)
      .values({
        username: testUser.username,
        password_hash: hashedPassword,
        role: testUser.role
      })
      .execute();

    const result = await login(testInput);

    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();

    // Verify JWT token structure (basic check)
    const tokenParts = result.token!.split('.');
    expect(tokenParts).toHaveLength(3); // Header, payload, signature

    // Decode payload to verify contents (simple base64 decode)
    const payloadBase64 = tokenParts[1];
    // Add padding if needed for proper base64 decoding
    const paddedPayload = payloadBase64 + '='.repeat((4 - payloadBase64.length % 4) % 4);
    const payload = JSON.parse(atob(paddedPayload));
    
    expect(payload.username).toBe('testuser');
    expect(payload.role).toBe('admin');
    expect(payload.userId).toBeDefined();
    expect(payload.exp).toBeDefined();
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
