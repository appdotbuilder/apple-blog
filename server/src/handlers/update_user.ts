import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUser = async (input: UpdateUserInput): Promise<User> => {
  try {
    // First, check if the user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    // Build the update object with only provided fields
    const updateData: Partial<typeof usersTable.$inferInsert> = {};
    
    if (input.username !== undefined) {
      updateData.username = input.username;
    }
    
    if (input.full_name !== undefined) {
      updateData.full_name = input.full_name;
    }
    
    if (input.bio !== undefined) {
      updateData.bio = input.bio;
    }
    
    if (input.avatar_url !== undefined) {
      updateData.avatar_url = input.avatar_url;
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update the user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};