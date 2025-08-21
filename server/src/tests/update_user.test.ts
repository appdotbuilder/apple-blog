import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        bio: 'Original bio',
        avatar_url: 'https://example.com/avatar.jpg',
        is_verified: false
      })
      .returning()
      .execute();
    
    return result[0];
  };

  it('should update user profile information', async () => {
    const testUser = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: testUser.id,
      username: 'updateduser',
      full_name: 'Updated User',
      bio: 'Updated bio',
      avatar_url: 'https://example.com/new-avatar.jpg'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(testUser.id);
    expect(result.email).toEqual('test@example.com'); // Email should not change
    expect(result.username).toEqual('updateduser');
    expect(result.full_name).toEqual('Updated User');
    expect(result.bio).toEqual('Updated bio');
    expect(result.avatar_url).toEqual('https://example.com/new-avatar.jpg');
    expect(result.is_verified).toEqual(false); // Should not change
    expect(result.created_at).toEqual(testUser.created_at); // Should not change
    expect(result.updated_at.getTime()).toBeGreaterThan(testUser.updated_at.getTime()); // Should be updated
  });

  it('should update only provided fields', async () => {
    const testUser = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: testUser.id,
      username: 'partialupdate'
    };

    const result = await updateUser(updateInput);

    expect(result.username).toEqual('partialupdate');
    expect(result.full_name).toEqual('Test User'); // Should remain unchanged
    expect(result.bio).toEqual('Original bio'); // Should remain unchanged
    expect(result.avatar_url).toEqual('https://example.com/avatar.jpg'); // Should remain unchanged
  });

  it('should handle null values for nullable fields', async () => {
    const testUser = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: testUser.id,
      bio: null,
      avatar_url: null
    };

    const result = await updateUser(updateInput);

    expect(result.bio).toBeNull();
    expect(result.avatar_url).toBeNull();
    expect(result.username).toEqual('testuser'); // Should remain unchanged
    expect(result.full_name).toEqual('Test User'); // Should remain unchanged
  });

  it('should persist changes to database', async () => {
    const testUser = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: testUser.id,
      username: 'dbtest',
      full_name: 'DB Test User'
    };

    await updateUser(updateInput);

    // Verify changes were persisted
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    expect(updatedUser).toHaveLength(1);
    expect(updatedUser[0].username).toEqual('dbtest');
    expect(updatedUser[0].full_name).toEqual('DB Test User');
    expect(updatedUser[0].updated_at.getTime()).toBeGreaterThan(testUser.updated_at.getTime());
  });

  it('should throw error when user does not exist', async () => {
    const updateInput: UpdateUserInput = {
      id: 999999, // Non-existent user ID
      username: 'nonexistent'
    };

    expect(updateUser(updateInput)).rejects.toThrow(/User with id 999999 not found/i);
  });

  it('should handle unique constraint violations for username', async () => {
    // Create two test users
    const user1 = await createTestUser();
    
    const user2 = await db.insert(usersTable)
      .values({
        email: 'test2@example.com',
        username: 'testuser2',
        password_hash: 'hashedpassword',
        full_name: 'Test User 2'
      })
      .returning()
      .execute();

    // Try to update user2 with user1's username
    const updateInput: UpdateUserInput = {
      id: user2[0].id,
      username: 'testuser' // This should conflict with user1's username
    };

    expect(updateUser(updateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should update timestamp correctly', async () => {
    const testUser = await createTestUser();
    const originalUpdatedAt = testUser.updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const updateInput: UpdateUserInput = {
      id: testUser.id,
      full_name: 'Timestamp Test'
    };

    const result = await updateUser(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    expect(result.created_at).toEqual(testUser.created_at); // Should not change
  });

  it('should handle empty update gracefully', async () => {
    const testUser = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: testUser.id
      // No fields to update
    };

    const result = await updateUser(updateInput);

    // All original values should remain the same except updated_at
    expect(result.username).toEqual(testUser.username);
    expect(result.full_name).toEqual(testUser.full_name);
    expect(result.bio).toEqual(testUser.bio);
    expect(result.avatar_url).toEqual(testUser.avatar_url);
    expect(result.updated_at.getTime()).toBeGreaterThan(testUser.updated_at.getTime());
  });
});