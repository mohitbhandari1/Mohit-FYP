'use client';

import Link from 'next/link';
import { BACKEND_URL } from '../lib/auth';

/**
 * "Why recommended?" modal for the redesigned Smart Connects recommendation
 * system. Displays ONLY data returned by the backend:
 *   - matched interests + strength labels
 *   - the exact score breakdown (0–100 per component)
 *   - factual reasons + honest data notes (e.g. "no reviews available")
 * No values are invented on the frontend; it renders what the backend
 * calculated from actual database data.
 */

export interface MatchedInterest {
  interest: string;
  strength: number;
  label: string;
}

export interface RecommendationDetail {
  community_id: number;
  name: string;
  match_percentage: number;
  matched_interests: MatchedInterest[];
  score_breakdown: {
    interest_relevance: number;
    description_relevance: number;
    event_relevance: number;
    category_relevance: number;
    review_score: number;
    engagement_score: number;
    verification_score: number;
  };
  recommendation_reasons: string[];
  data_notes?: Record<string, string>;
  best_event?: { id: number; title: string; event_date: string } | null;
  review_count: number;
}

const BREAKDOWN_LABELS: { key: keyof RecommendationDetail['score_breakdown']; label: string }[] = [
  { key: 'interest_relevance', label: 'Interest relevance' },
  { key: 'description_relevance', label: 'Description relevance' },
  { key: 'event_relevance', label: 'Event relevance' },
  { key: 'category_relevance', label: 'Category relevance' },
  { key: 'review_score', label: 'Reviews' },
  { key: 'engagement_score', label: 'Engagement' },
  { key: 'verification_score', label: 'Verification' },
];

/** Amber→orange fill matched to the app's accent palette. */
function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-300 w-14 text-right tabular-nums">
        {Math.round(score)}/100
      </span>
    </div>
  );
}

export default function WhyRecommendedModal({
  isOpen,
  onClose,
  recommendation,
}: {
  isOpen: boolean;
  onClose: () => void;
  recommendation: RecommendationDetail | null;
}) {
  if (!isOpen || !recommendation) return null;

  const { name, match_percentage, matched_interests, score_breakdown, recommendation_reasons } = recommendation;

  const relevant = matched_interests.filter((m) => m.strength >= 0.5);
  const hasRelevant = relevant.length > 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-white/5">
          <div>
            <h3 className="text-lg font-semibold text-white">Why {name}?</h3>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-2xl font-bold text-gradient">{match_percentage}% Match</span>
              <span className="text-xs text-slate-500">based on your interests & activity data</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Your interests */}
          <section>
            <h4 className="text-sm font-semibold text-slate-200 mb-3">Your interests</h4>
            {hasRelevant ? (
              <div className="space-y-2">
                {relevant.map((m) => (
                  <div key={m.interest} className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-slate-200 font-medium">{m.interest}</span>
                    <span className="text-xs text-slate-400">— {m.label}</span>
                    <div className="ml-auto w-20 h-1 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                        style={{ width: `${Math.round(m.strength * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 tabular-nums w-8 text-right">{Math.round(m.strength * 100)}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-400">
                  None of your interests match this community strongly. It&apos;s shown as one of the closest options available.
                </p>
                <p className="text-xs text-slate-500 mt-1.5">
                  Interests with limited relevance: {matched_interests.map((m) => m.interest).join(', ')}
                </p>
              </div>
            )}
          </section>

          {/* Score breakdown */}
          <section>
            <h4 className="text-sm font-semibold text-slate-200 mb-3">Score breakdown</h4>
            <div className="space-y-2.5">
              {BREAKDOWN_LABELS.map(({ key, label }) => (
                <div key={key}>
                  <div className="text-xs text-slate-400 mb-1">{label}</div>
                  <ScoreBar score={score_breakdown[key]} />
                </div>
              ))}
            </div>
          </section>

          {/* Reasons (from actual data) */}
          {recommendation_reasons.length > 0 && (
            <section>
              <h4 className="text-sm font-semibold text-slate-200 mb-2">Why it ranked highly</h4>
              <ul className="space-y-1.5">
                {recommendation_reasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <svg className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Honest data notes — shown exactly when data is missing */}
          {recommendation.data_notes && Object.keys(recommendation.data_notes).length > 0 && (
            <section>
              <h4 className="text-sm font-semibold text-slate-200 mb-2">Data notes</h4>
              <ul className="space-y-1.5">
                {Object.entries(recommendation.data_notes).map(([key, note]) => (
                  <li key={key} className="text-xs text-slate-500">
                    <span className="text-slate-400 capitalize">{key.replace(/_/g, ' ')}:</span> {note}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-white/5">
          <Link
            href={`/communities/${recommendation.community_id}`}
            className="btn-primary w-full text-sm py-2.5 rounded-xl flex items-center justify-center gap-2"
          >
            View Community
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
