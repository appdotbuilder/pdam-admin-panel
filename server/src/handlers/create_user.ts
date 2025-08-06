
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Trim inputs to handle potential whitespace
    const trimmedUsername = input.username.trim();
    const trimmedPassword = input.password.trim();
    
    console.log('Creating user:', trimmedUsername, 'with role:', input.role);
    console.log('Username length:', trimmedUsername.length);
    console.log('Original password length:', trimmedPassword.length);
    
    // Hash the password using Bun's built-in password hashing
    const password_hash = await Bun.password.hash(trimmedPassword);
    console.log('Password hashed successfully, hash length:', password_hash.length);
    
    // Verify the hash works immediately after creation
    const immediateVerification = await Bun.password.verify(trimmedPassword, password_hash);
    console.log('Immediate hash verification:', immediateVerification);

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: trimmedUsername,
        password_hash,
        role: input.role
      })
      .returning()
      .execute();

    const user = result[0];
    console.log('User created successfully with ID:', user.id);
    
    return user;
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};
