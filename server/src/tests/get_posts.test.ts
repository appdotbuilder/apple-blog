import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, postsTable } from '../db/schema';
import { type GetPostsInput } from '../schema';
import { getPosts } from '../handlers/get_posts';

describe('getPosts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data
  let testUserId: number;
  let testCategoryId: number;
  let testPostId1: number;
  let testPostId2: number;
  let testPostId3: number;

  const setupTestData = async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        bio: 'Test bio',
        is_verified: true
      })
      .returning({ id: usersTable.id })
      .execute();
    testUserId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Technology',
        slug: 'technology',
        description: 'Tech posts',
        color: '#3b82f6'
      })
      .returning({ id: categoriesTable.id })
      .execute();
    testCategoryId = categoryResult[0].id;

    // Create test posts with different statuses and categories
    const post1Result = await db.insert(postsTable)
      .values({
        title: 'Published Tech Post',
        slug: 'published-tech-post',
        content: 'This is a published technology post',
        excerpt: 'Published tech excerpt',
        status: 'published',
        author_id: testUserId,
        category_id: testCategoryId,
        view_count: 100,
        like_count: 10,
        published_at: new Date()
      })
      .returning({ id: postsTable.id })
      .execute();
    testPostId1 = post1Result[0].id;

    const post2Result = await db.insert(postsTable)
      .values({
        title: 'Draft Post',
        slug: 'draft-post',
        content: 'This is a draft post',
        status: 'draft',
        author_id: testUserId,
        category_id: testCategoryId,
        view_count: 0,
        like_count: 0
      })
      .returning({ id: postsTable.id })
      .execute();
    testPostId2 = post2Result[0].id;

    const post3Result = await db.insert(postsTable)
      .values({
        title: 'Uncategorized Published Post',
        slug: 'uncategorized-published-post',
        content: 'This is an uncategorized published post',
        status: 'published',
        author_id: testUserId,
        view_count: 50,
        like_count: 5,
        published_at: new Date()
      })
      .returning({ id: postsTable.id })
      .execute();
    testPostId3 = post3Result[0].id;
  };

  it('should get all posts with default pagination', async () => {
    await setupTestData();

    const input: GetPostsInput = {
      limit: 10,
      offset: 0
    };

    const result = await getPosts(input);

    expect(result).toHaveLength(3);
    
    // Check that posts are ordered by created_at desc (most recent first)
    expect(result[0].title).toEqual('Uncategorized Published Post');
    expect(result[1].title).toEqual('Draft Post');
    expect(result[2].title).toEqual('Published Tech Post');

    // Verify post structure
    const post = result[0];
    expect(post.id).toBeDefined();
    expect(post.title).toBeDefined();
    expect(post.slug).toBeDefined();
    expect(post.content).toBeDefined();
    expect(post.status).toBeDefined();
    expect(post.author_id).toEqual(testUserId);
    expect(post.view_count).toBeDefined();
    expect(post.like_count).toBeDefined();
    expect(post.created_at).toBeInstanceOf(Date);
    expect(post.updated_at).toBeInstanceOf(Date);
  });

  it('should filter posts by category_id', async () => {
    await setupTestData();

    const input: GetPostsInput = {
      limit: 10,
      offset: 0,
      category_id: testCategoryId
    };

    const result = await getPosts(input);

    expect(result).toHaveLength(2);
    result.forEach(post => {
      expect(post.category_id).toEqual(testCategoryId);
    });
    
    // Should include both published and draft posts in the category
    const titles = result.map(p => p.title);
    expect(titles).toContain('Published Tech Post');
    expect(titles).toContain('Draft Post');
    expect(titles).not.toContain('Uncategorized Published Post');
  });

  it('should filter posts by status', async () => {
    await setupTestData();

    const input: GetPostsInput = {
      limit: 10,
      offset: 0,
      status: 'published'
    };

    const result = await getPosts(input);

    expect(result).toHaveLength(2);
    result.forEach(post => {
      expect(post.status).toEqual('published');
    });

    const titles = result.map(p => p.title);
    expect(titles).toContain('Published Tech Post');
    expect(titles).toContain('Uncategorized Published Post');
    expect(titles).not.toContain('Draft Post');
  });

  it('should filter posts by author_id', async () => {
    await setupTestData();

    // Create another user and post
    const anotherUserResult = await db.insert(usersTable)
      .values({
        email: 'another@example.com',
        username: 'anotheruser',
        password_hash: 'hashedpassword',
        full_name: 'Another User'
      })
      .returning({ id: usersTable.id })
      .execute();
    const anotherUserId = anotherUserResult[0].id;

    await db.insert(postsTable)
      .values({
        title: 'Post by Another User',
        slug: 'post-by-another-user',
        content: 'Content by another user',
        status: 'published',
        author_id: anotherUserId
      })
      .execute();

    const input: GetPostsInput = {
      limit: 10,
      offset: 0,
      author_id: testUserId
    };

    const result = await getPosts(input);

    expect(result).toHaveLength(3);
    result.forEach(post => {
      expect(post.author_id).toEqual(testUserId);
    });
  });

  it('should combine multiple filters', async () => {
    await setupTestData();

    const input: GetPostsInput = {
      limit: 10,
      offset: 0,
      category_id: testCategoryId,
      status: 'published',
      author_id: testUserId
    };

    const result = await getPosts(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Published Tech Post');
    expect(result[0].category_id).toEqual(testCategoryId);
    expect(result[0].status).toEqual('published');
    expect(result[0].author_id).toEqual(testUserId);
  });

  it('should handle pagination correctly', async () => {
    await setupTestData();

    // First page
    const firstPageInput: GetPostsInput = {
      limit: 2,
      offset: 0
    };

    const firstPage = await getPosts(firstPageInput);
    expect(firstPage).toHaveLength(2);

    // Second page
    const secondPageInput: GetPostsInput = {
      limit: 2,
      offset: 2
    };

    const secondPage = await getPosts(secondPageInput);
    expect(secondPage).toHaveLength(1);

    // Ensure no overlap
    const firstPageIds = firstPage.map(p => p.id);
    const secondPageIds = secondPage.map(p => p.id);
    expect(firstPageIds).not.toEqual(expect.arrayContaining(secondPageIds));
  });

  it('should handle null category_id filter', async () => {
    await setupTestData();

    const input: GetPostsInput = {
      limit: 10,
      offset: 0,
      category_id: null
    };

    const result = await getPosts(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Uncategorized Published Post');
    expect(result[0].category_id).toBeNull();
  });

  it('should return empty array when no posts match filters', async () => {
    await setupTestData();

    const input: GetPostsInput = {
      limit: 10,
      offset: 0,
      status: 'archived' // No archived posts exist
    };

    const result = await getPosts(input);
    expect(result).toHaveLength(0);
  });

  it('should handle edge case with zero limit', async () => {
    await setupTestData();

    const input: GetPostsInput = {
      limit: 1, // Minimum allowed by schema
      offset: 0
    };

    const result = await getPosts(input);
    expect(result).toHaveLength(1);
  });

  it('should respect ordering by created_at desc', async () => {
    await setupTestData();

    // Add a small delay and create another post to test ordering
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await db.insert(postsTable)
      .values({
        title: 'Newest Post',
        slug: 'newest-post',
        content: 'This is the newest post',
        status: 'published',
        author_id: testUserId
      })
      .execute();

    const input: GetPostsInput = {
      limit: 10,
      offset: 0
    };

    const result = await getPosts(input);

    expect(result).toHaveLength(4);
    expect(result[0].title).toEqual('Newest Post'); // Most recent first
    
    // Verify ordering
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].created_at.getTime()).toBeGreaterThanOrEqual(
        result[i + 1].created_at.getTime()
      );
    }
  });
});