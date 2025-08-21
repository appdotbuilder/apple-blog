import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, commentsTable } from '../db/schema';
import { type GetCommentsInput } from '../schema';
import { getComments } from '../handlers/get_comments';

// Test data setup
const testUser = {
  email: 'testuser@example.com',
  username: 'testuser',
  password_hash: 'hashed_password',
  full_name: 'Test User'
};

const testPost = {
  title: 'Test Post',
  slug: 'test-post',
  content: 'This is a test post content.',
  author_id: 1 // Will be set after user creation
};

const testComments = [
  {
    content: 'This is the first comment.',
    author_name: 'John Doe',
    author_email: 'john@example.com',
    post_id: 1, // Will be set after post creation
    is_approved: true
  },
  {
    content: 'This is the second comment.',
    author_name: 'Jane Smith',
    author_email: 'jane@example.com',
    post_id: 1, // Will be set after post creation
    is_approved: true
  },
  {
    content: 'This comment is not approved.',
    author_name: 'Spam User',
    author_email: 'spam@example.com',
    post_id: 1, // Will be set after post creation
    is_approved: false
  }
];

describe('getComments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get approved comments for a post', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        author_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create test comments
    await db.insert(commentsTable)
      .values(testComments.map(comment => ({
        ...comment,
        post_id: postResult[0].id
      })))
      .execute();

    const input: GetCommentsInput = {
      post_id: postResult[0].id,
      limit: 10,
      offset: 0,
      approved_only: true
    };

    const result = await getComments(input);

    // Should return only approved comments (2 out of 3)
    expect(result).toHaveLength(2);
    
    // Verify all returned comments are approved
    result.forEach(comment => {
      expect(comment.is_approved).toBe(true);
      expect(comment.post_id).toBe(postResult[0].id);
      expect(comment.created_at).toBeInstanceOf(Date);
      expect(comment.updated_at).toBeInstanceOf(Date);
    });

    // Verify content of returned comments
    expect(result[0].content).toBe('This is the first comment.');
    expect(result[0].author_name).toBe('John Doe');
    expect(result[0].author_email).toBe('john@example.com');
    
    expect(result[1].content).toBe('This is the second comment.');
    expect(result[1].author_name).toBe('Jane Smith');
    expect(result[1].author_email).toBe('jane@example.com');
  });

  it('should get all comments when approved_only is false', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        author_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create test comments
    await db.insert(commentsTable)
      .values(testComments.map(comment => ({
        ...comment,
        post_id: postResult[0].id
      })))
      .execute();

    const input: GetCommentsInput = {
      post_id: postResult[0].id,
      limit: 10,
      offset: 0,
      approved_only: false
    };

    const result = await getComments(input);

    // Should return all comments (3 total)
    expect(result).toHaveLength(3);
    
    // Verify mix of approved and unapproved comments
    const approvedCount = result.filter(comment => comment.is_approved).length;
    const unapprovedCount = result.filter(comment => !comment.is_approved).length;
    
    expect(approvedCount).toBe(2);
    expect(unapprovedCount).toBe(1);
    
    // All comments should belong to the same post
    result.forEach(comment => {
      expect(comment.post_id).toBe(postResult[0].id);
    });
  });

  it('should apply pagination correctly', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        author_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create 5 approved comments for pagination testing
    // Insert them one by one with slight delays to ensure proper ordering
    const commentIds: number[] = [];
    for (let i = 0; i < 5; i++) {
      const commentResult = await db.insert(commentsTable)
        .values({
          content: `Comment number ${i + 1}`,
          author_name: `Author ${i + 1}`,
          author_email: `author${i + 1}@example.com`,
          post_id: postResult[0].id,
          is_approved: true
        })
        .returning()
        .execute();
      commentIds.push(commentResult[0].id);
    }

    // Test first page (limit 2, offset 0)
    const firstPageInput: GetCommentsInput = {
      post_id: postResult[0].id,
      limit: 2,
      offset: 0,
      approved_only: true
    };

    const firstPageResult = await getComments(firstPageInput);
    expect(firstPageResult).toHaveLength(2);
    
    // Verify we get different comments than the second page (no overlap)
    const firstPageIds = firstPageResult.map(comment => comment.id);

    // Test second page (limit 2, offset 2)
    const secondPageInput: GetCommentsInput = {
      post_id: postResult[0].id,
      limit: 2,
      offset: 2,
      approved_only: true
    };

    const secondPageResult = await getComments(secondPageInput);
    expect(secondPageResult).toHaveLength(2);
    
    const secondPageIds = secondPageResult.map(comment => comment.id);
    
    // Verify pagination works - no overlap between pages
    expect(firstPageIds).not.toEqual(expect.arrayContaining(secondPageIds));
    expect(secondPageIds).not.toEqual(expect.arrayContaining(firstPageIds));
    
    // Test third page (limit 2, offset 4) - should have 1 comment (5 total - 4 skipped = 1)
    const thirdPageInput: GetCommentsInput = {
      post_id: postResult[0].id,
      limit: 2,
      offset: 4,
      approved_only: true
    };

    const thirdPageResult = await getComments(thirdPageInput);
    expect(thirdPageResult).toHaveLength(1);
  });

  it('should return empty array for non-existent post', async () => {
    const input: GetCommentsInput = {
      post_id: 999, // Non-existent post ID
      limit: 10,
      offset: 0,
      approved_only: true
    };

    const result = await getComments(input);
    expect(result).toHaveLength(0);
  });

  it('should handle comments with threaded structure', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        author_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create parent comment
    const parentCommentResult = await db.insert(commentsTable)
      .values({
        content: 'This is a parent comment.',
        author_name: 'Parent Author',
        author_email: 'parent@example.com',
        post_id: postResult[0].id,
        is_approved: true
      })
      .returning()
      .execute();

    // Create reply comment
    await db.insert(commentsTable)
      .values({
        content: 'This is a reply to the parent comment.',
        author_name: 'Reply Author',
        author_email: 'reply@example.com',
        post_id: postResult[0].id,
        parent_id: parentCommentResult[0].id,
        is_approved: true
      })
      .execute();

    const input: GetCommentsInput = {
      post_id: postResult[0].id,
      limit: 10,
      offset: 0,
      approved_only: true
    };

    const result = await getComments(input);

    expect(result).toHaveLength(2);
    
    // Find parent and reply comments
    const parentComment = result.find(comment => comment.parent_id === null);
    const replyComment = result.find(comment => comment.parent_id !== null);
    
    expect(parentComment).toBeDefined();
    expect(replyComment).toBeDefined();
    expect(replyComment!.parent_id).toBe(parentComment!.id);
    expect(replyComment!.content).toBe('This is a reply to the parent comment.');
  });

  it('should handle comments with optional author_website field', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        author_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create comment with website
    await db.insert(commentsTable)
      .values({
        content: 'Comment with website.',
        author_name: 'Web Author',
        author_email: 'web@example.com',
        author_website: 'https://example.com',
        post_id: postResult[0].id,
        is_approved: true
      })
      .execute();

    // Create comment without website
    await db.insert(commentsTable)
      .values({
        content: 'Comment without website.',
        author_name: 'No Web Author',
        author_email: 'noweb@example.com',
        post_id: postResult[0].id,
        is_approved: true
      })
      .execute();

    const input: GetCommentsInput = {
      post_id: postResult[0].id,
      limit: 10,
      offset: 0,
      approved_only: true
    };

    const result = await getComments(input);

    expect(result).toHaveLength(2);
    
    const commentWithWebsite = result.find(comment => comment.content === 'Comment with website.');
    const commentWithoutWebsite = result.find(comment => comment.content === 'Comment without website.');
    
    expect(commentWithWebsite!.author_website).toBe('https://example.com');
    expect(commentWithoutWebsite!.author_website).toBeNull();
  });
});