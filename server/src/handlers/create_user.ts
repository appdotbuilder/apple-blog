import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

// Password hashing utility
const hashPassword = async (password: string): Promise<string> => {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(password);
  return hasher.digest('hex');
};

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Hash the password
    const passwordHash = await hashPassword(input.password);

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        username: input.username,
        password_hash: passwordHash,
        full_name: input.full_name,
        bio: input.bio || null,
        avatar_url: input.avatar_url || null,
        is_verified: false // Default value
      })
      .returning()
      .execute();

    const user = result[0];
    
    // Return user data excluding password_hash
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
    console.error('User creation failed:', error);
    throw error;
  }
};