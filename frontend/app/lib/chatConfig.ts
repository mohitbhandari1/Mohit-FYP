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
  'Find communities by category',
  'Most popular communities',
  'Most popular events',
];

/** Legacy alias (same as quickPrompts). */
export const quickPromptCategories = [
  {
    key: 'all',
    label: 'Suggestions',
    prompts: quickPrompts,
  },
];
