import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, postsTable, commentsTable } from '../db/schema';
import { approveComment } from '../handlers/approve_comment';
import { eq } from 'drizzle-orm';

describe('approveComment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should approve an existing comment', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'author@example.com',
        username: 'author',
        password_hash: 'hashedpassword',
        full_name: 'Test Author'
      })
      .returning()
      .execute();

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        slug: 'test-category'
      })
      .returning()
      .execute();

    const postResult = await db.insert(postsTable)
      .values({
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        author_id: userResult[0].id,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();

    // Create an unapproved comment
    const commentResult = await db.insert(commentsTable)
      .values({
        content: 'This is a test comment',
        author_name: 'John Commenter',
        author_email: 'john@example.com',
        post_id: postResult[0].id,
        is_approved: false
      })
      .returning()
      .execute();

    const commentId = commentResult[0].id;

    // Approve the comment
    const approvedComment = await approveComment(commentId);

    // Verify the response
    expect(approvedComment.id).toEqual(commentId);
    expect(approvedComment.content).toEqual('This is a test comment');
    expect(approvedComment.author_name).toEqual('John Commenter');
    expect(approvedComment.author_email).toEqual('john@example.com');
    expect(approvedComment.post_id).toEqual(postResult[0].id);
    expect(approvedComment.is_approved).toBe(true);
    expect(approvedComment.updated_at).toBeInstanceOf(Date);
    expect(approvedComment.created_at).toBeInstanceOf(Date);
  });

  it('should update comment approval status in database', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'author@example.com',
        username: 'author',
        password_hash: 'hashedpassword',
        full_name: 'Test Author'
      })
      .returning()
      .execute();

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        slug: 'test-category'
      })
      .returning()
      .execute();

    const postResult = await db.insert(postsTable)
      .values({
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        author_id: userResult[0].id,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();

    const commentResult = await db.insert(commentsTable)
      .values({
        content: 'Test comment for approval',
        author_name: 'Jane Commenter',
        author_email: 'jane@example.com',
        post_id: postResult[0].id,
        is_approved: false
      })
      .returning()
      .execute();

    const commentId = commentResult[0].id;

    // Approve the comment
    await approveComment(commentId);

    // Verify the database was updated
    const updatedComment = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, commentId))
      .execute();

    expect(updatedComment).toHaveLength(1);
    expect(updatedComment[0].is_approved).toBe(true);
    expect(updatedComment[0].updated_at).toBeInstanceOf(Date);
    // The updated_at should be more recent than created_at
    expect(updatedComment[0].updated_at >= updatedComment[0].created_at).toBe(true);
  });

  it('should throw error for non-existent comment', async () => {
    const nonExistentId = 99999;

    await expect(approveComment(nonExistentId))
      .rejects.toThrow(/comment with id 99999 not found/i);
  });

  it('should approve already approved comment without issues', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'author@example.com',
        username: 'author',
        password_hash: 'hashedpassword',
        full_name: 'Test Author'
      })
      .returning()
      .execute();

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        slug: 'test-category'
      })
      .returning()
      .execute();

    const postResult = await db.insert(postsTable)
      .values({
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        author_id: userResult[0].id,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();

    // Create an already approved comment
    const commentResult = await db.insert(commentsTable)
      .values({
        content: 'Already approved comment',
        author_name: 'Bob Commenter',
        author_email: 'bob@example.com',
        post_id: postResult[0].id,
        is_approved: true
      })
      .returning()
      .execute();

    const commentId = commentResult[0].id;

    // Approve the already approved comment
    const result = await approveComment(commentId);

    // Should still work and return the comment
    expect(result.id).toEqual(commentId);
    expect(result.is_approved).toBe(true);
    expect(result.content).toEqual('Already approved comment');
  });

  it('should handle comment with threaded reply structure', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'author@example.com',
        username: 'author',
        password_hash: 'hashedpassword',
        full_name: 'Test Author'
      })
      .returning()
      .execute();

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        slug: 'test-category'
      })
      .returning()
      .execute();

    const postResult = await db.insert(postsTable)
      .values({
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        author_id: userResult[0].id,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();

    // Create parent comment
    const parentCommentResult = await db.insert(commentsTable)
      .values({
        content: 'Parent comment',
        author_name: 'Parent User',
        author_email: 'parent@example.com',
        post_id: postResult[0].id,
        is_approved: true
      })
      .returning()
      .execute();

    // Create reply comment (child)
    const childCommentResult = await db.insert(commentsTable)
      .values({
        content: 'Reply to parent comment',
        author_name: 'Child User',
        author_email: 'child@example.com',
        post_id: postResult[0].id,
        parent_id: parentCommentResult[0].id,
        is_approved: false
      })
      .returning()
      .execute();

    const childCommentId = childCommentResult[0].id;

    // Approve the child comment
    const approvedComment = await approveComment(childCommentId);

    // Verify the threaded comment was approved correctly
    expect(approvedComment.id).toEqual(childCommentId);
    expect(approvedComment.content).toEqual('Reply to parent comment');
    expect(approvedComment.parent_id).toEqual(parentCommentResult[0].id);
    expect(approvedComment.is_approved).toBe(true);
  });
});