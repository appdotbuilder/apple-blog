import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, postsTable, commentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { deleteComment } from '../handlers/delete_comment';

describe('deleteComment', () => {
  let testUserId: number;
  let testCategoryId: number;
  let testPostId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'author@example.com',
        username: 'testauthor',
        password_hash: 'hashedpassword',
        full_name: 'Test Author',
        bio: null,
        avatar_url: null,
        is_verified: false
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        slug: 'test-category',
        description: 'A test category',
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
        content: 'Test post content',
        excerpt: 'Test excerpt',
        featured_image_url: null,
        media_type: 'text',
        media_url: null,
        status: 'published',
        published_at: new Date(),
        author_id: testUserId,
        category_id: testCategoryId,
        view_count: 0,
        like_count: 0
      })
      .returning()
      .execute();
    testPostId = postResult[0].id;
  });

  afterEach(resetDB);

  it('should delete a simple comment with no replies', async () => {
    // Create a simple comment
    const commentResult = await db.insert(commentsTable)
      .values({
        content: 'This is a test comment',
        author_name: 'Test User',
        author_email: 'test@example.com',
        author_website: null,
        post_id: testPostId,
        parent_id: null,
        is_approved: true
      })
      .returning()
      .execute();
    
    const commentId = commentResult[0].id;

    // Delete the comment
    const result = await deleteComment(commentId);

    // Verify result
    expect(result.success).toBe(true);

    // Verify comment is deleted from database
    const deletedComments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, commentId))
      .execute();

    expect(deletedComments).toHaveLength(0);
  });

  it('should delete a comment with direct replies', async () => {
    // Create parent comment
    const parentResult = await db.insert(commentsTable)
      .values({
        content: 'Parent comment',
        author_name: 'Parent User',
        author_email: 'parent@example.com',
        author_website: null,
        post_id: testPostId,
        parent_id: null,
        is_approved: true
      })
      .returning()
      .execute();
    
    const parentId = parentResult[0].id;

    // Create replies
    const reply1Result = await db.insert(commentsTable)
      .values({
        content: 'First reply',
        author_name: 'Reply User 1',
        author_email: 'reply1@example.com',
        author_website: null,
        post_id: testPostId,
        parent_id: parentId,
        is_approved: true
      })
      .returning()
      .execute();

    const reply2Result = await db.insert(commentsTable)
      .values({
        content: 'Second reply',
        author_name: 'Reply User 2',
        author_email: 'reply2@example.com',
        author_website: null,
        post_id: testPostId,
        parent_id: parentId,
        is_approved: true
      })
      .returning()
      .execute();

    const reply1Id = reply1Result[0].id;
    const reply2Id = reply2Result[0].id;

    // Delete the parent comment
    const result = await deleteComment(parentId);

    // Verify result
    expect(result.success).toBe(true);

    // Verify all comments are deleted
    const remainingComments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.post_id, testPostId))
      .execute();

    expect(remainingComments).toHaveLength(0);
  });

  it('should handle nested replies (multi-level threading)', async () => {
    // Create parent comment
    const parentResult = await db.insert(commentsTable)
      .values({
        content: 'Parent comment',
        author_name: 'Parent User',
        author_email: 'parent@example.com',
        author_website: null,
        post_id: testPostId,
        parent_id: null,
        is_approved: true
      })
      .returning()
      .execute();
    
    const parentId = parentResult[0].id;

    // Create first-level reply
    const reply1Result = await db.insert(commentsTable)
      .values({
        content: 'First level reply',
        author_name: 'Reply User 1',
        author_email: 'reply1@example.com',
        author_website: null,
        post_id: testPostId,
        parent_id: parentId,
        is_approved: true
      })
      .returning()
      .execute();

    const reply1Id = reply1Result[0].id;

    // Create second-level reply (reply to reply)
    const reply2Result = await db.insert(commentsTable)
      .values({
        content: 'Second level reply',
        author_name: 'Reply User 2',
        author_email: 'reply2@example.com',
        author_website: null,
        post_id: testPostId,
        parent_id: reply1Id,
        is_approved: true
      })
      .returning()
      .execute();

    const reply2Id = reply2Result[0].id;

    // Create third-level reply
    const reply3Result = await db.insert(commentsTable)
      .values({
        content: 'Third level reply',
        author_name: 'Reply User 3',
        author_email: 'reply3@example.com',
        author_website: null,
        post_id: testPostId,
        parent_id: reply2Id,
        is_approved: true
      })
      .returning()
      .execute();

    const reply3Id = reply3Result[0].id;

    // Delete the parent comment
    const result = await deleteComment(parentId);

    // Verify result
    expect(result.success).toBe(true);

    // Verify all comments are deleted
    const remainingComments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.post_id, testPostId))
      .execute();

    expect(remainingComments).toHaveLength(0);
  });

  it('should delete only specific branch when deleting a reply', async () => {
    // Create parent comment
    const parentResult = await db.insert(commentsTable)
      .values({
        content: 'Parent comment',
        author_name: 'Parent User',
        author_email: 'parent@example.com',
        author_website: null,
        post_id: testPostId,
        parent_id: null,
        is_approved: true
      })
      .returning()
      .execute();
    
    const parentId = parentResult[0].id;

    // Create two separate reply branches
    const branch1Result = await db.insert(commentsTable)
      .values({
        content: 'Branch 1 reply',
        author_name: 'Branch 1 User',
        author_email: 'branch1@example.com',
        author_website: null,
        post_id: testPostId,
        parent_id: parentId,
        is_approved: true
      })
      .returning()
      .execute();

    const branch2Result = await db.insert(commentsTable)
      .values({
        content: 'Branch 2 reply',
        author_name: 'Branch 2 User',
        author_email: 'branch2@example.com',
        author_website: null,
        post_id: testPostId,
        parent_id: parentId,
        is_approved: true
      })
      .returning()
      .execute();

    const branch1Id = branch1Result[0].id;
    const branch2Id = branch2Result[0].id;

    // Add sub-replies to each branch
    await db.insert(commentsTable)
      .values({
        content: 'Branch 1 sub-reply',
        author_name: 'Branch 1 Sub User',
        author_email: 'branch1sub@example.com',
        author_website: null,
        post_id: testPostId,
        parent_id: branch1Id,
        is_approved: true
      })
      .execute();

    await db.insert(commentsTable)
      .values({
        content: 'Branch 2 sub-reply',
        author_name: 'Branch 2 Sub User',
        author_email: 'branch2sub@example.com',
        author_website: null,
        post_id: testPostId,
        parent_id: branch2Id,
        is_approved: true
      })
      .execute();

    // Delete only branch 1
    const result = await deleteComment(branch1Id);

    // Verify result
    expect(result.success).toBe(true);

    // Verify parent and branch 2 still exist
    const remainingComments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.post_id, testPostId))
      .execute();

    expect(remainingComments).toHaveLength(3); // parent + branch2 + branch2 sub-reply

    // Verify branch 1 and its sub-reply are gone
    const branch1Comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, branch1Id))
      .execute();

    expect(branch1Comments).toHaveLength(0);
  });

  it('should handle deletion of non-existent comment gracefully', async () => {
    const nonExistentId = 99999;

    // This should not throw an error
    const result = await deleteComment(nonExistentId);

    // Should still return success even if no comment was found
    expect(result.success).toBe(true);
  });

  it('should preserve comments from other posts when deleting', async () => {
    // Create another post
    const post2Result = await db.insert(postsTable)
      .values({
        title: 'Test Post 2',
        slug: 'test-post-2',
        content: 'Test post 2 content',
        excerpt: 'Test excerpt 2',
        featured_image_url: null,
        media_type: 'text',
        media_url: null,
        status: 'published',
        published_at: new Date(),
        author_id: testUserId,
        category_id: testCategoryId,
        view_count: 0,
        like_count: 0
      })
      .returning()
      .execute();
    
    const testPost2Id = post2Result[0].id;

    // Create comments on both posts
    const comment1Result = await db.insert(commentsTable)
      .values({
        content: 'Comment on post 1',
        author_name: 'User 1',
        author_email: 'user1@example.com',
        author_website: null,
        post_id: testPostId,
        parent_id: null,
        is_approved: true
      })
      .returning()
      .execute();

    const comment2Result = await db.insert(commentsTable)
      .values({
        content: 'Comment on post 2',
        author_name: 'User 2',
        author_email: 'user2@example.com',
        author_website: null,
        post_id: testPost2Id,
        parent_id: null,
        is_approved: true
      })
      .returning()
      .execute();

    const comment1Id = comment1Result[0].id;
    const comment2Id = comment2Result[0].id;

    // Delete comment from post 1
    const result = await deleteComment(comment1Id);

    expect(result.success).toBe(true);

    // Verify comment from post 2 still exists
    const remainingComments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.post_id, testPost2Id))
      .execute();

    expect(remainingComments).toHaveLength(1);
    expect(remainingComments[0].content).toBe('Comment on post 2');

    // Verify comment from post 1 is deleted
    const post1Comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.post_id, testPostId))
      .execute();

    expect(post1Comments).toHaveLength(0);
  });
});