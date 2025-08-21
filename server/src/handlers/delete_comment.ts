import { db } from '../db';
import { commentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteComment(commentId: number): Promise<{ success: boolean }> {
  try {
    // First, recursively delete all replies to this comment
    await deleteReplies(commentId);
    
    // Then delete the comment itself
    const result = await db.delete(commentsTable)
      .where(eq(commentsTable.id, commentId))
      .execute();
    
    // Return success status
    return { success: true };
  } catch (error) {
    console.error('Comment deletion failed:', error);
    throw error;
  }
}

// Helper function to recursively delete all replies
async function deleteReplies(parentId: number): Promise<void> {
  try {
    // Find all direct replies to this comment
    const replies = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.parent_id, parentId))
      .execute();
    
    // For each reply, recursively delete its replies first
    for (const reply of replies) {
      await deleteReplies(reply.id);
    }
    
    // Delete all direct replies
    if (replies.length > 0) {
      await db.delete(commentsTable)
        .where(eq(commentsTable.parent_id, parentId))
        .execute();
    }
  } catch (error) {
    console.error('Reply deletion failed:', error);
    throw error;
  }
}