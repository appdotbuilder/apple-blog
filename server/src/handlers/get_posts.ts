import { db } from '../db';
import { postsTable, usersTable, categoriesTable } from '../db/schema';
import { type GetPostsInput, type Post } from '../schema';
import { eq, and, desc, isNull, type SQL } from 'drizzle-orm';

export const getPosts = async (input: GetPostsInput): Promise<Post[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (input.category_id !== undefined) {
      if (input.category_id === null) {
        conditions.push(isNull(postsTable.category_id));
      } else {
        conditions.push(eq(postsTable.category_id, input.category_id));
      }
    }

    if (input.status) {
      conditions.push(eq(postsTable.status, input.status));
    }

    if (input.author_id) {
      conditions.push(eq(postsTable.author_id, input.author_id));
    }

    // Build the complete query - always include where clause to maintain type consistency
    const baseQuery = db.select({
      id: postsTable.id,
      title: postsTable.title,
      slug: postsTable.slug,
      content: postsTable.content,
      excerpt: postsTable.excerpt,
      featured_image_url: postsTable.featured_image_url,
      media_type: postsTable.media_type,
      media_url: postsTable.media_url,
      status: postsTable.status,
      published_at: postsTable.published_at,
      author_id: postsTable.author_id,
      category_id: postsTable.category_id,
      view_count: postsTable.view_count,
      like_count: postsTable.like_count,
      created_at: postsTable.created_at,
      updated_at: postsTable.updated_at
    }).from(postsTable)
      .leftJoin(usersTable, eq(postsTable.author_id, usersTable.id))
      .leftJoin(categoriesTable, eq(postsTable.category_id, categoriesTable.id));

    // Complete the query with all clauses
    const results = await baseQuery
      .where(conditions.length === 0 ? eq(postsTable.id, postsTable.id) : // Always true condition when no filters
             conditions.length === 1 ? conditions[0] : 
             and(...conditions))
      .orderBy(desc(postsTable.created_at))
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    // Return the results - no numeric conversion needed for this schema
    return results;
  } catch (error) {
    console.error('Get posts failed:', error);
    throw error;
  }
};