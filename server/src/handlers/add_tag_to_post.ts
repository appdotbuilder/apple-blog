import { db } from '../db';
import { postTagsTable, postsTable, tagsTable } from '../db/schema';
import { type AddTagToPostInput, type PostTag } from '../schema';
import { eq, and } from 'drizzle-orm';

export const addTagToPost = async (input: AddTagToPostInput): Promise<PostTag> => {
  try {
    // Validate that the post exists
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, input.post_id))
      .execute();

    if (posts.length === 0) {
      throw new Error(`Post with ID ${input.post_id} not found`);
    }

    // Validate that the tag exists
    const tags = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.id, input.tag_id))
      .execute();

    if (tags.length === 0) {
      throw new Error(`Tag with ID ${input.tag_id} not found`);
    }

    // Check if the association already exists
    const existingAssociations = await db.select()
      .from(postTagsTable)
      .where(and(
        eq(postTagsTable.post_id, input.post_id),
        eq(postTagsTable.tag_id, input.tag_id)
      ))
      .execute();

    if (existingAssociations.length > 0) {
      throw new Error(`Tag is already associated with this post`);
    }

    // Create the association
    const result = await db.insert(postTagsTable)
      .values({
        post_id: input.post_id,
        tag_id: input.tag_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Add tag to post failed:', error);
    throw error;
  }
};