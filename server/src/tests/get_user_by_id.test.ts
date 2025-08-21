import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUserById } from '../handlers/get_user_by_id';

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user by ID', async () => {
    // Create test user
    const testUser = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        bio: 'A test user bio',
        avatar_url: 'https://example.com/avatar.jpg',
        is_verified: true
      })
      .returning()
      .execute();

    const userId = testUser[0].id;

    // Get user by ID
    const result = await getUserById(userId);

    // Verify user data
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(userId);
    expect(result!.email).toEqual('test@example.com');
    expect(result!.username).toEqual('testuser');
    expect(result!.full_name).toEqual('Test User');
    expect(result!.bio).toEqual('A test user bio');
    expect(result!.avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(result!.is_verified).toBe(true);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent user ID', async () => {
    const result = await getUserById(99999);
    expect(result).toBeNull();
  });

  it('should return user with minimal data (nullable fields as null)', async () => {
    // Create user with minimal required fields
    const testUser = await db.insert(usersTable)
      .values({
        email: 'minimal@example.com',
        username: 'minimaluser',
        password_hash: 'hashed_password',
        full_name: 'Minimal User',
        bio: null,
        avatar_url: null,
        is_verified: false
      })
      .returning()
      .execute();

    const userId = testUser[0].id;

    // Get user by ID
    const result = await getUserById(userId);

    // Verify user data with null fields
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(userId);
    expect(result!.email).toEqual('minimal@example.com');
    expect(result!.username).toEqual('minimaluser');
    expect(result!.full_name).toEqual('Minimal User');
    expect(result!.bio).toBeNull();
    expect(result!.avatar_url).toBeNull();
    expect(result!.is_verified).toBe(false);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should handle database query correctly with multiple users', async () => {
    // Create multiple test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          username: 'user1',
          password_hash: 'hash1',
          full_name: 'User One',
          is_verified: true
        },
        {
          email: 'user2@example.com',
          username: 'user2',
          password_hash: 'hash2',
          full_name: 'User Two',
          is_verified: false
        }
      ])
      .returning()
      .execute();

    // Get first user
    const result1 = await getUserById(users[0].id);
    expect(result1).not.toBeNull();
    expect(result1!.email).toEqual('user1@example.com');
    expect(result1!.username).toEqual('user1');
    expect(result1!.full_name).toEqual('User One');
    expect(result1!.is_verified).toBe(true);

    // Get second user
    const result2 = await getUserById(users[1].id);
    expect(result2).not.toBeNull();
    expect(result2!.email).toEqual('user2@example.com');
    expect(result2!.username).toEqual('user2');
    expect(result2!.full_name).toEqual('User Two');
    expect(result2!.is_verified).toBe(false);
  });
});