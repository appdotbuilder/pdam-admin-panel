
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

const testInput: CreateUserInput = {
  username: 'testuser',
  password: 'testpassword123',
  role: 'operator'
};

const adminTestInput: CreateUserInput = {
  username: 'adminuser',
  password: 'adminpassword456',
  role: 'admin'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with hashed password', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.username).toEqual('testuser');
    expect(result.role).toEqual('operator');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    
    // Password should be hashed, not plain text
    expect(result.password_hash).not.toEqual('testpassword123');
    expect(result.password_hash.length).toBeGreaterThan(20);
    
    // Verify password hash is valid using Bun's verify
    const isValidHash = await Bun.password.verify('testpassword123', result.password_hash);
    expect(isValidHash).toBe(true);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].role).toEqual('operator');
    expect(users[0].created_at).toBeInstanceOf(Date);
    
    // Verify stored password hash works
    const isValidHash = await Bun.password.verify('testpassword123', users[0].password_hash);
    expect(isValidHash).toBe(true);
  });

  it('should create admin user', async () => {
    const result = await createUser(adminTestInput);

    expect(result.username).toEqual('adminuser');
    expect(result.role).toEqual('admin');
    expect(result.id).toBeDefined();
    
    // Verify password hash
    const isValidHash = await Bun.password.verify('adminpassword456', result.password_hash);
    expect(isValidHash).toBe(true);
  });

  it('should create unique users', async () => {
    const user1 = await createUser(testInput);
    
    const secondInput: CreateUserInput = {
      username: 'differentuser',
      password: 'differentpass',
      role: 'admin'
    };
    const user2 = await createUser(secondInput);

    expect(user1.id).not.toEqual(user2.id);
    expect(user1.username).not.toEqual(user2.username);
    expect(user1.role).not.toEqual(user2.role);
    
    // Verify both users exist in database
    const users = await db.select().from(usersTable).execute();
    expect(users).toHaveLength(2);
  });

  it('should reject duplicate usernames', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same username
    const duplicateInput: CreateUserInput = {
      username: 'testuser', // Same username
      password: 'differentpassword',
      role: 'admin'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow();
  });

  it('should hash different passwords differently', async () => {
    const user1 = await createUser({
      username: 'user1',
      password: 'password123',
      role: 'operator'
    });

    const user2 = await createUser({
      username: 'user2',
      password: 'password456',
      role: 'admin'
    });

    // Different passwords should not produce same hash (due to salt)
    expect(user1.password_hash).not.toEqual(user2.password_hash);
    
    // Verify each hash works with correct password
    const isValid1 = await Bun.password.verify('password123', user1.password_hash);
    const isValid2 = await Bun.password.verify('password456', user2.password_hash);
    expect(isValid1).toBe(true);
    expect(isValid2).toBe(true);
    
    // Verify cross-validation fails
    const crossValid1 = await Bun.password.verify('password456', user1.password_hash);
    const crossValid2 = await Bun.password.verify('password123', user2.password_hash);
    expect(crossValid1).toBe(false);
    expect(crossValid2).toBe(false);
  });

  it('should verify wrong password returns false', async () => {
    const result = await createUser(testInput);

    // Test with wrong password
    const isValidHash = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isValidHash).toBe(false);
  });
});
