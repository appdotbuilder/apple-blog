import { db } from '../db';
import { commentsTable, postsTable } from '../db/schema';
import { type CreateCommentInput, type Comment } from '../schema';
import { eq } from 'drizzle-orm';

export async function createComment(input: CreateCommentInput): Promise<Comment> {
  try {
    // Verify that the post exists
    const post = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, input.post_id))
      .execute();

    if (post.length === 0) {
      throw new Error(`Post with id ${input.post_id} not found`);
    }

    // If parent_id is provided, verify that the parent comment exists and belongs to the same post
    if (input.parent_id) {
      const parentComment = await db.select()
        .from(commentsTable)
        .where(eq(commentsTable.id, input.parent_id))
        .execute();

      if (parentComment.length === 0) {
        throw new Error(`Parent comment with id ${input.parent_id} not found`);
      }

      if (parentComment[0].post_id !== input.post_id) {
        throw new Error('Parent comment must belong to the same post');
      }
    }

    // Insert the comment
    const result = await db.insert(commentsTable)
      .values({
        content: input.content,
        author_name: input.author_name,
        author_email: input.author_email,
        author_website: input.author_website || null,
        post_id: input.post_id,
        parent_id: input.parent_id || null,
        is_approved: false // Comments require approval by default
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Comment creation failed:', error);
    throw error;
  }
}