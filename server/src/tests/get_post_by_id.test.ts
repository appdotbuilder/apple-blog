import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, postsTable } from '../db/schema';
import { getPostById } from '../handlers/get_post_by_id';
import { eq } from 'drizzle-orm';

describe('getPostById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent post', async () => {
    const result = await getPostById(999);
    expect(result).toBeNull();
  });

  it('should fetch post by ID and increment view count', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'author@test.com',
        username: 'testauthor',
        password_hash: 'hashedpassword',
        full_name: 'Test Author'
      })
      .returning()
      .execute();

    const [category] = await db.insert(categoriesTable)
      .values({
        name: 'Technology',
        slug: 'technology',
        description: 'Tech posts',
        color: '#0066cc'
      })
      .returning()
      .execute();

    // Create test post
    const [post] = await db.insert(postsTable)
      .values({
        title: 'Test Post',
        slug: 'test-post',
        content: 'This is test content',
        excerpt: 'Test excerpt',
        featured_image_url: 'https://example.com/image.jpg',
        media_type: 'text',
        media_url: null,
        status: 'published',
        published_at: new Date('2024-01-01'),
        author_id: user.id,
        category_id: category.id,
        view_count: 5,
        like_count: 3
      })
      .returning()
      .execute();

    // Fetch the post
    const result = await getPostById(post.id);

    // Verify result structure
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(post.id);
    expect(result!.title).toEqual('Test Post');
    expect(result!.slug).toEqual('test-post');
    expect(result!.content).toEqual('This is test content');
    expect(result!.excerpt).toEqual('Test excerpt');
    expect(result!.featured_image_url).toEqual('https://example.com/image.jpg');
    expect(result!.media_type).toEqual('text');
    expect(result!.media_url).toBeNull();
    expect(result!.status).toEqual('published');
    expect(result!.published_at).toBeInstanceOf(Date);
    expect(result!.author_id).toEqual(user.id);
    expect(result!.category_id).toEqual(category.id);
    expect(result!.view_count).toEqual(6); // Should be incremented
    expect(result!.like_count).toEqual(3);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should increment view count in database', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'author2@test.com',
        username: 'testauthor2',
        password_hash: 'hashedpassword',
        full_name: 'Test Author 2'
      })
      .returning()
      .execute();

    // Create test post with initial view count
    const [post] = await db.insert(postsTable)
      .values({
        title: 'View Count Test',
        slug: 'view-count-test',
        content: 'Testing view count increment',
        author_id: user.id,
        view_count: 10
      })
      .returning()
      .execute();

    // Fetch the post (should increment view count)
    await getPostById(post.id);

    // Verify view count was incremented in database
    const updatedPosts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, post.id))
      .execute();

    expect(updatedPosts).toHaveLength(1);
    expect(updatedPosts[0].view_count).toEqual(11);
  });

  it('should handle post with nullable fields', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'author3@test.com',
        username: 'testauthor3',
        password_hash: 'hashedpassword',
        full_name: 'Test Author 3'
      })
      .returning()
      .execute();

    // Create post with minimal data (nullable fields as null)
    const [post] = await db.insert(postsTable)
      .values({
        title: 'Minimal Post',
        slug: 'minimal-post',
        content: 'Minimal content',
        author_id: user.id,
        // All optional fields left as defaults/null
        excerpt: null,
        featured_image_url: null,
        media_url: null,
        category_id: null,
        published_at: null
      })
      .returning()
      .execute();

    const result = await getPostById(post.id);

    expect(result).not.toBeNull();
    expect(result!.excerpt).toBeNull();
    expect(result!.featured_image_url).toBeNull();
    expect(result!.media_url).toBeNull();
    expect(result!.category_id).toBeNull();
    expect(result!.published_at).toBeNull();
    expect(result!.media_type).toEqual('text'); // Default value
    expect(result!.status).toEqual('draft'); // Default value
    expect(result!.view_count).toEqual(1); // Should be incremented from 0
  });

  it('should handle multiple consecutive fetches', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'author4@test.com',
        username: 'testauthor4',
        password_hash: 'hashedpassword',
        full_name: 'Test Author 4'
      })
      .returning()
      .execute();

    // Create test post
    const [post] = await db.insert(postsTable)
      .values({
        title: 'Multiple Fetch Test',
        slug: 'multiple-fetch-test',
        content: 'Testing multiple fetches',
        author_id: user.id,
        view_count: 0
      })
      .returning()
      .execute();

    // Fetch multiple times
    const result1 = await getPostById(post.id);
    const result2 = await getPostById(post.id);
    const result3 = await getPostById(post.id);

    // Each fetch should increment view count
    expect(result1!.view_count).toEqual(1);
    expect(result2!.view_count).toEqual(2);
    expect(result3!.view_count).toEqual(3);

    // Verify final state in database
    const finalPosts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, post.id))
      .execute();

    expect(finalPosts[0].view_count).toEqual(3);
  });
});