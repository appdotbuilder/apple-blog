import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserById = async (id: number): Promise<User | null> => {
  try {
    // Query user by ID
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1)
      .execute();

    // Return null if user not found
    if (result.length === 0) {
      return null;
    }

    // Return the user (no numeric conversions needed for users table)
    return result[0];
  } catch (error) {
    console.error('User lookup failed:', error);
    throw error;
  }
};