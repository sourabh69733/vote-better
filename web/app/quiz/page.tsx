"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/* ── Types ── */

interface Question {
  id: string;
  text: string;
  options: { label: string; icon: string; key: string; weight: Record<string, number> }[];
}

interface CandidateData {
  id: string;
  name: string;
  party: string;
  education: string;
  constituency: { name: string; state: string };
  legislative_performance?: { attendance_pct?: number; questions_asked?: number };
  criminal_record?: { total_cases?: number; serious_cases?: number };
  fund_utilization?: { utilization_pct?: number };
  financials?: { wealth_growth_pct?: number; inflation_pct_same_period?: number };
}

/* ── Questions ── */

const QUESTIONS: Question[] = [
  {
    id: "priority",
    text: "What matters most to you in a leader?",
    options: [
      {
        label: "Clean record — no criminal cases",
        icon: "🧼",
        key: "clean",
        weight: { cases: 3, attendance: 1, fund: 1, wealth: 1 },
      },
      {
        label: "Shows up to work — high attendance",
        icon: "🏛️",
        key: "attendance",
        weight: { cases: 1, attendance: 3, fund: 1, wealth: 1 },
      },
      {
        label: "Develops the area — spends fund well",
        icon: "🏗️",
        key: "development",
        weight: { cases: 1, attendance: 1, fund: 3, wealth: 1 },
      },
      {
        label: "Honest wealth — no suspicious growth",
        icon: "💰",
        key: "wealth",
        weight: { cases: 1, attendance: 1, fund: 1, wealth: 3 },
      },
    ],
  },
  {
    id: "attendance",
    text: "Should your leader attend Parliament regularly?",
    options: [
      {
        label: "Must be above 80%",
        icon: "✅",
        key: "strict",
        weight: { attendance: 2 },
      },
      {
        label: "Above 60% is fine",
        icon: "👍",
        key: "moderate",
        weight: { attendance: 1 },
      },
      {
        label: "Doesn't matter to me",
        icon: "🤷",
        key: "ignore",
        weight: { attendance: 0 },
      },
    ],
  },
  {
    id: "cases",
    text: "Do criminal cases concern you?",
    options: [
      {
        label: "Must have zero cases",
        icon: "🚫",
        key: "zero",
        weight: { cases: 3 },
      },
      {
        label: "Minor protest cases are OK",
        icon: "🟡",
        key: "minor_ok",
        weight: { cases: 1 },
      },
      {
        label: "I don't judge on cases alone",
        icon: "⚖️",
        key: "ignore",
        weight: { cases: 0 },
      },
    ],
  },
  {
    id: "wealth",
    text: "Does suspicious wealth growth matter?",
    options: [
      {
        label: "Yes — wealth shouldn't grow 10x while in office",
        icon: "📊",
        key: "strict",
        weight: { wealth: 3 },
      },
      {
        label: "Some growth is expected",
        icon: "📈",
        key: "moderate",
        weight: { wealth: 1 },
      },
      {
        label: "Wealth is personal, not my concern",
        icon: "🤷",
        key: "ignore",
        weight: { wealth: 0 },
      },
    ],
  },
  {
    id: "fund",
    text: "Should development funds be fully spent?",
    options: [
      {
        label: "Must spend at least 75%",
        icon: "🎯",
        key: "strict",
        weight: { fund: 3 },
      },
      {
        label: "50%+ is acceptable",
        icon: "👍",
        key: "moderate",
        weight: { fund: 1 },
      },
      {
        label: "Not a priority for me",
        icon: "🤷",
        key: "ignore",
        weight: { fund: 0 },
      },
    ],
  },
];

/* ── Scoring ── */

function scoreCandidate(
  candidate: CandidateData,
  weights: Record<string, number>
): number {
  let score = 0;

  // Attendance score (0-100)
  const att = candidate.legislative_performance?.attendance_pct ?? 50;
  score += (att / 100) * (weights.attendance ?? 1);

  // Cases score (inverse — fewer is better)
  const cases = candidate.criminal_record?.total_cases ?? 0;
  const caseScore = cases === 0 ? 1 : cases <= 2 ? 0.5 : 0;
  score += caseScore * (weights.cases ?? 1);

  // Fund utilization score
  const fund = candidate.fund_utilization?.utilization_pct ?? 50;
  score += (fund / 100) * (weights.fund ?? 1);

  // Wealth growth score (inverse — lower growth is better)
  const growth = candidate.financials?.wealth_growth_pct ?? 0;
  const inflation = candidate.financials?.inflation_pct_same_period ?? 45;
  const ratio = growth / Math.max(inflation, 1);
  const wealthScore = ratio <= 2 ? 1 : ratio <= 5 ? 0.5 : 0.1;
  score += wealthScore * (weights.wealth ?? 1);

  return score;
}

/* ── Component ── */

export default function QuizPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>[]>([]);
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [rankedResults, setRankedResults] = useState<
    { candidate: CandidateData; score: number }[]
  >([]);

  // Load all candidates on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/data/metadata.json");
        const meta = await res.json();
        const ids: string[] = meta.candidate_ids ?? [];

        // If no IDs in metadata, try loading mp-001 through mp-010
        const candidateIds =
          ids.length > 0
            ? ids
            : Array.from({ length: 10 }, (_, i) =>
                `mp-${String(i + 1).padStart(3, "0")}`
              );

        const loaded: CandidateData[] = [];
        for (const id of candidateIds) {
          try {
            const r = await fetch(`/data/candidates/${id}.json`);
            if (r.ok) loaded.push(await r.json());
          } catch {
            // skip failed loads
          }
        }
        setCandidates(loaded);
      } catch {
        // fallback
      }
    }
    load();
  }, []);

  const isFinished = step >= QUESTIONS.length;

  const handleAnswer = (weights: Record<string, number>) => {
    const newAnswers = [...answers, weights];
    setAnswers(newAnswers);

    if (step + 1 >= QUESTIONS.length) {
      // Compute results
      const mergedWeights: Record<string, number> = {};
      newAnswers.forEach((w) => {
        Object.entries(w).forEach(([k, v]) => {
          mergedWeights[k] = (mergedWeights[k] ?? 0) + v;
        });
      });

      const scored = candidates
        .map((c) => ({ candidate: c, score: scoreCandidate(c, mergedWeights) }))
        .sort((a, b) => b.score - a.score);

      setRankedResults(scored);
    }

    setStep(step + 1);
  };

  const handleRetake = () => {
    setStep(0);
    setAnswers([]);
    setRankedResults([]);
  };

  // Loading
  if (candidates.length === 0 && !isFinished) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="animate-pulse text-slate-400">Loading candidates...</div>
      </div>
    );
  }

  // Results screen
  if (isFinished) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
          🎯 Your Priority Match
        </h1>
        <p className="text-sm text-slate-500 text-center mb-6">
          Candidates ranked by what matters to YOU
        </p>

        <div className="space-y-3">
          {rankedResults.map(({ candidate, score }, i) => (
            <Link
              key={candidate.id}
              href={`/candidate/${candidate.id}`}
              className="block bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-indigo-200 transition-all"
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                    i === 0
                      ? "bg-amber-100 text-amber-700"
                      : i === 1
                        ? "bg-slate-100 text-slate-600"
                        : i === 2
                          ? "bg-orange-100 text-orange-700"
                          : "bg-slate-50 text-slate-400"
                  }`}
                >
                  #{i + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 truncate">
                      {candidate.name}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-bold text-white flex-shrink-0"
                      style={{
                        backgroundColor: getPartyColor(candidate.party),
                      }}
                    >
                      {candidate.party}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {candidate.constituency?.name},{" "}
                    {candidate.constituency?.state}
                  </p>
                </div>

                {/* Score bar */}
                <div className="w-20 flex-shrink-0">
                  <div className="text-right text-xs text-slate-400 mb-0.5">
                    Match
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          (score / (rankedResults[0]?.score || 1)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <span className="text-slate-400">→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-800">
          <strong>Note:</strong> This ranking is based on YOUR stated
          priorities, not our recommendation. We filter and sort factual data —
          you make the decision.
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <button
            onClick={handleRetake}
            className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            🔄 Retake Quiz
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            🔍 Search by PIN Code
          </Link>
        </div>
      </div>
    );
  }

  // Question screen
  const question = QUESTIONS[step];

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>
            Question {step + 1} of {QUESTIONS.length}
          </span>
          <span>{Math.round(((step + 1) / QUESTIONS.length) * 100)}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{
              width: `${((step + 1) / QUESTIONS.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question */}
      <h2 className="text-xl font-bold text-slate-900 text-center mb-6">
        {question.text}
      </h2>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option) => (
          <button
            key={option.key}
            onClick={() => handleAnswer(option.weight)}
            className="w-full flex items-center gap-4 p-4 bg-white border-2 border-slate-200 rounded-2xl text-left hover:border-indigo-400 hover:bg-indigo-50 active:scale-[0.98] transition-all"
          >
            <span className="text-2xl flex-shrink-0">{option.icon}</span>
            <span className="text-sm font-medium text-slate-700">
              {option.label}
            </span>
          </button>
        ))}
      </div>

      {/* Skip */}
      {step > 0 && (
        <button
          onClick={() => {
            setStep(step - 1);
            setAnswers(answers.slice(0, -1));
          }}
          className="mt-4 w-full text-center text-sm text-slate-400 hover:text-slate-600"
        >
          ← Previous question
        </button>
      )}
    </div>
  );
}

/* ── Helpers ── */

function getPartyColor(party: string): string {
  const colors: Record<string, string> = {
    BJP: "#FF6B00", INC: "#19AAED", AAP: "#0066B3", TMC: "#2E8B57",
    DMK: "#E30613", "JD(U)": "#137B13", SP: "#FF0000", BSP: "#22409A",
    TDP: "#DAA520", BJD: "#006400",
  };
  return colors[party] || "#6B7280";
}
