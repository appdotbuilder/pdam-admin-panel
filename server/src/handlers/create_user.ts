
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Ensure consistent trimming of inputs 
    const trimmedUsername = input.username.trim();
    const trimmedPassword = input.password.trim();
    
    console.log('👤 USER CREATION STARTED:', {
      username: `"${trimmedUsername}"`,
      role: input.role,
      usernameLength: trimmedUsername.length,
      passwordLength: trimmedPassword.length,
      usernameBytes: [...trimmedUsername].map(c => c.charCodeAt(0)),
      timestamp: new Date().toISOString()
    });
    
    // Enhanced validation with detailed logging
    if (!trimmedUsername || !trimmedPassword) {
      const error = new Error('Username and password cannot be empty after trimming');
      console.error('❌ VALIDATION FAILED:', {
        originalUsernameLength: input.username.length,
        originalPasswordLength: input.password.length,
        trimmedUsernameLength: trimmedUsername.length,
        trimmedPasswordLength: trimmedPassword.length,
        error: error.message
      });
      throw error;
    }
    
    // Check if user already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, trimmedUsername))
      .execute();
      
    if (existingUsers.length > 0) {
      const error = new Error(`User with username "${trimmedUsername}" already exists`);
      console.error('❌ USER ALREADY EXISTS:', {
        username: trimmedUsername,
        existingUserId: existingUsers[0].id,
        error: error.message
      });
      throw error;
    }
    
    // Hash the password with enhanced logging
    console.log('🔐 HASHING PASSWORD...');
    let password_hash: string;
    
    try {
      password_hash = await Bun.password.hash(trimmedPassword);
      console.log('✅ PASSWORD HASHED SUCCESSFULLY:', {
        hashLength: password_hash.length,
        hashPrefix: password_hash.substring(0, 20) + '...',
        hashSuffix: '...' + password_hash.substring(password_hash.length - 10)
      });
    } catch (hashError: any) {
      console.error('❌ PASSWORD HASHING FAILED:', hashError);
      throw new Error(`Password hashing failed: ${hashError?.message || 'Unknown error'}`);
    }
    
    // Immediate verification of the hash
    console.log('🔍 IMMEDIATE HASH VERIFICATION...');
    let immediateVerification = false;
    try {
      immediateVerification = await Bun.password.verify(trimmedPassword, password_hash);
      console.log('✅ IMMEDIATE VERIFICATION RESULT:', immediateVerification);
    } catch (verifyError: any) {
      console.error('❌ IMMEDIATE VERIFICATION ERROR:', verifyError);
      throw new Error(`Immediate hash verification failed: ${verifyError?.message || 'Unknown error'}`);
    }
    
    if (!immediateVerification) {
      const error = new Error('Password hash verification failed immediately after creation');
      console.error('❌ CRITICAL HASH VERIFICATION FAILURE:', {
        passwordLength: trimmedPassword.length,
        hashLength: password_hash.length,
        error: error.message
      });
      throw error;
    }

    // Insert user record
    console.log('💾 INSERTING USER INTO DATABASE...');
    const result = await db.insert(usersTable)
      .values({
        username: trimmedUsername,
        password_hash,
        role: input.role
      })
      .returning()
      .execute();

    const user = result[0];
    console.log('✅ USER RECORD CREATED:', {
      id: user.id,
      username: `"${user.username}"`,
      role: user.role,
      created_at: user.created_at,
      passwordHashStored: !!user.password_hash,
      storedHashLength: user.password_hash.length
    });
    
    // Final comprehensive verification of the stored user
    console.log('🔍 FINAL VERIFICATION OF STORED USER...');
    let finalVerification = false;
    try {
      finalVerification = await Bun.password.verify(trimmedPassword, user.password_hash);
      console.log('✅ FINAL VERIFICATION RESULT:', finalVerification);
    } catch (finalVerifyError) {
      console.error('❌ FINAL VERIFICATION ERROR:', finalVerifyError);
    }
    
    if (!finalVerification) {
      console.error('❌ CRITICAL ERROR: User created but final verification fails!');
      console.error('   This indicates a serious issue with the password storage system');
      
      // Attempt to delete the problematic user record
      try {
        await db.delete(usersTable).where(eq(usersTable.id, user.id)).execute();
        console.log('🗑️  Deleted problematic user record');
      } catch (deleteError) {
        console.error('❌ Failed to delete problematic user:', deleteError);
      }
      
      throw new Error('User created but password verification fails - user record deleted');
    }
    
    // Success confirmation with detailed logging
    console.log('🎉 USER CREATION COMPLETED SUCCESSFULLY:', {
      id: user.id,
      username: user.username,
      role: user.role,
      passwordVerificationConfirmed: true,
      readyForLogin: true
    });
    
    return user;
  } catch (error: any) {
    console.error('❌ USER CREATION FAILED:', {
      error: error?.message || 'Unknown error',
      errorType: error?.constructor?.name || 'Unknown',
      username: input.username,
      role: input.role
    });
    if (error?.stack) {
      console.error('   Stack trace:', error.stack);
    }
    throw error;
  }
};
