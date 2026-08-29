// Event Reminder Service
// Runs every hour to check for events happening in the next 24 hours
// and sends reminder emails to all attending users.

import cron from 'node-cron';
import { query } from './db';
import { sendEmail, eventReminderEmail } from './email';

// Track which events have already been reminded to avoid duplicates
const remindedEvents = new Set<number>();

// Reset the tracking set daily (at midnight)
function resetRemindersDaily() {
  remindedEvents.clear();
  console.log('[Reminder] Daily reminder tracking reset');
}

// Check for events happening in the next 24-25 hours and send reminders
async function checkAndSendReminders() {
  try {
    // Find events happening in the next 24-25 hours (window to avoid duplicates)
    const events = await query(
      `SELECT e.id, e.title, e.event_date, e.start_time, e.location,
              c.name as community_name
       FROM events e
       JOIN communities c ON e.community_id = c.id
       WHERE e.event_date > NOW()
         AND e.event_date <= NOW() + INTERVAL '25 hours'
         AND e.deleted_at IS NULL
         AND c.deleted_at IS NULL
         AND e.id != ALL($1::int[])`,
      [remindedEvents.size > 0 ? Array.from(remindedEvents) : [0]]
    );

    if (events.rows.length === 0) {
      return;
    }

    console.log(`[Reminder] Found ${events.rows.length} event(s) needing reminders`);

    for (const event of events.rows) {
      // Get all attending users for this event
      const attendees = await query(
        `SELECT u.name, u.email
         FROM rsvps r
         JOIN users u ON r.user_id = u.id
         WHERE r.event_id = $1 AND r.status = 'attending'`,
        [event.id]
      );

      if (attendees.rows.length === 0) {
        remindedEvents.add(event.id);
        continue;
      }

      // Format event date and time
      const eventDate = new Date(event.event_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const eventTime = event.start_time || 'TBA';
      const eventLocation = event.location || 'TBA';

      // Send reminder to each attendee
      let sentCount = 0;
      for (const attendee of attendees.rows) {
        if (!attendee.email) continue;

        const emailContent = eventReminderEmail(
          attendee.name || 'Member',
          event.title,
          eventDate,
          eventTime,
          eventLocation,
          event.community_name
        );

        const result = await sendEmail(attendee.email, emailContent.subject, emailContent.html);
        if (result.success) {
          sentCount++;
        }
      }

      // Mark this event as reminded
      remindedEvents.add(event.id);
      console.log(`[Reminder] Sent ${sentCount}/${attendees.rows.length} reminders for "${event.title}"`);
    }
  } catch (error) {
    console.error('[Reminder] Error checking for events:', error);
  }
}

// Start the reminder scheduler
export function startReminderService() {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', () => {
    console.log('[Reminder] Running scheduled check...');
    checkAndSendReminders();
  });

  // Reset daily tracking at midnight
  cron.schedule('0 0 * * *', () => {
    resetRemindersDaily();
  });

  // Run an initial check on startup (after 30 seconds to let server start)
  setTimeout(() => {
    console.log('[Reminder] Running initial check...');
    checkAndSendReminders();
  }, 30000);

  console.log('[Reminder] Event reminder service started (runs hourly)');
}

// Manual trigger for testing (clears cache to re-check all events)
export async function triggerReminderCheck() {
  console.log('[Reminder] Manual trigger (clearing cache)...');
  remindedEvents.clear();
  await checkAndSendReminders();
}
