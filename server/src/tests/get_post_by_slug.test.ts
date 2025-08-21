import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { postsTable, usersTable, categoriesTable } from '../db/schema';
import { type CreateUserInput, type CreateCategoryInput, type CreatePostInput } from '../schema';
import { getPostBySlug } from '../handlers/get_post_by_slug';
import { eq } from 'drizzle-orm';

describe('getPostBySlug', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent post', async () => {
    const result = await getPostBySlug('non-existent-slug');
    expect(result).toBeNull();
  });

  it('should fetch post by slug and increment view count', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'author@example.com',
        username: 'testauthor',
        password_hash: 'hashed_password',
        full_name: 'Test Author',
        bio: null,
        avatar_url: null,
        is_verified: false
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Technology',
        slug: 'technology',
        description: 'Tech posts',
        color: '#6366f1'
      })
      .returning()
      .execute();

    const category = categoryResult[0];

    // Create test post
    const postResult = await db.insert(postsTable)
      .values({
        title: 'Test Post',
        slug: 'test-post',
        content: 'This is test content',
        excerpt: 'Test excerpt',
        featured_image_url: null,
        media_type: 'text',
        media_url: null,
        status: 'published',
        published_at: new Date(),
        author_id: user.id,
        category_id: category.id,
        view_count: 5,
        like_count: 2
      })
      .returning()
      .execute();

    const originalPost = postResult[0];

    // Test fetching post by slug
    const result = await getPostBySlug('test-post');

    // Verify post details
    expect(result).not.toBeNull();
    expect(result!.id).toBe(originalPost.id);
    expect(result!.title).toBe('Test Post');
    expect(result!.slug).toBe('test-post');
    expect(result!.content).toBe('This is test content');
    expect(result!.excerpt).toBe('Test excerpt');
    expect(result!.status).toBe('published');
    expect(result!.author_id).toBe(user.id);
    expect(result!.category_id).toBe(category.id);
    expect(result!.like_count).toBe(2);

    // Verify view count was incremented
    expect(result!.view_count).toBe(6); // Original 5 + 1

    // Verify database was updated
    const updatedPostInDb = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, originalPost.id))
      .execute();

    expect(updatedPostInDb[0].view_count).toBe(6);
  });

  it('should handle posts with null category', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'author2@example.com',
        username: 'testauthor2',
        password_hash: 'hashed_password',
        full_name: 'Test Author 2',
        bio: null,
        avatar_url: null,
        is_verified: false
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create post without category
    await db.insert(postsTable)
      .values({
        title: 'Uncategorized Post',
        slug: 'uncategorized-post',
        content: 'Post without category',
        excerpt: null,
        featured_image_url: null,
        media_type: 'text',
        media_url: null,
        status: 'published',
        published_at: new Date(),
        author_id: user.id,
        category_id: null, // No category
        view_count: 0,
        like_count: 0
      })
      .returning()
      .execute();

    const result = await getPostBySlug('uncategorized-post');

    expect(result).not.toBeNull();
    expect(result!.title).toBe('Uncategorized Post');
    expect(result!.category_id).toBeNull();
    expect(result!.view_count).toBe(1); // Incremented from 0 to 1
  });

  it('should handle draft posts', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'author3@example.com',
        username: 'testauthor3',
        password_hash: 'hashed_password',
        full_name: 'Test Author 3',
        bio: null,
        avatar_url: null,
        is_verified: false
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create draft post
    await db.insert(postsTable)
      .values({
        title: 'Draft Post',
        slug: 'draft-post',
        content: 'This is a draft',
        excerpt: null,
        featured_image_url: null,
        media_type: 'text',
        media_url: null,
        status: 'draft',
        published_at: null,
        author_id: user.id,
        category_id: null,
        view_count: 0,
        like_count: 0
      })
      .returning()
      .execute();

    const result = await getPostBySlug('draft-post');

    expect(result).not.toBeNull();
    expect(result!.status).toBe('draft');
    expect(result!.published_at).toBeNull();
    expect(result!.view_count).toBe(1); // Still increments view count
  });

  it('should handle different media types', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'author4@example.com',
        username: 'testauthor4',
        password_hash: 'hashed_password',
        full_name: 'Test Author 4',
        bio: null,
        avatar_url: null,
        is_verified: false
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create video post
    await db.insert(postsTable)
      .values({
        title: 'Video Post',
        slug: 'video-post',
        content: 'Check out this video',
        excerpt: 'A video post',
        featured_image_url: 'https://example.com/thumbnail.jpg',
        media_type: 'video',
        media_url: 'https://example.com/video.mp4',
        status: 'published',
        published_at: new Date(),
        author_id: user.id,
        category_id: null,
        view_count: 10,
        like_count: 3
      })
      .returning()
      .execute();

    const result = await getPostBySlug('video-post');

    expect(result).not.toBeNull();
    expect(result!.media_type).toBe('video');
    expect(result!.media_url).toBe('https://example.com/video.mp4');
    expect(result!.featured_image_url).toBe('https://example.com/thumbnail.jpg');
    expect(result!.view_count).toBe(11); // Incremented from 10 to 11
  });

  it('should increment view count correctly on multiple calls', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'author5@example.com',
        username: 'testauthor5',
        password_hash: 'hashed_password',
        full_name: 'Test Author 5',
        bio: null,
        avatar_url: null,
        is_verified: false
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create post
    await db.insert(postsTable)
      .values({
        title: 'Popular Post',
        slug: 'popular-post',
        content: 'This will get many views',
        excerpt: null,
        featured_image_url: null,
        media_type: 'text',
        media_url: null,
        status: 'published',
        published_at: new Date(),
        author_id: user.id,
        category_id: null,
        view_count: 0,
        like_count: 0
      })
      .returning()
      .execute();

    // Call multiple times and verify view count increments
    const result1 = await getPostBySlug('popular-post');
    expect(result1!.view_count).toBe(1);

    const result2 = await getPostBySlug('popular-post');
    expect(result2!.view_count).toBe(2);

    const result3 = await getPostBySlug('popular-post');
    expect(result3!.view_count).toBe(3);

    // Verify final state in database
    const finalPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.slug, 'popular-post'))
      .execute();

    expect(finalPost[0].view_count).toBe(3);
  });
});