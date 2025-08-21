import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { commentsTable, postsTable, usersTable, categoriesTable } from '../db/schema';
import { type CreateCommentInput } from '../schema';
import { createComment } from '../handlers/create_comment';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser = {
  email: 'author@test.com',
  username: 'testauthor',
  password_hash: 'hashedpassword',
  full_name: 'Test Author',
  bio: null,
  avatar_url: null
};

const testCategory = {
  name: 'Tech',
  slug: 'tech',
  description: 'Technology posts',
  color: '#3b82f6'
};

const testPost = {
  title: 'Test Post',
  slug: 'test-post',
  content: 'This is a test post content.',
  excerpt: 'Test excerpt',
  featured_image_url: null,
  media_type: 'text' as const,
  media_url: null,
  status: 'published' as const,
  published_at: new Date(),
  author_id: 1, // Will be set dynamically
  category_id: 1, // Will be set dynamically
  view_count: 0,
  like_count: 0
};

// Simple test comment input
const testCommentInput: CreateCommentInput = {
  content: 'This is a test comment',
  author_name: 'John Doe',
  author_email: 'john@example.com',
  author_website: 'https://johndoe.com',
  post_id: 1, // Will be set dynamically
  parent_id: null
};

describe('createComment', () => {
  let userId: number;
  let categoryId: number;
  let postId: number;

  beforeEach(async () => {
    await createDB();

    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    categoryId = categoryResult[0].id;

    const postResult = await db.insert(postsTable)
      .values({
        ...testPost,
        author_id: userId,
        category_id: categoryId
      })
      .returning()
      .execute();
    postId = postResult[0].id;
  });

  afterEach(resetDB);

  it('should create a comment', async () => {
    const input: CreateCommentInput = {
      ...testCommentInput,
      post_id: postId
    };

    const result = await createComment(input);

    // Basic field validation
    expect(result.content).toEqual('This is a test comment');
    expect(result.author_name).toEqual('John Doe');
    expect(result.author_email).toEqual('john@example.com');
    expect(result.author_website).toEqual('https://johndoe.com');
    expect(result.post_id).toEqual(postId);
    expect(result.parent_id).toBeNull();
    expect(result.is_approved).toBe(false); // Comments require approval by default
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save comment to database', async () => {
    const input: CreateCommentInput = {
      ...testCommentInput,
      post_id: postId
    };

    const result = await createComment(input);

    // Query the database to verify the comment was saved
    const comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, result.id))
      .execute();

    expect(comments).toHaveLength(1);
    expect(comments[0].content).toEqual('This is a test comment');
    expect(comments[0].author_name).toEqual('John Doe');
    expect(comments[0].author_email).toEqual('john@example.com');
    expect(comments[0].author_website).toEqual('https://johndoe.com');
    expect(comments[0].post_id).toEqual(postId);
    expect(comments[0].is_approved).toBe(false);
    expect(comments[0].created_at).toBeInstanceOf(Date);
    expect(comments[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create comment without optional website', async () => {
    const input: CreateCommentInput = {
      content: 'Comment without website',
      author_name: 'Jane Smith',
      author_email: 'jane@example.com',
      post_id: postId,
      parent_id: null
    };

    const result = await createComment(input);

    expect(result.content).toEqual('Comment without website');
    expect(result.author_name).toEqual('Jane Smith');
    expect(result.author_email).toEqual('jane@example.com');
    expect(result.author_website).toBeNull();
    expect(result.post_id).toEqual(postId);
    expect(result.parent_id).toBeNull();
  });

  it('should create threaded comment (reply)', async () => {
    // First create a parent comment
    const parentInput: CreateCommentInput = {
      content: 'Parent comment',
      author_name: 'Parent Author',
      author_email: 'parent@example.com',
      post_id: postId,
      parent_id: null
    };

    const parentComment = await createComment(parentInput);

    // Now create a reply to the parent comment
    const replyInput: CreateCommentInput = {
      content: 'This is a reply',
      author_name: 'Reply Author',
      author_email: 'reply@example.com',
      post_id: postId,
      parent_id: parentComment.id
    };

    const result = await createComment(replyInput);

    expect(result.content).toEqual('This is a reply');
    expect(result.author_name).toEqual('Reply Author');
    expect(result.post_id).toEqual(postId);
    expect(result.parent_id).toEqual(parentComment.id);
    expect(result.is_approved).toBe(false);
  });

  it('should throw error when post does not exist', async () => {
    const input: CreateCommentInput = {
      ...testCommentInput,
      post_id: 99999 // Non-existent post ID
    };

    await expect(createComment(input)).rejects.toThrow(/Post with id 99999 not found/);
  });

  it('should throw error when parent comment does not exist', async () => {
    const input: CreateCommentInput = {
      ...testCommentInput,
      post_id: postId,
      parent_id: 99999 // Non-existent parent comment ID
    };

    await expect(createComment(input)).rejects.toThrow(/Parent comment with id 99999 not found/);
  });

  it('should throw error when parent comment belongs to different post', async () => {
    // Create another post
    const anotherPostResult = await db.insert(postsTable)
      .values({
        ...testPost,
        title: 'Another Post',
        slug: 'another-post',
        author_id: userId,
        category_id: categoryId
      })
      .returning()
      .execute();
    const anotherPostId = anotherPostResult[0].id;

    // Create a comment on the other post
    const commentOnOtherPost: CreateCommentInput = {
      content: 'Comment on other post',
      author_name: 'Other Author',
      author_email: 'other@example.com',
      post_id: anotherPostId,
      parent_id: null
    };

    const otherComment = await createComment(commentOnOtherPost);

    // Try to create a reply on our original post but referencing the comment from the other post
    const invalidReplyInput: CreateCommentInput = {
      content: 'Invalid reply',
      author_name: 'Invalid Author',
      author_email: 'invalid@example.com',
      post_id: postId, // Different post
      parent_id: otherComment.id // Parent belongs to different post
    };

    await expect(createComment(invalidReplyInput)).rejects.toThrow(/Parent comment must belong to the same post/);
  });

  it('should handle comments with special characters', async () => {
    const input: CreateCommentInput = {
      content: 'Comment with special chars: äöü, 中文, 🚀, "quotes", & ampersands',
      author_name: 'Spëcial Ütser',
      author_email: 'special@example.com',
      author_website: 'https://spëcial.com',
      post_id: postId,
      parent_id: null
    };

    const result = await createComment(input);

    expect(result.content).toEqual('Comment with special chars: äöü, 中文, 🚀, "quotes", & ampersands');
    expect(result.author_name).toEqual('Spëcial Ütser');
    expect(result.author_website).toEqual('https://spëcial.com');

    // Verify in database
    const comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, result.id))
      .execute();

    expect(comments[0].content).toEqual('Comment with special chars: äöü, 中文, 🚀, "quotes", & ampersands');
    expect(comments[0].author_name).toEqual('Spëcial Ütser');
  });
});