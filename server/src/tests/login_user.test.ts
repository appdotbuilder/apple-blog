import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/login_user';

// Test user data
const testUser = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'testpassword123',
  full_name: 'Test User',
  bio: 'A test user bio',
  avatar_url: 'https://example.com/avatar.jpg'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate user with correct credentials', async () => {
    // Create user with hashed password
    const passwordHash = await Bun.password.hash(testUser.password);
    
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        password_hash: passwordHash,
        full_name: testUser.full_name,
        bio: testUser.bio,
        avatar_url: testUser.avatar_url
      })
      .execute();

    const loginInput: LoginInput = {
      email: testUser.email,
      password: testUser.password
    };

    const result = await loginUser(loginInput);

    // Verify user data is returned correctly
    expect(result.email).toEqual(testUser.email);
    expect(result.username).toEqual(testUser.username);
    expect(result.full_name).toEqual(testUser.full_name);
    expect(result.bio).toEqual(testUser.bio);
    expect(result.avatar_url).toEqual(testUser.avatar_url);
    expect(result.is_verified).toEqual(false); // Default value
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify password hash is not returned
    expect((result as any).password_hash).toBeUndefined();
  });

  it('should authenticate user with minimal data (nulls)', async () => {
    // Create user with minimal required data
    const passwordHash = await Bun.password.hash(testUser.password);
    
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        password_hash: passwordHash,
        full_name: testUser.full_name
        // bio and avatar_url will be null
      })
      .execute();

    const loginInput: LoginInput = {
      email: testUser.email,
      password: testUser.password
    };

    const result = await loginUser(loginInput);

    expect(result.email).toEqual(testUser.email);
    expect(result.username).toEqual(testUser.username);
    expect(result.full_name).toEqual(testUser.full_name);
    expect(result.bio).toBeNull();
    expect(result.avatar_url).toBeNull();
    expect(result.is_verified).toEqual(false);
  });

  it('should reject login with incorrect password', async () => {
    // Create user
    const passwordHash = await Bun.password.hash(testUser.password);
    
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        password_hash: passwordHash,
        full_name: testUser.full_name
      })
      .execute();

    const loginInput: LoginInput = {
      email: testUser.email,
      password: 'wrongpassword'
    };

    await expect(loginUser(loginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should reject login with non-existent email', async () => {
    const loginInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: testUser.password
    };

    await expect(loginUser(loginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should handle case-sensitive email matching', async () => {
    // Create user with lowercase email
    const passwordHash = await Bun.password.hash(testUser.password);
    
    await db.insert(usersTable)
      .values({
        email: testUser.email.toLowerCase(),
        username: testUser.username,
        password_hash: passwordHash,
        full_name: testUser.full_name
      })
      .execute();

    // Try to login with uppercase email (should fail)
    const loginInput: LoginInput = {
      email: testUser.email.toUpperCase(),
      password: testUser.password
    };

    await expect(loginUser(loginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should authenticate verified user', async () => {
    // Create verified user
    const passwordHash = await Bun.password.hash(testUser.password);
    
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        password_hash: passwordHash,
        full_name: testUser.full_name,
        is_verified: true
      })
      .execute();

    const loginInput: LoginInput = {
      email: testUser.email,
      password: testUser.password
    };

    const result = await loginUser(loginInput);

    expect(result.is_verified).toEqual(true);
    expect(result.email).toEqual(testUser.email);
  });
});