import { db } from '../db';
import { postsTable, categoriesTable } from '../db/schema';
import { type UpdatePostInput, type Post } from '../schema';
import { eq } from 'drizzle-orm';

export const updatePost = async (input: UpdatePostInput): Promise<Post> => {
  try {
    // First, verify the post exists
    const existingPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, input.id))
      .execute();

    if (existingPost.length === 0) {
      throw new Error(`Post with id ${input.id} not found`);
    }

    const currentPost = existingPost[0];

    // If category_id is being updated and is not null, verify it exists
    if (input.category_id !== undefined && input.category_id !== null) {
      const categoryExists = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.category_id))
        .execute();

      if (categoryExists.length === 0) {
        throw new Error(`Category with id ${input.category_id} not found`);
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date()
    };

    // Only update fields that are provided
    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.slug !== undefined) {
      updateData.slug = input.slug;
    }
    if (input.content !== undefined) {
      updateData.content = input.content;
    }
    if (input.excerpt !== undefined) {
      updateData.excerpt = input.excerpt;
    }
    if (input.featured_image_url !== undefined) {
      updateData.featured_image_url = input.featured_image_url;
    }
    if (input.media_type !== undefined) {
      updateData.media_type = input.media_type;
    }
    if (input.media_url !== undefined) {
      updateData.media_url = input.media_url;
    }
    if (input.category_id !== undefined) {
      updateData.category_id = input.category_id;
    }

    // Handle status change and published_at timestamp
    if (input.status !== undefined) {
      updateData.status = input.status;
      
      // If status is changing to 'published' and post wasn't published before
      if (input.status === 'published' && currentPost.status !== 'published') {
        updateData.published_at = new Date();
      }
      
      // If status is changing from 'published' to something else, keep the original published_at
      // (We don't reset it - once published, the timestamp remains)
    }

    // Update the post
    const result = await db.update(postsTable)
      .set(updateData)
      .where(eq(postsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Post update failed:', error);
    throw error;
  }
};