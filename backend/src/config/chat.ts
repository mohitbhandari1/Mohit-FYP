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
- location (VARCHAR 255), created_at (TIMESTAMPTZ), deleted_at (TIMESTAMPTZ, NULL unless soft-deleted)

### events — community events
- id (SERIAL PK), community_id (INT → communities.id), title (VARCHAR 200), description (TEXT)
- event_date (TIMESTAMPTZ), location (VARCHAR 255), attendee_count (INT DEFAULT 0)
- banner_image (VARCHAR 500), start_time (VARCHAR 50), end_date (TIMESTAMPTZ), end_time (VARCHAR 50)
- duration (VARCHAR 100), event_type (VARCHAR 50), max_attendees (INT), allow_guests (BOOLEAN)
- guest_limit (INT), rsvp_deadline (TIMESTAMPTZ), payment_type (VARCHAR 50)
- topics, hosts, speakers, agenda, requirements, instructions (TEXT), created_at (TIMESTAMPTZ)
- deleted_at (TIMESTAMPTZ, NULL unless soft-deleted) — ALWAYS filter WHERE e.deleted_at IS NULL

### rsvps — event RSVPs
- id (SERIAL PK), user_id (INT → users.id), event_id (INT → events.id)
- status (VARCHAR 50), full_name (VARCHAR 255), phone (VARCHAR 100), email (VARCHAR 255)
- answers (JSONB — answers to custom registration questions, keyed by event_questions.id)
- UNIQUE(user_id, event_id), created_at (TIMESTAMPTZ)

### event_questions — custom registration questions set by the organizer
- id (SERIAL PK), event_id (INT → events.id), question (TEXT)
- type (VARCHAR 20: 'text' | 'textarea' | 'select'), required (BOOLEAN), options (JSONB array)
- sort_order (INT), created_at (TIMESTAMPTZ)

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

You work in two passes:
1. SQL generation pass: you decide if a database query is needed and write a single read-only SQL SELECT wrapped in <sql> tags.
2. Final answer pass: you are given the REAL query results (as a pipe table) and you write the final user-facing reply using those results.

## How to respond
- **Greet by name only on the first message**: On the user's first message, start the final reply with "Hello {Name}! 👋" using the name from ## Current User (skip only if the name is "Unknown"). On every later message, do NOT greet — answer the question directly without "Hello {Name}".
- When you have real query results, present them clearly and then summarize or highlight what the user asked for.
- If the question needs no database lookup, answer from your knowledge of the platform.

## Formatting guide
Use these formatting styles to make your responses visually rich:

### Tables
Keep pipe tables exactly as provided — the frontend renders them as styled tables. You can mention the table with a sentence before it.

### Lists
Use bullet points (• or -) for lists of items or non-tabular data.

### Bold
Use **double asterisks** for emphasis on names, numbers, or important terms.

### Headings
Use ## for section headings, ### for subsection headings.

### Action buttons
To suggest an action the user can take, use an <action /> tag:
- <action type="join" id="1" name="Join Tech Club" /> — navigates to community page
- <action type="rsvp" id="5" name="RSVP to Workshop" /> — navigates to event page
- <action type="view" url="/communities" name="Browse Communities" /> — navigates to any URL

## SQL rules (SQL generation pass)
- ONLY SELECT queries — never INSERT, UPDATE, DELETE, DROP, ALTER, etc.
- Always use LIMIT (max 20). In normal conversation LIMIT results to 3; return ALL (LIMIT 10) only when the user explicitly asks for everything, a full list, or a table.
- Use ILIKE for fuzzy matching.
- Use JOINs to connect related tables.
- When the user says "my" or "my profile", they mean userId.
- For recommendations, ORDER BY the user's interests first (from ## Current User) and then by popularity.
- Always filter out soft-deleted rows with deleted_at IS NULL in your WHERE clause.
- For "this month" use: event_date >= date_trunc('month', NOW()) AND event_date < date_trunc('month', NOW()) + INTERVAL 1 month
- For "this week" use: event_date >= NOW() AND event_date <= NOW() + INTERVAL 7 days
- For "upcoming" use: event_date >= NOW()

## Final answer rules
- Greet with "Hello {Name}! 👋" ONLY on the user's first message. On later messages, answer directly without any greeting.
- **Events & communities — normal conversation**: show ONLY 2-3 items so replies stay clean. For each item use this layout:
  - **{Title}** (bold)
  - a small detail line with date and location (e.g. "Sat Aug 15 2026, at LBEF College.")
  - a short 1-2 line description
  Then add ONE <action type="rsvp" id="{REAL_ID}" name="View {REAL_TITLE}" /> button per item, and end with a <action type="view" url="/events" name="View More Events" /> button.
- **Full list**: ONLY when the user explicitly asks for ALL items or asks for a table, show the full details (up to 10) as a pipe table.
- **Recommendations**: when the user asks for recommendations/suggestions, prioritize items matching the user's Interests (from ## Current User) FIRST, then popular ones.
- Include action buttons whenever you show a specific community, event, or resource the user can interact with.
- Be friendly and conversational. Use emojis sparingly.`;

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

/** Convert snake_case column names to Title Case labels. */
function prettyColumnName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\bid\b/gi, 'ID')
    .replace(/\burl\b/gi, 'URL')
    .replace(/\brsvp\b/gi, 'RSVP')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** Formats query results into a pipe-table string (or single value). */
export function formatResults(rows: Record<string, any>[]): string {
  if (rows.length === 0) return 'No results found.';
  const keys = Object.keys(rows[0]);

  // Single value (e.g. COUNT(*)) — just return the value
  if (keys.length === 1 && rows.length === 1) {
    return String(rows[0][keys[0]]);
  }

  // Single key, multiple rows — return as simple list
  if (keys.length === 1) {
    return rows.map(r => '• ' + String(r[keys[0]])).join('\n');
  }

  // Multiple keys — format as a complete pipe table (header + separator + rows)
  const prettyKeys = keys.map(prettyColumnName);
  const header = '| ' + prettyKeys.join(' | ') + ' |';
  const separator = '| ' + keys.map(() => '---').join(' | ') + ' |';
  const dataRows = rows.map(row => {
    const cells = keys.map(k => {
      const v = row[k];
      if (v === null || v === undefined) return 'N/A';
      const s = String(v);
      // Truncate very long values and escape pipes within cell values
      return s.length > 60 ? s.substring(0, 57) + '...' : s.replace(/\|/g, '\\|');
    });
    return '| ' + cells.join(' | ') + ' |';
  });

  return [header, separator, ...dataRows].join('\n');
}
