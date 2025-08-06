
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function login(input: LoginInput): Promise<{ success: boolean; user?: any; token?: string }> {
  try {
    // Trim inputs to handle potential whitespace
    const trimmedUsername = input.username.trim();
    const trimmedPassword = input.password.trim();
    
    // Validate inputs are not empty after trimming
    if (!trimmedUsername || !trimmedPassword) {
      console.log('Empty username or password after trimming');
      return { success: false };
    }
    
    // Log the login attempt for debugging
    console.log('Login attempt for username:', trimmedUsername);
    console.log('Username length:', trimmedUsername.length);
    console.log('Password length:', trimmedPassword.length);
    
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, trimmedUsername))
      .execute();

    if (users.length === 0) {
      console.log('User not found:', trimmedUsername);
      
      // Also try case-insensitive search for debugging
      const allUsers = await db.select().from(usersTable).execute();
      console.log('Available usernames:', allUsers.map(u => u.username));
      
      return { success: false };
    }

    const user = users[0];
    console.log('User found:', user.username, 'Role:', user.role);
    console.log('Password hash exists:', !!user.password_hash);

    // Verify password using Bun's built-in password verification
    const isValidPassword = await Bun.password.verify(trimmedPassword, user.password_hash);
    console.log('Password verification result:', isValidPassword);

    if (!isValidPassword) {
      console.log('Password verification failed for user:', user.username);
      return { success: false };
    }

    // Generate a simple JWT token using Bun's built-in JWT
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

    console.log('Login successful for user:', user.username);
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
  } catch (error) {
    console.error('Login failed with error:', error);
    throw error;
  }
}
