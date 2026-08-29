// ─── Chatbot Frontend Configuration ─────────────────────────────────────────
// Quick-prompt suggestions shown in the initial chat view.
// Keep these focused on queries and recommendations.
// ────────────────────────────────────────────────────────────────────────────

/** Quick-prompt suggestions shown in the chat panel before any messages are sent. */
export const quickPrompts: string[] = [
  'Show all communities',
  'Find events near me',
  'Recommend communities',
  'Upcoming events',
  'Events this week',
  'Events this month',
  'Help me create an event',
  'Write a description for my event',
  'Most popular events',
  'Find communities by category',
];

/** Legacy alias (same as quickPrompts). */
export const quickPromptCategories = [
  {
    key: 'all',
    label: 'Suggestions',
    prompts: quickPrompts,
  },
];
