import { db } from '../db';
import { postTagsTable } from '../db/schema';
import { type AddTagToPostInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function removeTagFromPost(input: AddTagToPostInput): Promise<{ success: boolean }> {
  try {
    // Delete the post-tag association
    const result = await db.delete(postTagsTable)
      .where(and(
        eq(postTagsTable.post_id, input.post_id),
        eq(postTagsTable.tag_id, input.tag_id)
      ))
      .execute();

    // Return success status - even if no rows were deleted (association didn't exist)
    return { success: true };
  } catch (error) {
    console.error('Remove tag from post failed:', error);
    throw error;
  }
}