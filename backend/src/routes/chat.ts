import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '../db';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { SCHEMA, SYSTEM_PROMPT, isReadOnlyQuery, sanitizeSql, formatResults } from '../config/chat';

const router = express.Router();

// ─── Gemini Setup ───
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ─── Helpers ────────────────────────────────────────────────────────────────

async function generateWithRetry(model: any, prompt: string): Promise<string> {
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (firstError: any) {
    const isRateLimit = firstError.message?.includes('429') || firstError.status === 429;
    if (isRateLimit) {
      console.log('Gemini rate limited, quick retry in 2s...');
      await new Promise(r => setTimeout(r, 2000));
      const result = await model.generateContent(prompt);
      return result.response.text();
    }
    throw firstError;
  }
}

/** Parses <action type="..." id="..." name="..." url="..." /> tags out of a reply. */
function parseActions(response: string): { type: string; id?: number; name: string; url?: string }[] {
  const actions: { type: string; id?: number; name: string; url?: string }[] = [];
  const actionRegex = /<action\s+((?:\w+="[^"]*"\s*)*)\/>/gi;
  let actionMatch;
  while ((actionMatch = actionRegex.exec(response)) !== null) {
    const attrs = actionMatch[1];
    const typeMatch = attrs.match(/type="([^"]+)"/i);
    const idMatch = attrs.match(/id="([^"]+)"/i);
    const nameMatch = attrs.match(/name="([^"]+)"/i);
    const urlMatch = attrs.match(/url="([^"]+)"/i);
    if (!typeMatch) continue;
    actions.push({
      type: typeMatch[1] as any,
      ...(idMatch ? { id: parseInt(idMatch[1]) } : {}),
      name: nameMatch?.[1] || '',
      ...(urlMatch ? { url: urlMatch[1] } : {}),
    });
  }
  return actions;
}

/**
 * Builds an interest-aware ORDER BY expression (rank matches first, then fall back).
 * Combines explicit user interests with participation-derived categories for richer ranking.
 * Never filters rows out — non-matching items just rank lower.
 */
function interestRanking(column: string, interests: string, paramStart: number, participationCategories: string[] = []): { orderBy: string; params: string[] } {
  const interestParts = (interests || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  // Merge interests with participation-derived categories (deduplicated)
  const allParts = [...new Set([...interestParts, ...participationCategories])];

  if (allParts.length === 0) return { orderBy: '', params: [] };
  const cases = allParts
    .map((_, i) => `(CASE WHEN ${column} ILIKE $${paramStart + i} THEN 1 ELSE 0 END)`)
    .join(' + ');
  return { orderBy: `(${cases}) DESC`, params: allParts.map(p => `%${p}%`) };
}

/**
 * Predefined SQL for common chat intents. Using these avoids a Gemini call for
 * the SQL step, so common questions use only ONE Gemini request (free-tier quota friendly).
 * Returns null when no template matches — then the two-pass flow is used.
 */
function detectTemplate(message: string, interests: string, participationCategories: string[] = []): { sql: string; params: any[]; label: string } | null {
  const m = message.toLowerCase();

  const eventsBase = `SELECT e.id, e.title, e.event_date, e.location, e.description, c.name AS community_name
    FROM events e JOIN communities c ON e.community_id = c.id
    WHERE e.deleted_at IS NULL AND c.deleted_at IS NULL`;

  // All events (explicit request for everything/table)
  if (/(all|every|list|show me|full).*(event|upcoming)/i.test(m) || /table/.test(m)) {
    return {
      sql: `${eventsBase} AND e.event_date >= NOW() ORDER BY e.event_date ASC LIMIT 10`,
      params: [],
      label: 'events_all',
    };
  }

  // Events this month
  if (/this\s*month|current\s*month|month'?s/.test(m) || /\baugust\b|\bseptember\b|\boctober\b|\bnovember\b|\bdecember\b|\bjanuary\b|\bfebruary\b|\bmarch\b|\bapril\b|\bmay\b|\bjune\b|\bjuly\b/.test(m)) {
    return {
      sql: `${eventsBase} AND e.event_date >= date_trunc('month', NOW()) AND e.event_date < date_trunc('month', NOW()) + INTERVAL '1 month' ORDER BY e.event_date ASC LIMIT 3`,
      params: [],
      label: 'events_month',
    };
  }

  // Events this week
  if (/this\s*week|this\s*weekend|next\s*week/.test(m)) {
    return {
      sql: `${eventsBase} AND e.event_date >= NOW() AND e.event_date < NOW() + INTERVAL '7 days' ORDER BY e.event_date ASC LIMIT 3`,
      params: [],
      label: 'events_week',
    };
  }

  // Upcoming events
  if (/\bupcoming\b|coming\s*(up|soon)|what.*(event|happening|going)/.test(m)) {
    return {
      sql: `${eventsBase} AND e.event_date >= NOW() ORDER BY e.event_date ASC LIMIT 3`,
      params: [],
      label: 'events_upcoming',
    };
  }

  // Recommended events (interest-first + participation history)
  if (/(recommend|suggest).*(event|thing|do)|event.*(recommend|suggest)/.test(m)) {
    const rank = interestRanking('c.category', interests, 1, participationCategories);
    const base = `${eventsBase} AND e.event_date >= NOW()`;
    const sql = rank.orderBy
      ? `${base} ORDER BY ${rank.orderBy}, e.event_date ASC LIMIT 3`
      : `${base} ORDER BY e.event_date ASC LIMIT 3`;
    return { sql, params: rank.params, label: 'events_recommend' };
  }

  // Event creation assistance — matches requests to create, describe, or plan an event
  // No SQL needed — just set the intent label so Pass 2 gets the event_create hint.
  if (/(?:create|make|new|plan|organize|set up|build).*(?:event|workshop|meetup|session|conference|seminar)/.test(m)
    || /(?:event|workshop|meetup|session|conference|seminar).*(?:create|make|new|plan|organize|help|idea)/.test(m)
    || /(?:help|write|generate|draft|create|make).*(?:description|desc|about|details?).*(?:event|workshop|meetup)/.test(m)
    || /(?:event|workshop|meetup).*(?:description|desc|write|draft|generate)/.test(m)
    || /(?:i'?m?\s+)?(?:creating|making|planning|organizing|hosting)\s+(?:an?\s+)?(?:event|workshop|meetup|session)/.test(m)
    || /(?:write|generate|draft|create|make|help).*(?:event|workshop|meetup)\s+(?:description|desc|detail)/.test(m)
    || /\b(event|workshop|meetup|session|conference|seminar)\b.*\b(description|title|name|about)\b/.test(m)
    || /\b(description|title|name|about)\b.*\b(event|workshop|meetup|session|conference|seminar)\b/.test(m)) {
    return null; // Signal "no template matched" so we skip SQL, but we'll detect intent below
  }

  // All communities (explicit request for everything/table)
  if (/all|every/.test(m) && /communities|clubs?/.test(m)) {
    return {
      sql: `SELECT id, name, description, category, member_count FROM communities WHERE deleted_at IS NULL ORDER BY member_count DESC LIMIT 10`,
      params: [],
      label: 'communities_all',
    };
  }

  // Communities list / recommendations
  if (/(communities|clubs?|sangha|groups)/.test(m)) {
    const rank = interestRanking('category', interests, 1, participationCategories);
    const base = `SELECT id, name, description, category, member_count FROM communities WHERE deleted_at IS NULL`;
    const sql = rank.orderBy
      ? `${base} ORDER BY ${rank.orderBy}, member_count DESC LIMIT 3`
      : `${base} ORDER BY member_count DESC LIMIT 3`;
    return { sql, params: rank.params, label: 'communities_recommend' };
  }

  return null;
}

/** Builds a clean markdown reply deterministically when Gemini is unavailable. */
function buildFallbackReply(rows: Record<string, any>[], intentLabel: string, userName: string, isFirstMessage: boolean): string {
  const title = (r: Record<string, any>) => String(r.title ?? r.name ?? '');
  const detail = (r: Record<string, any>) => {
    const parts: string[] = [];
    if (r.event_date) parts.push(String(r.event_date).replace('T', ' ').slice(0, 16));
    if (r.location) parts.push(`at ${String(r.location)}`);
    return parts.join(', ');
  };
  const desc = (r: Record<string, any>) => {
    const d = String(r.description ?? r.name ?? '');
    return d.length > 140 ? d.slice(0, 137) + '...' : d;
  };

  const lines: string[] = [];
  if (isFirstMessage && userName) lines.push(`Hello ${userName}! 👋`, '');
  if (rows.length === 0 && intentLabel !== 'event_create') {
    lines.push('I could not find any matching results right now. Please try again in a moment.');
    return lines.join('\n');
  }

  if (intentLabel === 'event_create') {
    lines.push("I'd love to help you create an amazing event! 🎉");
    lines.push('');
    lines.push('Tell me your **event title** and a **brief description** (even just a few words), and I\'ll generate:');
    lines.push('• A compelling, copy-paste-ready event description');
    lines.push('• Suggested topics, event type, and other details');
    lines.push('• Tips to maximize attendance');
    lines.push('');
    lines.push('For example: *"I\'m creating a Tech Workshop about Python programming for beginners"*');
    return lines.join('\n');
  }

  const headline = intentLabel.includes('month')
    ? 'Here are the events happening this month:'
    : intentLabel.includes('week')
      ? 'Here are the events happening this week:'
      : intentLabel.includes('upcoming')
        ? 'Here are the upcoming events:'
        : intentLabel.includes('communities')
          ? 'Here are the communities:'
          : intentLabel.includes('recommend')
            ? 'Here are the recommendations for you:'
            : intentLabel.includes('event_create')
              ? ''
              : 'Here are the results:';
  if (headline) lines.push(headline, '');

  // Full-list requests → pipe table with all rows
  if (intentLabel.includes('_all') && rows.length > 3) {
    const keys = Object.keys(rows[0]);
    const header = '| ' + keys.join(' | ') + ' |';
    const sep = '| ' + keys.map(() => '---').join(' | ') + ' |';
    lines.push(header, sep);
    rows.forEach(r => {
      lines.push('| ' + keys.map(k => String(r[k] ?? 'N/A')).join(' | ') + ' |');
    });
    return lines.join('\n');
  }

  rows.slice(0, 3).forEach(r => {
    lines.push(`**${title(r)}**`);
    if (detail(r)) lines.push(detail(r));
    if (desc(r)) lines.push(desc(r));
    lines.push('');
  });
  return lines.join('\n');
}

// ─── Chat Endpoint (two-pass: SQL generation → final answer with real data) ─
// Uses optionalAuth so guests can chat too — logged-in users get name greeting.
router.post('/', optionalAuth, async (req: AuthRequest, res, next) => {
  const { message, firstMessage } = req.body as { message: string; firstMessage?: boolean };

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const isFirstMessage = !!firstMessage;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ reply: '⚠️ AI assistant is not configured. Please ask an admin to set up the GEMINI_API_KEY environment variable.' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    // Greet the user by name — fetch their profile from the database (if logged in).
    let userName = '';
    let userInterests = '';
    let userBio = '';
    let userHistory = '';

    if (req.userId) {
      try {
        const userRes = await query('SELECT name, interests, bio FROM users WHERE id = $1', [req.userId]);
        userName = userRes.rows[0]?.name || '';
        userInterests = userRes.rows[0]?.interests || '';
        userBio = userRes.rows[0]?.bio || '';
      } catch (userErr) {
        console.error('Failed to load user profile for chat:', userErr);
      }

      // Fetch participation history: RSVPs, joined communities, saved events
      try {
        const historyParts: string[] = [];

        // Recent RSVPs (events they attended)
        const rsvpRes = await query(
          `SELECT e.title, c.name AS community_name, c.category, e.event_date
           FROM rsvps r
           JOIN events e ON r.event_id = e.id
           JOIN communities c ON e.community_id = c.id
           WHERE r.user_id = $1 AND r.status = 'attending'
             AND e.deleted_at IS NULL AND c.deleted_at IS NULL
           ORDER BY e.event_date DESC LIMIT 5`,
          [req.userId]
        );
        if (rsvpRes.rows.length > 0) {
          historyParts.push('Events Attended: ' + rsvpRes.rows.map((r: any) =>
            `${r.title} (${r.category || 'Unknown'} — ${r.community_name})`
          ).join(', '));
        }

        // Joined communities
        const memberRes = await query(
          `SELECT c.name, c.category
           FROM community_members cm
           JOIN communities c ON cm.community_id = c.id
           WHERE cm.user_id = $1 AND c.deleted_at IS NULL
           ORDER BY cm.joined_at DESC LIMIT 5`,
          [req.userId]
        );
        if (memberRes.rows.length > 0) {
          historyParts.push('Communities Joined: ' + memberRes.rows.map((r: any) =>
            `${r.name} (${r.category || 'Unknown'})`
          ).join(', '));
        }

        // Saved/bookmarked events
        const savedRes = await query(
          `SELECT e.title, c.category
           FROM saved_events se
           JOIN events e ON se.event_id = e.id
           JOIN communities c ON e.community_id = c.id
           WHERE se.user_id = $1
             AND e.deleted_at IS NULL AND c.deleted_at IS NULL
           ORDER BY se.created_at DESC LIMIT 5`,
          [req.userId]
        );
        if (savedRes.rows.length > 0) {
          historyParts.push('Saved Events: ' + savedRes.rows.map((r: any) =>
            `${r.title} (${r.category || 'Unknown'})`
          ).join(', '));
        }

        userHistory = historyParts.join('\n');
      } catch (histErr) {
        console.error('Failed to load user history for chat:', histErr);
      }
    }

    const userBlock = [
      `ID: ${req.userId}`,
      `Name: ${userName || 'Unknown'}`,
      userInterests ? `Interests: ${userInterests}` : '',
      userBio ? `Bio: ${userBio}` : '',
      userHistory ? `Participation History:\n${userHistory}` : '',
    ].filter(Boolean).join('\n');

    const contextHeader = [
      `## Current User\n${userBlock}\n`,
      `## Database Schema\n${SCHEMA}`,
    ].join('\n\n');

    // ─── Decide SQL: predefined template (1 Gemini call total) or LLM (2 calls) ──
    let sql: string | null = null;
    let sqlParams: any[] = [];
    let intentLabel = '';

    // Extract categories from participation history for interest-based ranking
    const participationCategories: string[] = [];
    if (userHistory) {
      const catMatches = userHistory.match(/\(([^)]+)\)/g) || [];
      for (const match of catMatches) {
        const cat = match.replace(/[()]/g, '').trim();
        if (cat && cat !== 'Unknown' && !cat.includes(' — ')) {
          participationCategories.push(cat);
        }
      }
    }

    const template = detectTemplate(message, userInterests, participationCategories);
    if (template) {
      sql = template.sql;
      sqlParams = template.params;
      intentLabel = template.label;
    } else {
      // ─── Check for event creation intent (no SQL needed) ──────────────
      const m = message.toLowerCase();
      const isEventCreate = /(?:create|make|new|plan|organize|set up|build).*(?:event|workshop|meetup|session|conference|seminar)/.test(m)
        || /(?:event|workshop|meetup|session|conference|seminar).*(?:create|make|new|plan|organize|help|idea)/.test(m)
        || /(?:help|write|generate|draft|create|make).*(?:description|desc|about|details?).*(?:event|workshop|meetup)/.test(m)
        || /(?:event|workshop|meetup).*(?:description|desc|write|draft|generate)/.test(m)
        || /(?:i'?m?\s+)?(?:creating|making|planning|organizing|hosting)\s+(?:an?\s+)?(?:event|workshop|meetup|session)/.test(m)
        || /(?:write|generate|draft|create|make|help).*(?:event|workshop|meetup)\s+(?:description|desc|detail)/.test(m)
        || /\b(event|workshop|meetup|session|conference|seminar)\b.*\b(description|title|name|about)\b/.test(m)
        || /\b(description|title|name|about)\b.*\b(event|workshop|meetup|session|conference|seminar)\b/.test(m);

      if (isEventCreate) {
        intentLabel = 'event_create';
        // No SQL needed — skip to Pass 2 directly
      } else {
        // ─── Pass 1: Ask Gemini for a SQL query only ─────────────────────
        const sqlPrompt = `${contextHeader}

## Task
Decide whether you need to query the database to answer this question: "${message.trim()}"

If yes, output ONLY the SQL SELECT statement wrapped in <sql> tags. No other text, no explanations.
If you can answer without a database query, output exactly: NO_QUERY

## Query rules
- ONLY SELECT queries. Always use LIMIT (max 20).
- In normal conversation, LIMIT results to 3. Only return ALL matching rows (LIMIT 10) when the user explicitly asks for everything, a full list, or a table.
- For recommendations, ORDER BY the user's interests AND participation history categories FIRST (from ## Current User — look at both the "Interests" field and the "Participation History" categories in parentheses), then by popularity (member_count for communities, attendee_count or event_date for events).
- Always filter soft-deleted rows with deleted_at IS NULL.`;

        const sqlRaw = (await generateWithRetry(model, sqlPrompt)).trim();
        const sqlMatch = sqlRaw.match(/<sql>([\s\S]*?)<\/sql>/i);
        if (sqlMatch) {
          sql = sanitizeSql(sqlMatch[1].trim());
          intentLabel = /from\s+events\b/i.test(sql) ? 'events' : '';
        }
      }
    }

    // ─── Execute the query (if any) ──────────────────────────────────
    let resultsText = '';
    let resultRows: Record<string, any>[] = [];
    let sqlTouchedEvents = false;
    let queryFailed = false;
    if (sql) {
      if (!isReadOnlyQuery(sql)) {
        queryFailed = true;
      } else {
        sqlTouchedEvents = /from\s+events\b/i.test(sql);
        try {
          const dbResult = await query(sql, sqlParams);
          const rows = dbResult.rows as Record<string, any>[];
          resultRows = rows;
          if (rows.length === 1 && Object.keys(rows[0]).length === 1) {
            resultsText = String(Object.values(rows[0])[0]);
          } else {
            resultsText = formatResults(rows);
          }
        } catch (dbError: any) {
          console.error('Chat SQL failed:', dbError.message || dbError);
          queryFailed = true;
        }
      }
    }

    // ─── Pass 2: Ask Gemini for the final user-facing reply ──────────
    const greetingRule = isFirstMessage
      ? 'This is the FIRST message in the conversation. Start your reply with "Hello {Name}! 👋" using the name from ## Current User (skip the greeting only if the name is "Unknown").'
      : 'This is NOT the first message. Do NOT greet again — skip "Hello {Name}" entirely and answer the question directly.';

    const answerPrompt = `${contextHeader}

## Task
Write the final response to the user for this question: "${message.trim()}"

${greetingRule}
${intentLabel === 'event_create' ? `
## Intent hint
The user wants help creating or describing an event. They may have provided an event title, a brief description, or both.

Based on what they provided:
- If they gave a TITLE only: Generate a full description, suggest topics, event type, agenda, and requirements.
- If they gave a TITLE + DESCRIPTION: Polish and expand their description into a compelling, detailed version. Suggest additional fields.
- If they asked generic help (e.g., "help me create an event"): Explain what you can do and ask them to share the event title and a brief idea.

Your response MUST include:
1. **Generated Description**: A polished, copy-paste-ready event description (at least 3-4 sentences) with:
   - An engaging hook/opening line
   - What attendees can expect (2-3 paragraphs)
   - Who should attend
   - A call-to-action closing line
2. **Suggested Details**: Based on the title/description, recommend:
   - Event type (physical/virtual/hybrid)
   - 2-4 relevant topics from: Technology, Chess, Networking, Workshop, Education, Music, Sports, Art, Business, Social Service, Environment, Health, Gaming, Photography, Cooking, Literature, Dance, Theater, Film, Fashion
   - Sample agenda (if applicable)
   - Requirements for attendees
   - Instructions (if relevant)
3. **Pro Tips**: 2-3 tips to maximize attendance (e.g., banner image, seat limit, registration questions)

Use emojis as section markers (📌, 🎯, 💡, etc.). Keep the tone professional yet exciting.
Always end with <action type="view" url="/events/create" name="Create Your Event" /> so they can go create it right away.` : intentLabel ? `\n## Intent hint\nThe query is for the "${intentLabel}" intent — write the reply to match the user's question (e.g. introduce events with a line like "Here are the events happening this month:").` : ''}

${sql && !queryFailed
  ? `## Actual query results (REAL data from the database)
${resultsText}

Use the results above. If they include events, add ONE <action type="rsvp" id="{ID}" name="View {Title}" /> button for EACH event using the exact real ID and Title from the results, so the user can click to open the event page.`
  : queryFailed
    ? 'The database lookup failed. Tell the user you could not find that information and ask them to rephrase.'
    : 'No database query was needed. Answer from your knowledge of the platform.'}

## Formatting rules
- Use markdown: **bold** for titles, plain text for details, bullet lists for non-tabular data.
- **Events & communities — normal conversation**: show ONLY 2-3 items (never more), so the reply stays clean. For each item use this layout:
  - **{Title}** (bold)
  - a small detail line: date and location (e.g. "Sat Aug 15 2026, at LBEF College.")
  - a short 1-2 line description
  Then add ONE <action type="rsvp" id="{ID}" name="View {Title}" /> per item, and end with a <action type="view" url="/events" name="View More Events" /> button.
- **Full list**: ONLY when the user explicitly asks for ALL events/communities or asks for a table, show the full details (up to 10) as a pipe table.
- **Recommendations**: when the user asks for recommendations/suggestions, personalize based on ALL signals from ## Current User:
  1. **Participation History** (strongest signal): Categories from events attended, communities joined, and saved events — prioritize these.
  2. **Interests field**: Explicitly stated interests.
  3. **Bio**: Implicit interests mentioned in their bio text.
  4. **Popularity**: Fall back to popular items if few personalization signals exist.
  Briefly explain WHY each recommendation matches them (e.g., "Since you've attended Tech events...", "You might enjoy this based on your Photography interest...").
- Use <action type="join|rsvp|view|link" ... /> tags for any buttons you want to show.
- Be friendly and conversational, use emojis sparingly.
- Reply ONLY with the final message.`;

    let response: string;
    try {
      response = (await generateWithRetry(model, answerPrompt)).trim();
    } catch (formatError: any) {
      console.error('Chat formatting failed, using fallback reply:', formatError.message || formatError);
      response = buildFallbackReply(resultRows, intentLabel, userName, isFirstMessage);
    }

    // ─── Parse action tags out of the final reply ────────────────────
    let actions = parseActions(response);
    response = response.replace(/<action\s+((?:\w+="[^"]*"\s*)*)\/>/gi, '').trim();

    // ─── Deterministic fallback 1: greet by name (FIRST message only) ─
    if (isFirstMessage && userName && !/^hello/i.test(response)) {
      response = `Hello ${userName}! 👋\n\n${response}`;
    }

    // ─── Deterministic fallback 2: per-event/community link buttons ──
    // Auto-generate buttons from real result rows (capped at 3) + a "view more" button.
    if (sql && !queryFailed && resultRows.length > 0) {
      sqlTouchedEvents = sqlTouchedEvents || /from\s+events\b/i.test(sql);
      const sqlTouchedCommunities = /from\s+communities\b/i.test(sql);

      if (sqlTouchedEvents) {
        const autoButtons = resultRows
          .filter(r => r.id !== undefined && r.title !== undefined)
          .map(r => ({
            type: 'rsvp' as const,
            id: Number(r.id),
            name: `View ${String(r.title)}`,
          }))
          .slice(0, 3);

        if (autoButtons.length > 0) {
          const existing = new Set(actions.map(a => `${a.type}:${a.id ?? a.name}`));
          for (const btn of autoButtons) {
            const key = `${btn.type}:${btn.id}`;
            if (!existing.has(key)) actions.push(btn);
          }
          if (!actions.some(a => a.type === 'view' && a.url === '/events')) {
            actions.push({ type: 'view', name: 'View More Events', url: '/events' } as any);
          }
        }
      }

      if (sqlTouchedCommunities) {
        const autoButtons = resultRows
          .filter(r => r.id !== undefined && r.name !== undefined)
          .map(r => ({
            type: 'join' as const,
            id: Number(r.id),
            name: `View ${String(r.name)}`,
          }))
          .slice(0, 3);

        if (autoButtons.length > 0) {
          const existing = new Set(actions.map(a => `${a.type}:${a.id ?? a.name}`));
          for (const btn of autoButtons) {
            const key = `${btn.type}:${btn.id}`;
            if (!existing.has(key)) actions.push(btn);
          }
          if (!actions.some(a => a.type === 'view' && a.url === '/communities')) {
            actions.push({ type: 'view', name: 'View More Communities', url: '/communities' } as any);
          }
        }
      }
    }

    res.json({
      reply: response,
      actions: actions.length > 0 ? actions : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Chat error:', error.message || error);
    if (error.message?.includes('API_KEY')) {
      return res.status(503).json({ reply: '⚠️ The AI assistant API key is invalid or has expired. Please contact the admin to update the GEMINI_API_KEY.' });
    }
    if (error.message?.includes('SAFETY')) {
      return res.status(400).json({ reply: 'I cannot respond to that request due to content safety guidelines. Please try rephrasing your question.' });
    }
    if (error.message?.includes('RATE_LIMIT') || error.message?.includes('429') || error.status === 429) {
      return res.status(429).json({ reply: '⏳ The AI assistant is temporarily rate-limited. Please wait a moment and try again.' });
    }
    res.status(500).json({ reply: 'Sorry, I encountered an error. Please try again in a moment.' });
  }
});

export default router;
