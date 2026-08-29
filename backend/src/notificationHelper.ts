// Notification helper - checks user preferences before creating notifications

import { query } from './db';

/**
 * Check if a user has a specific notification type enabled
 * Returns true if enabled (or if no preferences exist, defaults to true)
 */
export async function isNotificationEnabled(userId: number, type: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT ${type} FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );

    // If no preferences exist, default to enabled
    if (result.rows.length === 0) {
      return true;
    }

    return result.rows[0][type] !== false;
  } catch {
    // If error, default to enabled
    return true;
  }
}

/**
 * Create a notification for a user (respects preferences)
 * Returns true if notification was created, false if disabled
 */
export async function createNotification(
  userId: number,
  type: string,
  title: string,
  message: string,
  link: string,
  communityLogo?: string | null
): Promise<boolean> {
  const enabled = await isNotificationEnabled(userId, type);
  if (!enabled) return false;

  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link, community_logo)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, type, title, message, link, communityLogo || null]
    );
    return true;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return false;
  }
}

/**
 * Create notifications for multiple users (respects each user's preferences)
 */
export async function createNotificationsForUsers(
  userIds: number[],
  type: string,
  title: string,
  message: string,
  link: string,
  communityLogo?: string | null
): Promise<number> {
  if (userIds.length === 0) return 0;

  let createdCount = 0;

  // Check preferences for all users at once
  const prefsResult = await query(
    `SELECT user_id, ${type} FROM notification_preferences WHERE user_id = ANY($1::int[])`,
    [userIds]
  );

  // Build a map of user preferences
  const prefsMap = new Map<number, boolean>();
  for (const row of prefsResult.rows) {
    prefsMap.set(row.user_id, row[type] !== false);
  }

  // Create notifications for users who have it enabled
  // (users without preferences default to enabled)
  const enabledUserIds = userIds.filter((id) => {
    const pref = prefsMap.get(id);
    return pref === undefined ? true : pref; // undefined = no prefs = enabled
  });

  if (enabledUserIds.length === 0) return 0;

  // Batch insert notifications
  const notifValues: string[] = [];
  const notifParams: any[] = [];
  let paramIdx = 1;

  for (const userId of enabledUserIds) {
    notifValues.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, FALSE, NOW(), $${paramIdx + 5})`);
    notifParams.push(userId, type, title, message, link, communityLogo || null);
    paramIdx += 6;
  }

  const insertSql = `INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at, community_logo) VALUES ${notifValues.join(', ')}`;
  await query(insertSql, notifParams);

  return enabledUserIds.length;
}
