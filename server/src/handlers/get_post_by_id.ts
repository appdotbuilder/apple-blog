import { db } from '../db';
import { postsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Post } from '../schema';

export async function getPostById(id: number): Promise<Post | null> {
  try {
    // First, fetch the post
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, id))
      .limit(1)
      .execute();

    if (posts.length === 0) {
      return null;
    }

    const post = posts[0];

    // Increment view count
    await db.update(postsTable)
      .set({ view_count: post.view_count + 1 })
      .where(eq(postsTable.id, id))
      .execute();

    // Return the post with incremented view count
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      featured_image_url: post.featured_image_url,
      media_type: post.media_type,
      media_url: post.media_url,
      status: post.status,
      published_at: post.published_at,
      author_id: post.author_id,
      category_id: post.category_id,
      view_count: post.view_count + 1, // Return incremented count
      like_count: post.like_count,
      created_at: post.created_at,
      updated_at: post.updated_at
    };
  } catch (error) {
    console.error('Failed to fetch post by ID:', error);
    throw error;
  }
}