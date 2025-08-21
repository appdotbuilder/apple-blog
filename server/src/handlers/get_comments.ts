import { db } from '../db';
import { commentsTable } from '../db/schema';
import { type GetCommentsInput, type Comment } from '../schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { type SQL } from 'drizzle-orm';

export const getComments = async (input: GetCommentsInput): Promise<Comment[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by post_id
    conditions.push(eq(commentsTable.post_id, input.post_id));
    
    // Apply approval filter if requested
    if (input.approved_only) {
      conditions.push(eq(commentsTable.is_approved, true));
    }

    // Build and execute query in one go to avoid type issues
    const results = await db.select()
      .from(commentsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(asc(commentsTable.created_at))
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    // Return the comments (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Get comments failed:', error);
    throw error;
  }
};