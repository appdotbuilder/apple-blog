import { db } from '../db';
import { postsTable, commentsTable, postTagsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deletePost = async (id: number): Promise<{ success: boolean }> => {
  try {
    // First, verify the post exists
    const existingPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, id))
      .execute();

    if (existingPost.length === 0) {
      throw new Error(`Post with id ${id} not found`);
    }

    // Delete related data in correct order (foreign key constraints)
    // 1. Delete comments first (they reference posts)
    await db.delete(commentsTable)
      .where(eq(commentsTable.post_id, id))
      .execute();

    // 2. Delete post-tag relations (they reference posts)
    await db.delete(postTagsTable)
      .where(eq(postTagsTable.post_id, id))
      .execute();

    // 3. Finally delete the post itself
    await db.delete(postsTable)
      .where(eq(postsTable.id, id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Post deletion failed:', error);
    throw error;
  }
};