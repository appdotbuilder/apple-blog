import { db } from '../db';
import { postsTable, usersTable, categoriesTable } from '../db/schema';
import { type CreatePostInput, type Post } from '../schema';
import { eq } from 'drizzle-orm';

export const createPost = async (input: CreatePostInput): Promise<Post> => {
  try {
    // Verify that the author exists
    const authorExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, input.author_id))
      .execute();

    if (authorExists.length === 0) {
      throw new Error(`Author with id ${input.author_id} does not exist`);
    }

    // Verify that the category exists if provided
    if (input.category_id !== undefined && input.category_id !== null) {
      const categoryExists = await db.select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.category_id))
        .execute();

      if (categoryExists.length === 0) {
        throw new Error(`Category with id ${input.category_id} does not exist`);
      }
    }

    // Check if slug already exists
    const existingPost = await db.select({ id: postsTable.id })
      .from(postsTable)
      .where(eq(postsTable.slug, input.slug))
      .execute();

    if (existingPost.length > 0) {
      throw new Error(`Post with slug '${input.slug}' already exists`);
    }

    // Set published_at if status is 'published'
    const publishedAt = input.status === 'published' ? new Date() : null;

    // Insert the new post
    const result = await db.insert(postsTable)
      .values({
        title: input.title,
        slug: input.slug,
        content: input.content,
        excerpt: input.excerpt || null,
        featured_image_url: input.featured_image_url || null,
        media_type: input.media_type,
        media_url: input.media_url || null,
        status: input.status,
        published_at: publishedAt,
        author_id: input.author_id,
        category_id: input.category_id || null,
        view_count: 0,
        like_count: 0
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Post creation failed:', error);
    throw error;
  }
};