import { db } from '../db';
import { commentsTable } from '../db/schema';
import { type Comment } from '../schema';
import { eq } from 'drizzle-orm';

export async function approveComment(commentId: number): Promise<Comment> {
  try {
    // Update the comment to set is_approved to true
    const result = await db.update(commentsTable)
      .set({ 
        is_approved: true,
        updated_at: new Date()
      })
      .where(eq(commentsTable.id, commentId))
      .returning()
      .execute();

    // Check if comment exists
    if (result.length === 0) {
      throw new Error(`Comment with id ${commentId} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Comment approval failed:', error);
    throw error;
  }
}