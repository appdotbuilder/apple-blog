import { db } from '../db';
import { tagsTable, postTagsTable } from '../db/schema';
import { type Tag } from '../schema';
import { eq } from 'drizzle-orm';

export async function getTagsForPost(postId: number): Promise<Tag[]> {
  try {
    // Join tags table with post_tags table to get tags for specific post
    const results = await db.select()
      .from(tagsTable)
      .innerJoin(postTagsTable, eq(tagsTable.id, postTagsTable.tag_id))
      .where(eq(postTagsTable.post_id, postId))
      .execute();

    // Extract tag data from the joined results
    return results.map(result => ({
      id: result.tags.id,
      name: result.tags.name,
      slug: result.tags.slug,
      created_at: result.tags.created_at
    }));
  } catch (error) {
    console.error('Failed to get tags for post:', error);
    throw error;
  }
}