'use server'

import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';

export async function getUsers() {
  try {
    const result = await sql`
      SELECT id, name, audio, photo FROM users
    `;
    return result.rows.map(user => ({
      ...user,
      audio: Buffer.from(user.audio).toString('base64'),
      photo: Buffer.from(user.photo).toString('base64')
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to fetch users');
  }
}

export async function removeUser(userId: number) {
  try {
    await sql`DELETE FROM users WHERE id = ${userId}`;
    revalidatePath('/');
  } catch (error) {
    console.error('Error removing user:', error);
    throw new Error('Failed to remove user');
  }
}

export async function registerUser(name: string, photo: string, audio: string) {
  try {
    await sql`
      INSERT INTO users (name, audio, photo)
      VALUES (${name}, ${Buffer.from(audio, 'base64')}, ${Buffer.from(photo, 'base64')})
    `;
    revalidatePath('/');
  } catch (error) {
    console.error('Error registering user:', error);
    throw new Error('Failed to register user');
  }
}

export async function togglePause() {
  try {
    const result = await sql`
      UPDATE system_state
      SET is_paused = NOT is_paused
      WHERE id = 1
      RETURNING is_paused
    `;
    return result.rows[0].is_paused;
  } catch (error) {
    console.error('Error toggling pause state:', error);
    throw new Error('Failed to toggle pause state');
  }
}

export async function getPauseState() {
  try {
    const result = await sql`
      SELECT is_paused FROM system_state WHERE id = 1
    `;
    return result.rows[0].is_paused;
  } catch (error) {
    console.error('Error getting pause state:', error);
    throw new Error('Failed to get pause state');
  }
}
