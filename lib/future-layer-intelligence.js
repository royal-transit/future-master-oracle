// lib/future-layer-intelligence.js

const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

const asArray = (v) => (Array.isArray(v) ? v : []);

function hasAny(text, arr) {
  return arr.some((x) => text.includes(x));
}

export function buildQuestionProfile(question) {
  const q = String(question || "").toLowerCase();

  const primary_domain =
    hasAny(q, ["marriage", "bea", "wife", "husband", "divorce"])
      ? "MARRIAGE"
      : hasAny(q, ["relationship", "love"])
        ? "RELATIONSHIP"
        : hasAny(q, ["career", "job", "business"])
          ? "CAREER"
          : hasAny(q, ["money", "income", "debt"])
            ? "MONEY"
            : hasAny(q, ["foreign", "visa", "abroad"])
              ? "FOREIGN"
              : hasAny(q, ["health", "disease"])
                ? "HEALTH"
                : "GENERAL";

  return {
    raw_question: question || "",
    primary_domain
  };
}

export function runFutureIntelligenceLayer({
  domainResults,
  question
}) {
  // 🔒 CRITICAL FIX
  const safeDomains = asArray(domainResults);

  const questionProfile = buildQuestionProfile(question);

  const rankedDomains = safeDomains
    .map((d) => ({
      ...d,
      rank_score: round2(d?.normalized_score || 0)
    }))
    .sort((a, b) => b.rank_score - a.rank_score);

  const winner = rankedDomains[0] || null;

  const winner_lock = winner
    ? {
        lock_state: "HARD_LOCK",
        winning_domain_key: winner.domain_key,
        winning_domain_label: winner.domain_label,
        winning_event_type: winner.events?.[0]?.event_type || null,
        winning_event_status: winner.events?.[0]?.status || null
      }
    : {
        lock_state: "NO_LOCK"
      };

  return {
    question_profile: questionProfile,
    linked_domain_expansion: [],
    ranked_domains: rankedDomains,
    winner_lock,
    carryover: {
      present_carryover_detected: false,
      carryover_domains: []
    }
  };
}