import { db } from '../db';
import { postsTable, usersTable, categoriesTable } from '../db/schema';
import { type Post } from '../schema';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export const getPostBySlug = async (slug: string): Promise<Post | null> => {
  try {
    // First, find the post by slug
    const postResult = await db.select()
      .from(postsTable)
      .where(eq(postsTable.slug, slug))
      .limit(1)
      .execute();

    if (postResult.length === 0) {
      return null;
    }

    const post = postResult[0];

    // Increment view count
    await db.update(postsTable)
      .set({ 
        view_count: sql`${postsTable.view_count} + 1`,
        updated_at: new Date()
      })
      .where(eq(postsTable.id, post.id))
      .execute();

    // Return the post with incremented view count
    return {
      ...post,
      view_count: post.view_count + 1
    };
  } catch (error) {
    console.error('Get post by slug failed:', error);
    throw error;
  }
};