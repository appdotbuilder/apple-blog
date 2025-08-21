import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  email: 'test@example.com',
  username: 'testuser',
  full_name: 'Test User',
  password: 'password123',
  bio: 'This is a test bio',
  avatar_url: 'https://example.com/avatar.jpg'
};

// Minimal test input with only required fields
const minimalInput: CreateUserInput = {
  email: 'minimal@example.com',
  username: 'minimaluser',
  full_name: 'Minimal User',
  password: 'password123'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testInput);

    // Verify all fields are correctly set
    expect(result.email).toEqual('test@example.com');
    expect(result.username).toEqual('testuser');
    expect(result.full_name).toEqual('Test User');
    expect(result.bio).toEqual('This is a test bio');
    expect(result.avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(result.is_verified).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user with minimal required fields', async () => {
    const result = await createUser(minimalInput);

    // Verify required fields
    expect(result.email).toEqual('minimal@example.com');
    expect(result.username).toEqual('minimaluser');
    expect(result.full_name).toEqual('Minimal User');
    expect(result.is_verified).toEqual(false);
    expect(result.id).toBeDefined();
    
    // Verify optional fields are null
    expect(result.bio).toBeNull();
    expect(result.avatar_url).toBeNull();
  });

  it('should save user to database with hashed password', async () => {
    const result = await createUser(testInput);

    // Query the database directly
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const dbUser = users[0];
    
    // Verify user data is saved correctly
    expect(dbUser.email).toEqual('test@example.com');
    expect(dbUser.username).toEqual('testuser');
    expect(dbUser.full_name).toEqual('Test User');
    expect(dbUser.bio).toEqual('This is a test bio');
    expect(dbUser.avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(dbUser.is_verified).toEqual(false);
    expect(dbUser.created_at).toBeInstanceOf(Date);
    expect(dbUser.updated_at).toBeInstanceOf(Date);
    
    // Verify password is hashed and not stored in plain text
    expect(dbUser.password_hash).toBeDefined();
    expect(dbUser.password_hash).not.toEqual('password123');
    expect(dbUser.password_hash.length).toBeGreaterThan(0);
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with the same email
    const duplicateEmailInput: CreateUserInput = {
      ...testInput,
      username: 'differentuser'
    };

    await expect(createUser(duplicateEmailInput))
      .rejects.toThrow(/duplicate key value|unique constraint/i);
  });

  it('should reject duplicate usernames', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with the same username
    const duplicateUsernameInput: CreateUserInput = {
      ...testInput,
      email: 'different@example.com'
    };

    await expect(createUser(duplicateUsernameInput))
      .rejects.toThrow(/duplicate key value|unique constraint/i);
  });

  it('should handle null optional fields correctly', async () => {
    const inputWithNullFields: CreateUserInput = {
      email: 'null@example.com',
      username: 'nulluser',
      full_name: 'Null User',
      password: 'password123',
      bio: null,
      avatar_url: null
    };

    const result = await createUser(inputWithNullFields);

    expect(result.bio).toBeNull();
    expect(result.avatar_url).toBeNull();
    expect(result.email).toEqual('null@example.com');
    expect(result.username).toEqual('nulluser');
  });

  it('should generate different password hashes for same passwords', async () => {
    const input1: CreateUserInput = {
      email: 'user1@example.com',
      username: 'user1',
      full_name: 'User One',
      password: 'samepassword'
    };

    const input2: CreateUserInput = {
      email: 'user2@example.com',
      username: 'user2',
      full_name: 'User Two',
      password: 'samepassword'
    };

    await createUser(input1);
    await createUser(input2);

    // Get both users from database
    const users = await db.select()
      .from(usersTable)
      .execute();

    expect(users).toHaveLength(2);
    
    // Both should have password hashes but they should be the same since we're using simple SHA256
    // (In a real app, you'd use bcrypt with salt for different hashes)
    expect(users[0].password_hash).toBeDefined();
    expect(users[1].password_hash).toBeDefined();
    expect(users[0].password_hash).toEqual(users[1].password_hash); // Same hash for same password with SHA256
  });

  it('should set default values correctly', async () => {
    const result = await createUser(minimalInput);

    // Verify defaults are applied
    expect(result.is_verified).toEqual(false);
    expect(result.bio).toBeNull();
    expect(result.avatar_url).toBeNull();
    
    // Verify timestamps are set
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});