import express from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// POST /api/chat - Send a message to the chatbot
router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  const { message, history } = req.body as { message: string; history?: Message[] };

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const lower = message.toLowerCase().trim();
    let reply = '';

    // Simple keyword-based response system
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      reply = "Hello! I'm the Smart Connects assistant. I can help you find communities and events. Try asking: 'What communities are available?' or 'Show me events' or 'Recommend communities for me'.";
    } 
    else if (lower.includes('help') || lower.includes('what can you do')) {
      reply = `I can help you with the following:

🔍 Find communities by name or category
📅 Look up upcoming events
⭐ Get personalized community recommendations
ℹ️ Answer questions about the platform

Try asking something like:
• "Show me all communities"
• "What events are coming up?"
• "Find tech communities"
• "Recommend communities for me"`;
    }
    else if (lower.includes('recommend') || lower.includes('suggestion') || lower.includes('suggest')) {
      // Fetch user interests and recommend
      const userResult = await query<{ interests: string }>('SELECT interests FROM users WHERE id = $1', [req.userId]);
      const interests = userResult.rows[0]?.interests || 'not specified';

      const communities = await query<any>(
        'SELECT name, description, category FROM communities ORDER BY member_count DESC LIMIT 5'
      );

      if (communities.rows.length === 0) {
        reply = "There are no communities available yet. Check back later!";
      } else {
        reply = `Based on your interests (${interests || 'not specified, showing popular ones'}), here are some communities you might like:\n\n`;
        communities.rows.forEach((c: any, i: number) => {
          reply += `${i + 1}. **${c.name}** — ${c.category || 'General'}\n   ${c.description?.substring(0, 100)}...\n\n`;
        });
        reply += "Would you like more details on any of these?";
      }
    }
    else if (lower.includes('community') || lower.includes('communities') || lower.includes('groups')) {
      // Extract search term: if asking to show/list, show all; otherwise extract keywords
      const isListRequest = /show|list|all|browse/.test(lower);
      let searchTerm: string | null = null;
      
      if (!isListRequest) {
        const cleaned = message
          .replace(/communities|community|groups?|show|list|all?|find|search|for|me|i want|tell|about/gi, '')
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .trim();
        if (cleaned.length >= 2) {
          searchTerm = cleaned;
        }
      }

      let communities;
      if (searchTerm && searchTerm.length > 0) {
        communities = await query<any>(
          'SELECT name, description, category, member_count FROM communities WHERE name ILIKE $1 OR description ILIKE $1 OR category ILIKE $1 ORDER BY member_count DESC LIMIT 5',
          [`%${searchTerm}%`]
        );
      } else {
        communities = await query<any>(
          'SELECT name, description, category, member_count FROM communities ORDER BY member_count DESC LIMIT 5'
        );
      }

      if (communities.rows.length === 0) {
        reply = searchTerm 
          ? `I couldn't find any communities matching "${searchTerm}". Try different keywords!`
          : 'There are no communities on the platform yet.';
      } else {
        reply = searchTerm 
          ? `Here are communities matching "${searchTerm}":\n\n`
          : 'Here are the communities on Smart Connects:\n\n';
        communities.rows.forEach((c: any, i: number) => {
          reply += `${i + 1}. **${c.name}** (${c.category || 'General'}) — ${c.member_count} members\n   ${c.description?.substring(0, 120)}...\n\n`;
        });
        reply += "You can browse all communities on the Communities page!";
      }
    }
    else if (lower.includes('event') || lower.includes('events') || lower.includes('upcoming') || lower.includes('happening')) {
      const events = await query<any>(
        `SELECT e.title, e.event_date, e.location, c.name as community_name 
         FROM events e JOIN communities c ON e.community_id = c.id 
         WHERE e.event_date > NOW() 
         ORDER BY e.event_date ASC 
         LIMIT 5`
      );

      if (events.rows.length === 0) {
        reply = "There are no upcoming events scheduled. Check back later or ask your community organizers!";
      } else {
        reply = 'Here are upcoming events:\n\n';
        events.rows.forEach((e: any, i: number) => {
          const date = new Date(e.event_date).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
          });
          reply += `${i + 1}. **${e.title}** — ${e.community_name}\n   📅 ${date} | 📍 ${e.location || 'Online'}\n\n`;
        });
        reply += "Visit the Events page to RSVP!";
      }
    }
    else if (lower.includes('category') || lower.includes('categories') || lower.includes('types')) {
      const categories = await query<{ category: string }>(
        'SELECT DISTINCT category FROM communities WHERE category IS NOT NULL ORDER BY category'
      );

      if (categories.rows.length === 0) {
        reply = 'No categories are available yet.';
      } else {
        reply = 'Community categories available:\n\n';
        categories.rows.forEach((c: any, i: number) => {
          reply += `• ${c.category}\n`;
        });
        reply += '\nYou can browse communities by category on the Communities page!';
      }
    }
    else if (lower.includes('profile') || lower.includes('account') || lower.includes('setting')) {
      const userResult = await query<{ name: string; email: string; role: string; interests: string }>(
        'SELECT name, email, role, interests FROM users WHERE id = $1',
        [req.userId]
      );
      const user = userResult.rows[0];
      reply = `Your Profile:\n\n• **Name:** ${user.name}\n• **Email:** ${user.email}\n• **Role:** ${user.role}\n• **Interests:** ${user.interests || 'Not set'}\n\nYou can update your profile on the Profile page!`;
    }
    else if (lower.includes('organizer') || lower.includes('create community') || lower.includes('start')) {
      reply = `To create and manage communities:

1. Go to the **Organizer Dashboard** from the navigation menu
2. Click "Create Community" and fill in the details
3. Once created, you can manage events and edit community info
4. You can also create events for your communities

Visit the Organizer page to get started!`;
    }
    else {
      // Fallback: try searching communities and events
      const [commResults, eventResults] = await Promise.all([
        query<any>(
          'SELECT name FROM communities WHERE name ILIKE $1 OR description ILIKE $1 LIMIT 3',
          [`%${lower.substring(0, 50)}%`]
        ),
        query<any>(
          'SELECT title FROM events WHERE title ILIKE $1 OR description ILIKE $1 LIMIT 3',
          [`%${lower.substring(0, 50)}%`]
        ),
      ]);

      reply = "I'm not sure I understand. Here's what I can help with:\n\n";
      if (commResults.rows.length > 0) {
        reply += '📌 **Communities:** ' + commResults.rows.map((c: any) => c.name).join(', ') + '\n\n';
      }
      if (eventResults.rows.length > 0) {
        reply += '📌 **Events:** ' + eventResults.rows.map((e: any) => e.title).join(', ') + '\n\n';
      }
      reply += 'Try asking: "Show me communities", "Find events", "Recommend communities", or type "help" to see more options.';
    }

    res.json({
      reply,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
