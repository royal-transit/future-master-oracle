// lib/future-layer-intelligence.js

import {
  FUTURE_CORE_DOMAINS,
  FUTURE_NOISY_DOMAINS
} from "./future-oracle-contract.js";

const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

function hasAny(text, arr) {
  return arr.some((x) => text.includes(x));
}

export function buildFutureQuestionProfile(question) {
  const q = String(question || "").toLowerCase();

  const primary_domain =
    hasAny(q, ["marriage", "wife", "husband", "bea", "divorce"])
      ? "MARRIAGE"
      : hasAny(q, ["relationship", "love", "partner", "breakup", "affair"])
        ? "RELATIONSHIP"
        : hasAny(q, ["career", "job", "work", "profession"])
          ? "CAREER"
          : hasAny(q, ["business", "trade", "deal", "client"])
            ? "BUSINESS"
            : hasAny(q, ["money", "income", "cash", "debt", "finance"])
              ? "MONEY"
              : hasAny(q, ["foreign", "abroad", "uk", "visa", "migration", "settlement"])
                ? "FOREIGN"
                : hasAny(q, ["health", "disease", "hospital", "stress", "illness"])
                  ? "HEALTH"
                  : hasAny(q, ["property", "land", "house", "home", "flat"])
                    ? "PROPERTY"
                    : hasAny(q, ["legal", "court", "penalty", "case", "authority"])
                      ? "LEGAL"
                      : hasAny(q, ["child", "children", "daughter", "son"])
                        ? "CHILDREN"
                        : "GENERAL";

  return {
    raw_question: question || "",
    primary_domain,
    asks_count: hasAny(q, ["how many", "count", "number", "mot", "koita"]),
    asks_timing: hasAny(q, ["when", "kobe", "date", "time", "window", "month", "year"]),
    asks_status: hasAny(q, ["current", "now", "active", "status", "ongoing"]),
    asks_general: primary_domain === "GENERAL"
  };
}

export function getFutureLinkedDomains(primary) {
  const map = {
    MARRIAGE: [
      "MARRIAGE",
      "RELATIONSHIP",
      "LOVE",
      "DIVORCE",
      "MULTIPLE_MARRIAGE",
      "PARTNERSHIP",
      "CHILDREN",
      "FAMILY",
      "LEGAL"
    ],
    RELATIONSHIP: [
      "RELATIONSHIP",
      "LOVE",
      "MARRIAGE",
      "DIVORCE",
      "PARTNERSHIP",
      "FAMILY"
    ],
    CAREER: [
      "CAREER",
      "JOB",
      "BUSINESS",
      "MONEY",
      "GAIN",
      "REPUTATION",
      "AUTHORITY",
      "SUCCESS",
      "FAILURE"
    ],
    BUSINESS: [
      "BUSINESS",
      "CAREER",
      "JOB",
      "MONEY",
      "GAIN",
      "LOSS",
      "DOCUMENT",
      "LEGAL",
      "REPUTATION"
    ],
    MONEY: [
      "MONEY",
      "GAIN",
      "LOSS",
      "DEBT",
      "CAREER",
      "BUSINESS"
    ],
    FOREIGN: [
      "FOREIGN",
      "SETTLEMENT",
      "IMMIGRATION",
      "VISA",
      "DOCUMENT",
      "PROPERTY",
      "TRAVEL_LONG"
    ],
    HEALTH: [
      "HEALTH",
      "DISEASE",
      "RECOVERY",
      "MENTAL",
      "ACCIDENT",
      "SURGERY"
    ],
    PROPERTY: [
      "PROPERTY",
      "HOME",
      "SETTLEMENT",
      "FOREIGN",
      "VEHICLE",
      "MONEY"
    ],
    LEGAL: [
      "LEGAL",
      "DOCUMENT",
      "AUTHORITY",
      "IMMIGRATION",
      "DEBT",
      "REPUTATION"
    ],
    CHILDREN: [
      "CHILDREN",
      "LOVE",
      "MARRIAGE",
      "FAMILY"
    ],
    GENERAL: [
      "MARRIAGE",
      "RELATIONSHIP",
      "FOREIGN",
      "SETTLEMENT",
      "IMMIGRATION",
      "CAREER",
      "BUSINESS",
      "JOB",
      "MONEY",
      "DEBT",
      "HEALTH",
      "MENTAL",
      "PROPERTY",
      "HOME",
      "LEGAL",
      "DOCUMENT",
      "CHILDREN"
    ]
  };

  return map[primary] || map.GENERAL;
}

function computeFutureStrength(score) {
  if (score >= 9) return "PEAK";
  if (score >= 7) return "HIGH";
  if (score >= 5) return "MODERATE";
  if (score >= 3) return "LOW";
  return "DORMANT";
}

function computeFutureConfidence(score, domainKey, questionProfile, linkedDomains) {
  let confidence = 0;

  if (score >= 8) confidence += 2;
  else if (score >= 5) confidence += 1;

  if (domainKey === questionProfile.primary_domain) confidence += 2;
  if (linkedDomains.includes(domainKey)) confidence += 1;
  if (FUTURE_CORE_DOMAINS.has(domainKey)) confidence += 1;
  if (FUTURE_NOISY_DOMAINS.has(domainKey)) confidence -= 1;

  if (confidence >= 4) return "HIGH";
  if (confidence >= 2) return "MEDIUM";
  return "LOW";
}

export function rankFutureDomains(domainResults, questionProfile) {
  const linkedDomains = getFutureLinkedDomains(questionProfile.primary_domain);

  return domainResults
    .map((d) => {
      let boost = 0;

      if (linkedDomains.includes(d.domain_key)) boost += 2.4;
      if (d.domain_key === questionProfile.primary_domain) boost += 4.5;

      if (questionProfile.primary_domain === "GENERAL") {
        if (FUTURE_NOISY_DOMAINS.has(d.domain_key)) boost -= 2.6;
        if (FUTURE_CORE_DOMAINS.has(d.domain_key)) boost += 1.8;
        if (
          [
            "MARRIAGE",
            "FOREIGN",
            "SETTLEMENT",
            "IMMIGRATION",
            "CAREER",
            "BUSINESS",
            "MONEY",
            "HEALTH",
            "PROPERTY",
            "LEGAL"
          ].includes(d.domain_key)
        ) {
          boost += 1.3;
        }
      }

      const rank_score = round2((d.normalized_score || 0) + boost);
      const future_strength = computeFutureStrength(rank_score);
      const confidence = computeFutureConfidence(
        rank_score,
        d.domain_key,
        questionProfile,
        linkedDomains
      );

      return {
        ...d,
        rank_score,
        future_strength,
        confidence
      };
    })
    .sort((a, b) => b.rank_score - a.rank_score);
}

export function buildTop5FutureDomains(rankedDomains) {
  return rankedDomains
    .filter((d) => d.future_strength !== "DORMANT")
    .slice(0, 5)
    .map((d) => ({
      domain_key: d.domain_key,
      domain_label: d.domain_label,
      strength: d.future_strength,
      confidence: d.confidence,
      rank_score: d.rank_score
    }));
}

export function buildPrimaryFutureDomain(rankedDomains) {
  const top = rankedDomains.find((d) => d.future_strength !== "DORMANT");

  if (!top) {
    return {
      domain_key: "NONE",
      domain_label: "No Strong Domain Detected",
      strength: "DORMANT",
      confidence: "LOW",
      rank_score: 0
    };
  }

  return {
    domain_key: top.domain_key,
    domain_label: top.domain_label,
    strength: top.future_strength,
    confidence: top.confidence,
    rank_score: top.rank_score
  };
}

export function runFutureIntelligenceLayer({ domainResults, question }) {
  const question_profile = buildFutureQuestionProfile(question);
  const linked_domain_expansion = getFutureLinkedDomains(
    question_profile.primary_domain
  );
  const ranked_domains = rankFutureDomains(domainResults, question_profile);
  const top_5_future_domains = buildTop5FutureDomains(ranked_domains);
  const primary_future_domain = buildPrimaryFutureDomain(ranked_domains);

  return {
    question_profile,
    linked_domain_expansion,
    ranked_domains,
    top_5_future_domains,
    primary_future_domain
  };
}