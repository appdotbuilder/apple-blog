import { db } from '../db';
import { postsTable } from '../db/schema';
import { type Post } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const likePost = async (postId: number): Promise<Post> => {
  try {
    // First check if the post exists
    const existingPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .execute();

    if (existingPost.length === 0) {
      throw new Error(`Post with id ${postId} not found`);
    }

    // Increment the like count atomically
    const result = await db.update(postsTable)
      .set({ 
        like_count: sql`${postsTable.like_count} + 1`,
        updated_at: new Date()
      })
      .where(eq(postsTable.id, postId))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Like post failed:', error);
    throw error;
  }
};