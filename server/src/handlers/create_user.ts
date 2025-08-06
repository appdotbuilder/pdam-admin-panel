
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Trim inputs to handle potential whitespace (even though Zod should handle this)
    const trimmedUsername = input.username.trim();
    const trimmedPassword = input.password.trim();
    
    console.log('👤 Creating user:', `"${trimmedUsername}"`, 'with role:', input.role);
    console.log('   Username length:', trimmedUsername.length);
    console.log('   Password length:', trimmedPassword.length);
    console.log('   Username chars:', [...trimmedUsername].map(c => c.charCodeAt(0)));
    
    // Validate trimmed inputs
    if (!trimmedUsername || !trimmedPassword) {
      throw new Error('Username and password cannot be empty');
    }
    
    // Hash the password using Bun's built-in password hashing
    console.log('🔐 Hashing password...');
    const password_hash = await Bun.password.hash(trimmedPassword);
    console.log('✅ Password hashed successfully');
    console.log('   Hash length:', password_hash.length);
    console.log('   Hash prefix:', password_hash.substring(0, 20) + '...');
    
    // Verify the hash works immediately after creation
    console.log('🔍 Verifying hash immediately...');
    const immediateVerification = await Bun.password.verify(trimmedPassword, password_hash);
    console.log('✅ Immediate hash verification:', immediateVerification);
    
    if (!immediateVerification) {
      throw new Error('Password hash verification failed immediately after creation');
    }

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
    console.log('✅ User created successfully:', {
      id: user.id,
      username: user.username,
      role: user.role,
      created_at: user.created_at
    });
    
    // Final verification that the stored user can be used for login
    console.log('🔍 Final verification of stored user...');
    const finalVerification = await Bun.password.verify(trimmedPassword, user.password_hash);
    console.log('✅ Final stored user verification:', finalVerification);
    
    if (!finalVerification) {
      console.error('❌ CRITICAL: User created but password verification fails!');
      throw new Error('User created but password verification fails');
    }
    
    return user;
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};
