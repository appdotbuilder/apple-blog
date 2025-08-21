import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, postsTable, tagsTable, postTagsTable, commentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { deletePost } from '../handlers/delete_post';

describe('deletePost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test user
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test category
  const createTestCategory = async () => {
    const result = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        slug: 'test-category'
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test post
  const createTestPost = async (authorId: number, categoryId?: number) => {
    const result = await db.insert(postsTable)
      .values({
        title: 'Test Post',
        slug: 'test-post',
        content: 'This is test content',
        author_id: authorId,
        category_id: categoryId || null,
        status: 'published'
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test tag
  const createTestTag = async () => {
    const result = await db.insert(tagsTable)
      .values({
        name: 'Test Tag',
        slug: 'test-tag'
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should delete a post successfully', async () => {
    const user = await createTestUser();
    const post = await createTestPost(user.id);

    const result = await deletePost(post.id);

    expect(result.success).toBe(true);

    // Verify post is deleted
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, post.id))
      .execute();

    expect(posts).toHaveLength(0);
  });

  it('should delete post with comments', async () => {
    const user = await createTestUser();
    const post = await createTestPost(user.id);

    // Create test comments
    await db.insert(commentsTable)
      .values([
        {
          content: 'First comment',
          author_name: 'Commenter 1',
          author_email: 'commenter1@example.com',
          post_id: post.id
        },
        {
          content: 'Second comment',
          author_name: 'Commenter 2',
          author_email: 'commenter2@example.com',
          post_id: post.id
        }
      ])
      .execute();

    const result = await deletePost(post.id);

    expect(result.success).toBe(true);

    // Verify post is deleted
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, post.id))
      .execute();

    expect(posts).toHaveLength(0);

    // Verify comments are deleted
    const comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.post_id, post.id))
      .execute();

    expect(comments).toHaveLength(0);
  });

  it('should delete post with post-tag relations', async () => {
    const user = await createTestUser();
    const post = await createTestPost(user.id);
    const tag = await createTestTag();

    // Create post-tag relation
    await db.insert(postTagsTable)
      .values({
        post_id: post.id,
        tag_id: tag.id
      })
      .execute();

    const result = await deletePost(post.id);

    expect(result.success).toBe(true);

    // Verify post is deleted
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, post.id))
      .execute();

    expect(posts).toHaveLength(0);

    // Verify post-tag relation is deleted
    const postTags = await db.select()
      .from(postTagsTable)
      .where(eq(postTagsTable.post_id, post.id))
      .execute();

    expect(postTags).toHaveLength(0);

    // Verify tag still exists (should not be deleted)
    const tags = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.id, tag.id))
      .execute();

    expect(tags).toHaveLength(1);
  });

  it('should delete post with comments and tags together', async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    const post = await createTestPost(user.id, category.id);
    const tag = await createTestTag();

    // Create comment
    await db.insert(commentsTable)
      .values({
        content: 'Test comment',
        author_name: 'Commenter',
        author_email: 'commenter@example.com',
        post_id: post.id
      })
      .execute();

    // Create post-tag relation
    await db.insert(postTagsTable)
      .values({
        post_id: post.id,
        tag_id: tag.id
      })
      .execute();

    const result = await deletePost(post.id);

    expect(result.success).toBe(true);

    // Verify post is deleted
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, post.id))
      .execute();

    expect(posts).toHaveLength(0);

    // Verify comments are deleted
    const comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.post_id, post.id))
      .execute();

    expect(comments).toHaveLength(0);

    // Verify post-tag relations are deleted
    const postTags = await db.select()
      .from(postTagsTable)
      .where(eq(postTagsTable.post_id, post.id))
      .execute();

    expect(postTags).toHaveLength(0);

    // Verify related entities still exist (should not be deleted)
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, category.id))
      .execute();

    const tags = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.id, tag.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(categories).toHaveLength(1);
    expect(tags).toHaveLength(1);
  });

  it('should delete threaded comments correctly', async () => {
    const user = await createTestUser();
    const post = await createTestPost(user.id);

    // Create parent comment
    const parentCommentResult = await db.insert(commentsTable)
      .values({
        content: 'Parent comment',
        author_name: 'Parent Author',
        author_email: 'parent@example.com',
        post_id: post.id
      })
      .returning()
      .execute();

    const parentComment = parentCommentResult[0];

    // Create child comment (reply)
    await db.insert(commentsTable)
      .values({
        content: 'Child comment',
        author_name: 'Child Author',
        author_email: 'child@example.com',
        post_id: post.id,
        parent_id: parentComment.id
      })
      .execute();

    const result = await deletePost(post.id);

    expect(result.success).toBe(true);

    // Verify all comments are deleted (both parent and child)
    const comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.post_id, post.id))
      .execute();

    expect(comments).toHaveLength(0);
  });

  it('should throw error when post does not exist', async () => {
    const nonExistentId = 999999;

    await expect(deletePost(nonExistentId))
      .rejects
      .toThrow(/Post with id 999999 not found/i);
  });

  it('should handle deletion of post without related data', async () => {
    const user = await createTestUser();
    const post = await createTestPost(user.id);

    // Ensure no comments or tags exist for this post
    const commentsBeforeDelete = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.post_id, post.id))
      .execute();

    const postTagsBeforeDelete = await db.select()
      .from(postTagsTable)
      .where(eq(postTagsTable.post_id, post.id))
      .execute();

    expect(commentsBeforeDelete).toHaveLength(0);
    expect(postTagsBeforeDelete).toHaveLength(0);

    const result = await deletePost(post.id);

    expect(result.success).toBe(true);

    // Verify post is deleted
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, post.id))
      .execute();

    expect(posts).toHaveLength(0);
  });
});