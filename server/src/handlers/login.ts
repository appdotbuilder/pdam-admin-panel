
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function login(input: LoginInput): Promise<{ success: boolean; user?: any; token?: string }> {
  try {
    // Ensure consistent trimming of inputs 
    const trimmedUsername = input.username.trim();
    const trimmedPassword = input.password.trim();
    
    // Enhanced validation with detailed logging
    if (!trimmedUsername || !trimmedPassword) {
      console.log('❌ LOGIN FAILED: Empty username or password after trimming');
      console.log('   Original username length:', input.username.length);
      console.log('   Original password length:', input.password.length);
      console.log('   Trimmed username length:', trimmedUsername.length);
      console.log('   Trimmed password length:', trimmedPassword.length);
      return { success: false };
    }
    
    // Comprehensive login attempt logging
    console.log('🔐 LOGIN ATTEMPT:', {
      username: `"${trimmedUsername}"`,
      usernameLength: trimmedUsername.length,
      passwordLength: trimmedPassword.length,
      usernameBytes: [...trimmedUsername].map(c => c.charCodeAt(0)),
      timestamp: new Date().toISOString()
    });
    
    // Database lookup with error handling
    console.log('🔍 Looking up user in database...');
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, trimmedUsername))
      .execute();

    console.log('📊 Database lookup result:', {
      foundUsers: users.length,
      searchedUsername: `"${trimmedUsername}"`
    });

    if (users.length === 0) {
      console.log('❌ USER NOT FOUND:', `"${trimmedUsername}"`);
      
      // Comprehensive debug information
      const allUsers = await db.select().from(usersTable).execute();
      console.log('🗂️  ALL AVAILABLE USERS IN DATABASE:');
      allUsers.forEach((u, index) => {
        console.log(`   ${index + 1}. Username: "${u.username}" | Role: ${u.role} | ID: ${u.id} | Length: ${u.username.length}`);
        console.log(`      Bytes: [${[...u.username].map(c => c.charCodeAt(0)).join(', ')}]`);
      });
      
      return { success: false };
    }

    const user = users[0];
    console.log('✅ USER FOUND:', {
      id: user.id,
      username: `"${user.username}"`,
      role: user.role,
      created_at: user.created_at,
      passwordHashExists: !!user.password_hash,
      hashLength: user.password_hash.length,
      hashPrefix: user.password_hash.substring(0, 20) + '...'
    });

    // Enhanced password verification with comprehensive logging
    console.log('🔍 VERIFYING PASSWORD...');
    console.log('   Password to verify length:', trimmedPassword.length);
    console.log('   Hash to verify against length:', user.password_hash.length);
    
    let isValidPassword = false;
    try {
      isValidPassword = await Bun.password.verify(trimmedPassword, user.password_hash);
      console.log('🔐 PASSWORD VERIFICATION RESULT:', isValidPassword);
    } catch (verificationError) {
      console.error('❌ PASSWORD VERIFICATION ERROR:', verificationError);
      console.log('   This might indicate a corrupted hash or system issue');
      return { success: false };
    }

    if (!isValidPassword) {
      console.log('❌ PASSWORD VERIFICATION FAILED for user:', user.username);
      
      // Enhanced debugging for failed verification
      console.log('🔧 DEBUGGING FAILED VERIFICATION:');
      try {
        // Test hash integrity with known invalid password
        const testVerify = await Bun.password.verify('invalid_test_password', user.password_hash);
        console.log('   Hash integrity test (should be false):', testVerify);
        
        // Check if the hash looks like a valid bcrypt/argon hash
        const hashPattern = /^\$[a-z0-9]+\$[0-9]+\$.+/i;
        const isValidHashFormat = hashPattern.test(user.password_hash);
        console.log('   Hash format appears valid:', isValidHashFormat);
        
      } catch (hashError) {
        console.error('   Hash verification system error:', hashError);
        console.log('   This indicates a serious issue with password hashing');
      }
      
      return { success: false };
    }

    // Successful authentication - generate token
    console.log('🎉 AUTHENTICATION SUCCESSFUL for user:', user.username);
    
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    // Use a simple secret for JWT signing (in production, this should be from env)
    const secret = 'your-secret-key';
    
    // Create JWT token manually using base64 encoding
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerEncoded = btoa(JSON.stringify(header)).replace(/=/g, '');
    const payloadEncoded = btoa(JSON.stringify(payload)).replace(/=/g, '');
    
    // Create signature using HMAC SHA256
    const data = `${headerEncoded}.${payloadEncoded}`;
    const signature = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ).then(key => 
      crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
    ).then(signature => 
      btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '')
    );
    
    const token = `${data}.${signature}`;

    console.log('✅ LOGIN COMPLETED successfully for user:', user.username);
    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        created_at: user.created_at
      },
      token
    };
  } catch (error: any) {
    console.error('❌ LOGIN HANDLER FAILED with error:', error);
    console.error('   Error type:', error?.constructor?.name || 'Unknown');
    console.error('   Error message:', error?.message || 'Unknown error');
    if (error?.stack) {
      console.error('   Stack trace:', error.stack);
    }
    throw error;
  }
}
