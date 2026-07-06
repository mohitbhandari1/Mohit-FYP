import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { SCHEMA, SYSTEM_PROMPT, isReadOnlyQuery, sanitizeSql, formatResults } from '../config/chat';

const router = express.Router();

// ─── Gemini Setup ───
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ─── Chat Endpoint (single Gemini call per message) ───
router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  const { message } = req.body as { message: string };

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ reply: '⚠️ AI assistant is not configured. Please ask an admin to set up the GEMINI_API_KEY environment variable.' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    // Build the user message with schema + question
    const userMessage = [
      `## Current User\nID: ${req.userId}\n`,
      `## Database Schema\n${SCHEMA}`,
      `## User Question\n${message.trim()}`,
    ].join('\n\n');

    // ─── Single Gemini call with one quick retry ───
    let result;
    try {
      result = await model.generateContent(userMessage);
    } catch (firstError: any) {
      // On rate limit, do ONE quick retry after 2 seconds, then bail
      const isRateLimit = firstError.message?.includes('429') || firstError.status === 429;
      if (isRateLimit) {
        console.log('Gemini rate limited, quick retry in 2s...');
        await new Promise(r => setTimeout(r, 2000));
        try {
          result = await model.generateContent(userMessage);
        } catch (secondError: any) {
          throw secondError; // Still rate limited — let outer handler respond
        }
      } else {
        throw firstError; // Not a rate limit — let outer handler respond
      }
    }

    let response = result!.response.text();

    // ─── Check for SQL block ───
    const sqlMatch = response.match(/<sql>([\s\S]*?)<\/sql>/i);
    if (sqlMatch) {
      let sql = sqlMatch[1].trim();

      // Sanitize & validate
      sql = sanitizeSql(sql);
      if (!isReadOnlyQuery(sql)) {
        // Replace SQL block with safety warning
        response = response.replace(sqlMatch[0], '⚠️ I can only look up information.');
      } else {
        try {
          const dbResult = await query(sql);
          // Check if results are single value (e.g., COUNT) or multiple rows
          const rows = dbResult.rows as Record<string, any>[];
          let formatted: string;
          if (rows.length === 1 && Object.keys(rows[0]).length === 1) {
            formatted = String(Object.values(rows[0])[0]);
          } else {
            formatted = formatResults(rows);
          }
          // Replace {{RESULTS}} placeholder with actual data
          if (response.includes('{{RESULTS}}')) {
            response = response.replace('{{RESULTS}}', formatted);
          } else {
            // Gemini forgot the placeholder — append results directly
            response += `\n\n${formatted}`;
          }
          // Remove the SQL tag from the response
          response = response.replace(sqlMatch[0], '').trim();
        } catch (dbError: any) {
          // Query failed — replace SQL block with error note
          response = response.replace(sqlMatch[0], `I tried to look that up but ran into an issue. Please try rephrasing your question.`);
        }
      }
    }

    res.json({
      reply: response,
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
