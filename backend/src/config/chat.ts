// ─── Chatbot Configuration ─────────────────────────────────────────────────
// Edit these prompts/schema to customize the AI chatbot's behavior.
// The schema tells Gemini what tables and columns exist in the database.
// The system prompt tells Gemini how to respond to users.
// ────────────────────────────────────────────────────────────────────────────

// ─── Database Schema (matches backend/schema.sql) ──────────────────────────
// Tells Gemini the table structure so it can generate valid SQL queries.
export const SCHEMA = `## Database Schema

### users — registered users
- id (SERIAL PK), name (VARCHAR 160), email (VARCHAR 255 UNIQUE), password (VARCHAR 255)
- role (VARCHAR 50), is_admin (BOOLEAN), interests (TEXT), bio (TEXT)
- avatar_url (VARCHAR 500), banner_image (VARCHAR 500), created_at (TIMESTAMPTZ)

### communities — community groups
- id (SERIAL PK), name (VARCHAR 200), description (TEXT), category (VARCHAR 120)
- website (VARCHAR 255), owner_id (INT → users.id), member_count (INT DEFAULT 0)
- banner_image (VARCHAR 500), logo (VARCHAR 500), is_verified (BOOLEAN), is_private (BOOLEAN)
- member_approval (BOOLEAN), facebook, instagram, linkedin, tiktok (VARCHAR 255)
- location (VARCHAR 255), created_at (TIMESTAMPTZ)

### events — community events
- id (SERIAL PK), community_id (INT → communities.id), title (VARCHAR 200), description (TEXT)
- event_date (TIMESTAMPTZ), location (VARCHAR 255), attendee_count (INT DEFAULT 0)
- banner_image (VARCHAR 500), start_time (VARCHAR 50), end_date (TIMESTAMPTZ), end_time (VARCHAR 50)
- duration (VARCHAR 100), event_type (VARCHAR 50), max_attendees (INT), allow_guests (BOOLEAN)
- guest_limit (INT), rsvp_deadline (TIMESTAMPTZ), payment_type (VARCHAR 50)
- topics, hosts, speakers, agenda, requirements, instructions (TEXT), created_at (TIMESTAMPTZ)

### rsvps — event RSVPs
- id (SERIAL PK), user_id (INT → users.id), event_id (INT → events.id)
- status (VARCHAR 50), full_name (VARCHAR 255), phone (VARCHAR 100), email (VARCHAR 255)
- UNIQUE(user_id, event_id), created_at (TIMESTAMPTZ)

### reviews — community & event reviews
- id (SERIAL PK), user_id (INT → users.id), community_id (INT → communities.id)
- event_id (INT → events.id), rating (INT 1-5), comment (TEXT), created_at (TIMESTAMPTZ)

### community_members — who belongs to which community
- id (SERIAL PK), user_id (INT → users.id), community_id (INT → communities.id)
- joined_at (TIMESTAMPTZ), UNIQUE(user_id, community_id)

### announcements — community announcements
- id (SERIAL PK), community_id (INT → communities.id), title (VARCHAR 255)
- content (TEXT), created_by (INT → users.id), created_at (TIMESTAMPTZ), updated_at (TIMESTAMPTZ)

### community_discussions — threaded discussions
- id (SERIAL PK), community_id (INT → communities.id), user_id (INT → users.id)
- content (TEXT), parent_id (INT → community_discussions.id), created_at (TIMESTAMPTZ)

### organizer_applications — community creation applications
- id (SERIAL PK), user_id (INT → users.id), community_name (VARCHAR 200), description (TEXT)
- address, contact_info, phone, social_media (TEXT), target_audience, age_group (VARCHAR)
- category (VARCHAR 120), website (VARCHAR 255), motivation (TEXT)
- expected_members, meeting_frequency (VARCHAR), experience (TEXT), venue_details (TEXT)
- org_type, year_established (DATE), facebook, instagram, linkedin, tiktok (VARCHAR)
- contact_person_name, position_role, preferred_username (VARCHAR 160)
- certificate_file, logo_file, additional_doc_file (VARCHAR 255)
- status (VARCHAR 50 DEFAULT 'pending'), admin_notes (TEXT), temp_password (VARCHAR 255)
- reviewed_by (INT → users.id), created_at (TIMESTAMPTZ), reviewed_at (TIMESTAMPTZ)

### notifications — user notifications
- id (SERIAL PK), user_id (INT → users.id), type (VARCHAR 100), title (VARCHAR 255)
- message (TEXT), link (VARCHAR 500), is_read (BOOLEAN), created_at (TIMESTAMPTZ)

### saved_events — user's saved/bookmarked events
- id (SERIAL PK), user_id (INT → users.id), event_id (INT → events.id)
- created_at (TIMESTAMPTZ), UNIQUE(user_id, event_id)

### activity_log — admin activity tracking
- id (SERIAL PK), user_id (INT → users.id), user_name (VARCHAR 160)
- action (VARCHAR 100), description (TEXT), created_at (TIMESTAMPTZ)

### community_sponsors — community sponsors
- id (SERIAL PK), community_id (INT → communities.id), name (VARCHAR 255)
- website (VARCHAR 255), logo (VARCHAR 500), created_at (TIMESTAMPTZ)`;

// ─── Gemini System Prompt ───────────────────────────────────────────────────
// This tells the AI model how to respond and generate SQL queries.
// Edit this to change the chatbot's personality, rules, or response style.
export const SYSTEM_PROMPT = `You are the Smart Connects AI assistant for a community & events platform.

Your job is to answer user questions about communities, events, members, and everything on the platform.

## How to respond
- If you need to query the database, write a single SQL SELECT query wrapped in <sql> tags.
- After the SQL, write your full response replacing data with {{RESULTS}} placeholder.
- If you can answer without a DB query, just respond normally.

## Example
User: "Show me all communities"
<sql>SELECT name, description, category, member_count FROM communities ORDER BY member_count DESC LIMIT 10</sql>
Here are the communities on Smart Connects:
{{RESULTS}}

User: "What events are happening this week?"
<sql>SELECT e.title, e.event_date, c.name AS community_name FROM events e JOIN communities c ON e.community_id = c.id WHERE e.event_date >= NOW() AND e.event_date <= NOW() + INTERVAL '7 days' ORDER BY e.event_date ASC</sql>
Here are the events happening this week:
{{RESULTS}}

User: "How many communities are there?"
<sql>SELECT COUNT(*) FROM communities</sql>
There are {{RESULTS}} communities on Smart Connects.

## Rules
- ONLY SELECT queries — never INSERT, UPDATE, DELETE, DROP, ALTER, etc.
- Always use LIMIT (max 20).
- Use ILIKE for fuzzy matching.
- Use JOINs to connect related tables.
- When the user says "my" or "my profile", they mean userId.
- Be friendly and conversational. Use emojis sparingly.

## Handling action requests (joining, RSVPing, creating, etc.)
- If the user asks to PERFORM an action (e.g. "join a community", "RSVP to an event", "create an event"), you MUST help them.
  Do NOT say you can't process it. Never say you can only answer with SELECT queries.
- Step 1: Query the database to find the community or event they're asking about.
- Step 2: Write guidance using {{RESULTS}} where the query results will appear.
  The {{RESULTS}} token will be replaced with the actual data from your query.
- Example — joining a community by name:
  User: "I want to join the Campus Tech Club"
  <sql>SELECT id, name FROM communities WHERE name ILIKE '%campus tech%' LIMIT 1</sql>
  Great! I found **{{RESULTS}}**
  To join, just go to that community's page and click the **"Join Community"** button. You'll be a member instantly! 🎉
- Example — joining when user mentions the owner's name (not the community name):
  User: "I want to join aayush paneru club"
  <sql>SELECT c.id, c.name, u.name AS owner FROM communities c JOIN users u ON c.owner_id = u.id WHERE u.name ILIKE '%aayush%' LIMIT 1</sql>
  I found a community owned by them! **{{RESULTS}}**
  To join, go to that community's page and click **"Join Community"**. Simple as that!
- Example — RSVPing to an event:
  User: "I want to attend the JavaScript workshop"
  <sql>SELECT id, title FROM events WHERE title ILIKE '%javascript%' LIMIT 1</sql>
  I found it! **{{RESULTS}}**
  To RSVP, go to that event's page and click **"I'm Attending"**. All set!
- IMPORTANT: Only use {{RESULTS}} — NOT {{RESULTS.id}}, {{RESULTS.name}}, etc. The system only replaces the exact text {{RESULTS}} with the formatted query output.`;

// ─── SQL Helpers ───────────────────────────────────────────────────────────

// Patterns for SQL safety validation
const FORBIDDEN_PATTERN = /^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|EXEC|CALL|MERGE|REPLACE|GRANT|REVOKE)\b/i;
const ALLOWED_PATTERN = /^\s*(SELECT|WITH)\b/i;

/** Validates that a SQL query is read-only (SELECT/WITH only). */
export function isReadOnlyQuery(sql: string): boolean {
  const trimmed = sql.trim();
  if (FORBIDDEN_PATTERN.test(trimmed)) return false;
  return ALLOWED_PATTERN.test(trimmed);
}

/** Removes multi-statement injection by truncating at semicolons. */
export function sanitizeSql(sql: string): string {
  const idx = sql.indexOf(';');
  if (idx >= 0) {
    const after = sql.substring(idx + 1).trim();
    if (after.length > 0 && !after.startsWith('--')) {
      return sql.substring(0, idx + 1);
    }
  }
  return sql;
}

/** Formats query results into a readable string for the AI response. */
export function formatResults(rows: Record<string, any>[]): string {
  if (rows.length === 0) return 'No results found.';
  const keys = Object.keys(rows[0]);
  // Single value (e.g. COUNT(*))
  if (keys.length === 1 && rows.length === 1) {
    return String(rows[0][keys[0]]);
  }
  // Multiple rows — formatted as bullet list
  const lines: string[] = [];
  for (const row of rows) {
    const parts = keys.map(k => {
      const v = row[k];
      if (v === null || v === undefined) return 'N/A';
      const s = String(v);
      return s.length > 80 ? s.substring(0, 77) + '...' : s;
    });
    lines.push('• ' + parts.join(' | '));
  }
  return lines.join('\n');
}
