'use client';

import { useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ActionButton {
  type: 'join' | 'rsvp' | 'view' | 'link';
  id?: number;
  name: string;
  url?: string;
}

interface RichMessageProps {
  content: string;
  actions?: ActionButton[];
  timestamp?: Date;
}

// ─── Inline Tokenizer ───────────────────────────────────────────────────────

type InlineToken =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; url: string; text: string }
  | { type: 'strikethrough'; text: string };

function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let remaining = text;

  // Match inline patterns in order
  const pattern = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|~~(.+?)~~|\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/[^\s<]+))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(remaining)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', text: remaining.slice(lastIndex, match.index) });
    }

    if (match[2]) {
      tokens.push({ type: 'bold', text: match[2] });
    } else if (match[3]) {
      tokens.push({ type: 'bold', text: match[3] });
    } else if (match[4]) {
      tokens.push({ type: 'italic', text: match[4] });
    } else if (match[5]) {
      tokens.push({ type: 'code', text: match[5] });
    } else if (match[6]) {
      tokens.push({ type: 'strikethrough', text: match[6] });
    } else if (match[7] && match[8]) {
      tokens.push({ type: 'link', text: match[7], url: match[8] });
    } else if (match[9]) {
      tokens.push({ type: 'link', text: match[9], url: match[9] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < remaining.length) {
    tokens.push({ type: 'text', text: remaining.slice(lastIndex) });
  }

  return tokens;
}

// ─── Block Types ────────────────────────────────────────────────────────────

type BlockType =
  | 'paragraph'
  | 'heading'
  | 'code'
  | 'table'
  | 'list'
  | 'ordered-list'
  | 'blockquote'
  | 'divider';

interface TextBlock {
  type: BlockType;
  content?: string;
  items?: string[];
  rows?: string[][];
  headers?: string[];
  level?: number;
  language?: string;
}

// ─── Block Parser ───────────────────────────────────────────────────────────

function parseBlocks(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (trimmed === '') {
      i++;
      continue;
    }

    // Divider
    if (/^[-*_]{3,}\s*$/.test(trimmed)) {
      blocks.push({ type: 'divider' });
      i++;
      continue;
    }

    // Code block
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim() || undefined;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: 'code', content: codeLines.join('\n'), language });
      continue;
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({ type: 'heading', content: headingMatch[2], level: headingMatch[1].length });
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', content: quoteLines.join('\n') });
      continue;
    }

    // Table detection – check if this line and next form a table
    if (trimmed.startsWith('|') && trimmed.includes('|')) {
      const tableRows: string[][] = [];
      // Check if next line is a separator
      if (i + 1 < lines.length && /^[\s|:]+[-]+[\s|:]+$/.test(lines[i + 1].trim())) {
        // Parse headers
        const headers = trimmed
          .split('|')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        i += 2; // skip header and separator

        // Parse data rows
        while (i < lines.length) {
          const rowLine = lines[i].trim();
          if (!rowLine.startsWith('|') || !rowLine.includes('|')) break;
          const cells = rowLine
            .split('|')
            .map(s => s.trim())
            .filter(s => s.length > 0);
          if (cells.length === 0) break;
          tableRows.push(cells);
          i++;
        }

        if (tableRows.length > 0) {
          blocks.push({ type: 'table', headers, rows: tableRows });
          continue;
        }
      }
    }

    // Unordered list
    if (/^[\s]*[•\-\*]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i].trim();
        if (/^[•\-\*]\s/.test(l)) {
          items.push(l.replace(/^[•\-\*]\s+/, ''));
          i++;
        } else if (l === '' && i + 1 < lines.length && /^[•\-\*]\s/.test(lines[i + 1].trim())) {
          i++; // skip blank line between list items
        } else {
          break;
        }
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    // Ordered list
    if (/^\d+[.)]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i].trim();
        if (/^\d+[.)]\s/.test(l)) {
          items.push(l.replace(/^\d+[.)]\s+/, ''));
          i++;
        } else if (l === '' && i + 1 < lines.length && /^\d+[.)]\s/.test(lines[i + 1].trim())) {
          i++; // skip blank line
        } else {
          break;
        }
      }
      blocks.push({ type: 'ordered-list', items });
      continue;
    }

    // Regular paragraph – collect until next empty line
    const paraLines: string[] = [];
    while (i < lines.length) {
      const l = lines[i].trim();
      if (l === '') break;
      if (l.startsWith('|') && l.includes('|')) break; // don't eat table lines
      if (/^[#>\-*\d`]/.test(l) && paraLines.length === 0) break;
      paraLines.push(l);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', content: paraLines.join('\n') });
    } else {
      i++;
    }
  }

  return blocks;
}

// ─── Inline Renderer ────────────────────────────────────────────────────────

function InlineRenderer({ text }: { text: string }) {
  const tokens = tokenizeInline(text);

  return (
    <>
      {tokens.map((token, idx) => {
        switch (token.type) {
          case 'bold':
            return <strong key={idx} className="font-semibold text-white">{token.text}</strong>;
          case 'italic':
            return <em key={idx} className="italic text-slate-200">{token.text}</em>;
          case 'code':
            return (
              <code
                key={idx}
                className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-xs font-mono border border-amber-500/20"
              >
                {token.text}
              </code>
            );
          case 'link':
            return (
              <a
                key={idx}
                href={token.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 underline underline-offset-2 decoration-amber-500/30 hover:decoration-amber-400 transition-colors"
              >
                {token.text}
              </a>
            );
          case 'strikethrough':
            return <del key={idx} className="text-slate-500">{token.text}</del>;
          case 'text':
          default:
            return <span key={idx}>{token.text}</span>;
        }
      })}
    </>
  );
}

// ─── Action Buttons (using <a> tags for reliable navigation) ──────────────

function ActionButtons({ actions }: { actions: ActionButton[] }) {
  const getHref = (action: ActionButton): string | undefined => {
    switch (action.type) {
      case 'join': return `/communities/${action.id}`;
      case 'rsvp': return `/events/${action.id}`;
      case 'view': return action.url;
      case 'link': return action.url;
      default: return undefined;
    }
  };

  const getTarget = (action: ActionButton): string | undefined => {
    return action.type === 'link' ? '_blank' : undefined;
  };

  const actionStyles: Record<string, string> = {
    join: 'bg-gradient-to-r from-emerald-500 to-green-500 text-black hover:shadow-emerald-500/40',
    rsvp: 'bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:shadow-amber-500/40',
    view: 'bg-slate-700/80 text-slate-200 hover:bg-slate-700 border border-slate-600/50',
    link: 'bg-slate-700/80 text-slate-200 hover:bg-slate-700 border border-slate-600/50',
  };

  const actionIcons: Record<string, string> = {
    join: '→',
    rsvp: '✓',
    view: '👁',
    link: '↗',
  };

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {actions.map((action, idx) => {
        const href = getHref(action);
        const target = getTarget(action);
        return (
          <a
            key={idx}
            href={href || '#'}
            target={target}
            rel={target === '_blank' ? 'noopener noreferrer' : undefined}
            className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl no-underline cursor-pointer ${actionStyles[action.type] || actionStyles.view}`}
          >
            <span className="mr-1.5">{actionIcons[action.type] || '•'}</span>
            {action.name}
          </a>
        );
      })}
    </div>
  );
}

// ─── Block Renderer ─────────────────────────────────────────────────────────

function BlockRenderer({ blocks }: { blocks: TextBlock[] }) {
  return (
    <div className="space-y-2.5">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'paragraph':
            return (
              <p key={idx} className="text-sm leading-relaxed text-slate-200">
                <InlineRenderer text={block.content || ''} />
              </p>
            );

          case 'heading': {
            const sizeClasses = ['text-base font-bold text-white', 'text-sm font-semibold text-slate-100', 'text-xs font-semibold text-slate-200'];
            return (
              <h3 key={idx} className={`${sizeClasses[Math.min((block.level || 1) - 1, 2)]} mt-1`}>
                <InlineRenderer text={block.content || ''} />
              </h3>
            );
          }

          case 'code':
            return (
              <div key={idx} className="relative group">
                {block.language && (
                  <div className="absolute top-0 right-0 px-2 py-0.5 text-[10px] text-slate-500 bg-slate-800 rounded-bl-lg rounded-tr-lg font-mono">
                    {block.language}
                  </div>
                )}
                <pre className="bg-slate-900/80 border border-slate-700/40 rounded-xl p-3 overflow-x-auto text-xs font-mono text-slate-300 leading-relaxed">
                  <code>{block.content}</code>
                </pre>
              </div>
            );

          case 'table': {
            const headers = block.headers || [];
            const rows = block.rows || [];
            return (
              <div key={idx} className="overflow-x-auto rounded-xl border border-slate-700/40">
                <table className="w-full text-xs">
                  {headers.length > 0 && (
                    <thead>
                      <tr className="bg-slate-800/60">
                        {headers.map((h, ci) => (
                          <th key={ci} className="px-3 py-2 text-left font-semibold text-amber-300 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {rows.map((row, ri) => (
                      <tr
                        key={ri}
                        className={`border-t border-slate-700/30 ${ri % 2 === 0 ? 'bg-slate-800/20' : 'bg-slate-800/10'} hover:bg-slate-700/30 transition-colors`}
                      >
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-2 text-slate-300 whitespace-nowrap">
                            <InlineRenderer text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          case 'list':
            return (
              <ul key={idx} className="space-y-1">
                {block.items?.map((item, li) => (
                  <li key={li} className="flex items-start gap-2 text-sm text-slate-200">
                    <span className="text-amber-400 mt-0.5 shrink-0">•</span>
                    <span><InlineRenderer text={item} /></span>
                  </li>
                ))}
              </ul>
            );

          case 'ordered-list':
            return (
              <ol key={idx} className="space-y-1 list-decimal list-inside">
                {block.items?.map((item, li) => (
                  <li key={li} className="text-sm text-slate-200">
                    <InlineRenderer text={item} />
                  </li>
                ))}
              </ol>
            );

          case 'blockquote':
            return (
              <blockquote
                key={idx}
                className="pl-3 py-2 border-l-2 border-amber-500/40 bg-amber-500/5 rounded-r-xl text-sm text-slate-300 italic"
              >
                <InlineRenderer text={block.content || ''} />
              </blockquote>
            );

          case 'divider':
            return (
              <hr key={idx} className="border-slate-700/40 my-1" />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function RichMessage({ content, actions, timestamp }: RichMessageProps) {
  const [copied, setCopied] = useState(false);

  const blocks = parseBlocks(content);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative group">
      <BlockRenderer blocks={blocks} />

      {/* Action buttons */}
      {actions && actions.length > 0 && <ActionButtons actions={actions} />}

      {/* Timestamp & Copy */}
      <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {timestamp && (
          <span className="text-[10px] text-slate-500">
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-amber-400 transition-colors"
          title="Copy message"
        >
          {copied ? (
            <>
              <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
