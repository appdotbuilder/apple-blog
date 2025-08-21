import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, postsTable, tagsTable, postTagsTable } from '../db/schema';
import { type AddTagToPostInput } from '../schema';
import { removeTagFromPost } from '../handlers/remove_tag_from_post';
import { eq, and } from 'drizzle-orm';

describe('removeTagFromPost', () => {
  let testUserId: number;
  let testCategoryId: number;
  let testPostId: number;
  let testTagId: number;
  let testPostTagId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'author@example.com',
        username: 'testauthor',
        password_hash: 'hashedpassword',
        full_name: 'Test Author'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        slug: 'test-category',
        color: '#ff0000'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        author_id: testUserId,
        category_id: testCategoryId,
        status: 'published'
      })
      .returning()
      .execute();
    testPostId = postResult[0].id;

    // Create test tag
    const tagResult = await db.insert(tagsTable)
      .values({
        name: 'Test Tag',
        slug: 'test-tag'
      })
      .returning()
      .execute();
    testTagId = tagResult[0].id;

    // Create test post-tag association
    const postTagResult = await db.insert(postTagsTable)
      .values({
        post_id: testPostId,
        tag_id: testTagId
      })
      .returning()
      .execute();
    testPostTagId = postTagResult[0].id;
  });

  afterEach(resetDB);

  const testInput: AddTagToPostInput = {
    post_id: 0, // Will be set in tests
    tag_id: 0   // Will be set in tests
  };

  it('should remove existing tag from post', async () => {
    const input = {
      ...testInput,
      post_id: testPostId,
      tag_id: testTagId
    };

    const result = await removeTagFromPost(input);

    // Should return success
    expect(result.success).toBe(true);

    // Verify the association was deleted from database
    const postTags = await db.select()
      .from(postTagsTable)
      .where(and(
        eq(postTagsTable.post_id, testPostId),
        eq(postTagsTable.tag_id, testTagId)
      ))
      .execute();

    expect(postTags).toHaveLength(0);
  });

  it('should return success when removing non-existent association', async () => {
    // Create another tag
    const anotherTagResult = await db.insert(tagsTable)
      .values({
        name: 'Another Tag',
        slug: 'another-tag'
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      post_id: testPostId,
      tag_id: anotherTagResult[0].id // Tag not associated with post
    };

    const result = await removeTagFromPost(input);

    // Should still return success even if association didn't exist
    expect(result.success).toBe(true);

    // Original association should still exist
    const postTags = await db.select()
      .from(postTagsTable)
      .where(and(
        eq(postTagsTable.post_id, testPostId),
        eq(postTagsTable.tag_id, testTagId)
      ))
      .execute();

    expect(postTags).toHaveLength(1);
  });

  it('should return success for non-existent post', async () => {
    const input = {
      ...testInput,
      post_id: 99999, // Non-existent post
      tag_id: testTagId
    };

    const result = await removeTagFromPost(input);

    // Should return success even for non-existent post
    expect(result.success).toBe(true);

    // Original association should still exist
    const postTags = await db.select()
      .from(postTagsTable)
      .where(and(
        eq(postTagsTable.post_id, testPostId),
        eq(postTagsTable.tag_id, testTagId)
      ))
      .execute();

    expect(postTags).toHaveLength(1);
  });

  it('should return success for non-existent tag', async () => {
    const input = {
      ...testInput,
      post_id: testPostId,
      tag_id: 99999 // Non-existent tag
    };

    const result = await removeTagFromPost(input);

    // Should return success even for non-existent tag
    expect(result.success).toBe(true);

    // Original association should still exist
    const postTags = await db.select()
      .from(postTagsTable)
      .where(and(
        eq(postTagsTable.post_id, testPostId),
        eq(postTagsTable.tag_id, testTagId)
      ))
      .execute();

    expect(postTags).toHaveLength(1);
  });

  it('should only remove specific post-tag association', async () => {
    // Create another tag and associate it with the same post
    const anotherTagResult = await db.insert(tagsTable)
      .values({
        name: 'Another Tag',
        slug: 'another-tag'
      })
      .returning()
      .execute();

    await db.insert(postTagsTable)
      .values({
        post_id: testPostId,
        tag_id: anotherTagResult[0].id
      })
      .execute();

    // Create another post and associate the first tag with it
    const anotherPostResult = await db.insert(postsTable)
      .values({
        title: 'Another Post',
        slug: 'another-post',
        content: 'Another content',
        author_id: testUserId,
        category_id: testCategoryId,
        status: 'published'
      })
      .returning()
      .execute();

    await db.insert(postTagsTable)
      .values({
        post_id: anotherPostResult[0].id,
        tag_id: testTagId
      })
      .execute();

    // Remove the original association
    const input = {
      ...testInput,
      post_id: testPostId,
      tag_id: testTagId
    };

    const result = await removeTagFromPost(input);
    expect(result.success).toBe(true);

    // Verify only the specific association was removed
    const allPostTags = await db.select()
      .from(postTagsTable)
      .execute();

    expect(allPostTags).toHaveLength(2);

    // First post should still have the second tag
    const firstPostTags = await db.select()
      .from(postTagsTable)
      .where(eq(postTagsTable.post_id, testPostId))
      .execute();
    expect(firstPostTags).toHaveLength(1);
    expect(firstPostTags[0].tag_id).toBe(anotherTagResult[0].id);

    // Second post should still have the first tag
    const secondPostTags = await db.select()
      .from(postTagsTable)
      .where(eq(postTagsTable.post_id, anotherPostResult[0].id))
      .execute();
    expect(secondPostTags).toHaveLength(1);
    expect(secondPostTags[0].tag_id).toBe(testTagId);
  });
});