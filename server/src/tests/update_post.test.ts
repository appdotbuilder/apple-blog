import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { postsTable, usersTable, categoriesTable } from '../db/schema';
import { type UpdatePostInput } from '../schema';
import { updatePost } from '../handlers/update_post';
import { eq } from 'drizzle-orm';

describe('updatePost', () => {
  let testUserId: number;
  let testCategoryId: number;
  let testPostId: number;
  let secondCategoryId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test categories
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Technology',
        slug: 'technology',
        description: 'Tech posts',
        color: '#ff0000'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;

    const secondCategoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Science',
        slug: 'science',
        description: 'Science posts',
        color: '#00ff00'
      })
      .returning()
      .execute();
    secondCategoryId = secondCategoryResult[0].id;

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        title: 'Original Title',
        slug: 'original-title',
        content: 'Original content',
        excerpt: 'Original excerpt',
        media_type: 'text',
        status: 'draft',
        author_id: testUserId,
        category_id: testCategoryId
      })
      .returning()
      .execute();
    testPostId = postResult[0].id;
  });

  afterEach(resetDB);

  it('should update post with all provided fields', async () => {
    const input: UpdatePostInput = {
      id: testPostId,
      title: 'Updated Title',
      slug: 'updated-title',
      content: 'Updated content here',
      excerpt: 'Updated excerpt',
      featured_image_url: 'https://example.com/image.jpg',
      media_type: 'image',
      media_url: 'https://example.com/media.jpg',
      status: 'published',
      category_id: secondCategoryId
    };

    const result = await updatePost(input);

    expect(result.id).toEqual(testPostId);
    expect(result.title).toEqual('Updated Title');
    expect(result.slug).toEqual('updated-title');
    expect(result.content).toEqual('Updated content here');
    expect(result.excerpt).toEqual('Updated excerpt');
    expect(result.featured_image_url).toEqual('https://example.com/image.jpg');
    expect(result.media_type).toEqual('image');
    expect(result.media_url).toEqual('https://example.com/media.jpg');
    expect(result.status).toEqual('published');
    expect(result.category_id).toEqual(secondCategoryId);
    expect(result.published_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    const input: UpdatePostInput = {
      id: testPostId,
      title: 'Only Title Updated'
    };

    const result = await updatePost(input);

    expect(result.title).toEqual('Only Title Updated');
    expect(result.slug).toEqual('original-title'); // Should remain unchanged
    expect(result.content).toEqual('Original content'); // Should remain unchanged
    expect(result.status).toEqual('draft'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set published_at when status changes to published', async () => {
    const beforeUpdate = new Date();
    
    const input: UpdatePostInput = {
      id: testPostId,
      status: 'published'
    };

    const result = await updatePost(input);

    expect(result.status).toEqual('published');
    expect(result.published_at).toBeInstanceOf(Date);
    expect(result.published_at!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
  });

  it('should not change published_at when already published', async () => {
    // First, publish the post
    await updatePost({
      id: testPostId,
      status: 'published'
    });

    // Get the published_at timestamp
    const publishedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();
    const originalPublishedAt = publishedPost[0].published_at;

    // Wait a bit to ensure timestamps would be different
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update something else while keeping status as published
    const result = await updatePost({
      id: testPostId,
      title: 'New Title'
    });

    expect(result.published_at).toEqual(originalPublishedAt);
    expect(result.title).toEqual('New Title');
  });

  it('should allow setting category_id to null', async () => {
    const input: UpdatePostInput = {
      id: testPostId,
      category_id: null
    };

    const result = await updatePost(input);

    expect(result.category_id).toBeNull();
  });

  it('should allow setting optional fields to null', async () => {
    const input: UpdatePostInput = {
      id: testPostId,
      excerpt: null,
      featured_image_url: null,
      media_url: null
    };

    const result = await updatePost(input);

    expect(result.excerpt).toBeNull();
    expect(result.featured_image_url).toBeNull();
    expect(result.media_url).toBeNull();
  });

  it('should persist changes to database', async () => {
    const input: UpdatePostInput = {
      id: testPostId,
      title: 'Database Test Title',
      content: 'Database test content'
    };

    await updatePost(input);

    // Query database directly to verify changes
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();

    expect(posts).toHaveLength(1);
    expect(posts[0].title).toEqual('Database Test Title');
    expect(posts[0].content).toEqual('Database test content');
    expect(posts[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when post does not exist', async () => {
    const input: UpdatePostInput = {
      id: 999999,
      title: 'Non-existent Post'
    };

    expect(updatePost(input)).rejects.toThrow(/Post with id 999999 not found/);
  });

  it('should throw error when category does not exist', async () => {
    const input: UpdatePostInput = {
      id: testPostId,
      category_id: 999999
    };

    expect(updatePost(input)).rejects.toThrow(/Category with id 999999 not found/);
  });

  it('should handle status change from published to draft', async () => {
    // First publish the post
    await updatePost({
      id: testPostId,
      status: 'published'
    });

    // Get the published timestamp
    const publishedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPostId))
      .execute();
    const originalPublishedAt = publishedPost[0].published_at;

    // Change back to draft
    const result = await updatePost({
      id: testPostId,
      status: 'draft'
    });

    expect(result.status).toEqual('draft');
    // published_at should remain unchanged (keep original publish timestamp)
    expect(result.published_at).toEqual(originalPublishedAt);
  });

  it('should update all media-related fields correctly', async () => {
    const input: UpdatePostInput = {
      id: testPostId,
      media_type: 'video',
      media_url: 'https://example.com/video.mp4',
      featured_image_url: 'https://example.com/thumbnail.jpg'
    };

    const result = await updatePost(input);

    expect(result.media_type).toEqual('video');
    expect(result.media_url).toEqual('https://example.com/video.mp4');
    expect(result.featured_image_url).toEqual('https://example.com/thumbnail.jpg');
  });
});