import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, tagsTable, postTagsTable } from '../db/schema';
import { type AddTagToPostInput } from '../schema';
import { addTagToPost } from '../handlers/add_tag_to_post';
import { eq, and } from 'drizzle-orm';

describe('addTagToPost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should add a tag to a post successfully', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        author_id: userId
      })
      .returning()
      .execute();
    const postId = postResult[0].id;

    // Create test tag
    const tagResult = await db.insert(tagsTable)
      .values({
        name: 'Test Tag',
        slug: 'test-tag'
      })
      .returning()
      .execute();
    const tagId = tagResult[0].id;

    const input: AddTagToPostInput = {
      post_id: postId,
      tag_id: tagId
    };

    const result = await addTagToPost(input);

    // Validate the returned result
    expect(result.post_id).toEqual(postId);
    expect(result.tag_id).toEqual(tagId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save the association to database', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        author_id: userId
      })
      .returning()
      .execute();
    const postId = postResult[0].id;

    // Create test tag
    const tagResult = await db.insert(tagsTable)
      .values({
        name: 'Test Tag',
        slug: 'test-tag'
      })
      .returning()
      .execute();
    const tagId = tagResult[0].id;

    const input: AddTagToPostInput = {
      post_id: postId,
      tag_id: tagId
    };

    const result = await addTagToPost(input);

    // Verify the association exists in the database
    const associations = await db.select()
      .from(postTagsTable)
      .where(eq(postTagsTable.id, result.id))
      .execute();

    expect(associations).toHaveLength(1);
    expect(associations[0].post_id).toEqual(postId);
    expect(associations[0].tag_id).toEqual(tagId);
    expect(associations[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when post does not exist', async () => {
    // Create test tag only
    const tagResult = await db.insert(tagsTable)
      .values({
        name: 'Test Tag',
        slug: 'test-tag'
      })
      .returning()
      .execute();
    const tagId = tagResult[0].id;

    const input: AddTagToPostInput = {
      post_id: 999, // Non-existent post ID
      tag_id: tagId
    };

    await expect(addTagToPost(input)).rejects.toThrow(/post.*not found/i);
  });

  it('should throw error when tag does not exist', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        author_id: userId
      })
      .returning()
      .execute();
    const postId = postResult[0].id;

    const input: AddTagToPostInput = {
      post_id: postId,
      tag_id: 999 // Non-existent tag ID
    };

    await expect(addTagToPost(input)).rejects.toThrow(/tag.*not found/i);
  });

  it('should throw error when association already exists', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        author_id: userId
      })
      .returning()
      .execute();
    const postId = postResult[0].id;

    // Create test tag
    const tagResult = await db.insert(tagsTable)
      .values({
        name: 'Test Tag',
        slug: 'test-tag'
      })
      .returning()
      .execute();
    const tagId = tagResult[0].id;

    // Create the association first time
    await db.insert(postTagsTable)
      .values({
        post_id: postId,
        tag_id: tagId
      })
      .execute();

    const input: AddTagToPostInput = {
      post_id: postId,
      tag_id: tagId
    };

    // Try to create the same association again
    await expect(addTagToPost(input)).rejects.toThrow(/already associated/i);
  });

  it('should handle multiple different tags for same post', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        author_id: userId
      })
      .returning()
      .execute();
    const postId = postResult[0].id;

    // Create multiple test tags
    const tag1Result = await db.insert(tagsTable)
      .values({
        name: 'Tag One',
        slug: 'tag-one'
      })
      .returning()
      .execute();
    const tag1Id = tag1Result[0].id;

    const tag2Result = await db.insert(tagsTable)
      .values({
        name: 'Tag Two',
        slug: 'tag-two'
      })
      .returning()
      .execute();
    const tag2Id = tag2Result[0].id;

    // Add first tag
    const result1 = await addTagToPost({
      post_id: postId,
      tag_id: tag1Id
    });

    // Add second tag
    const result2 = await addTagToPost({
      post_id: postId,
      tag_id: tag2Id
    });

    // Verify both associations exist
    const associations = await db.select()
      .from(postTagsTable)
      .where(eq(postTagsTable.post_id, postId))
      .execute();

    expect(associations).toHaveLength(2);
    expect(associations.map(a => a.tag_id)).toEqual(expect.arrayContaining([tag1Id, tag2Id]));
    expect(result1.id).not.toEqual(result2.id);
  });
});