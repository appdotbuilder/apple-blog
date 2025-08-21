import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const loginUser = async (input: LoginInput): Promise<User> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Verify password hash using Bun's built-in password verification
    const isValidPassword = await Bun.password.verify(input.password, user.password_hash);

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Return user data without password hash
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      full_name: user.full_name,
      bio: user.bio,
      avatar_url: user.avatar_url,
      is_verified: user.is_verified,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
};