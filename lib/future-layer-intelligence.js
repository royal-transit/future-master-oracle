// lib/future-layer-intelligence.js

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export default function runFutureIntelligenceLayer({
  domain_results,
  top_ranked_domains,
  question_profile
}) {
  const safeQuestionProfile = safeObject(question_profile);
  const primary_domain =
    safeQuestionProfile.primary_domain ||
    "GENERAL";

  const safeDomainResults = safeArray(domain_results);
  const safeTopRankedDomains = safeArray(top_ranked_domains);

  const ranked_domains =
    safeTopRankedDomains.length > 0 ? safeTopRankedDomains : safeDomainResults;

  const current_carryover = {
    present_carryover_detected: safeDomainResults.some(
      (d) => d?.present_carryover === "YES"
    ),
    carryover_domains: safeDomainResults
      .filter((d) => d?.present_carryover === "YES")
      .slice(0, 8)
      .map((d) => ({
        domain: d.domain_label,
        residual_impact: d.residual_impact || "LOW"
      }))
  };

  return {
    intelligence_status: "OK",
    question_profile: {
      raw_question: safeQuestionProfile.raw_question || "",
      asks_count: Boolean(safeQuestionProfile.asks_count),
      asks_timing:
        safeQuestionProfile.asks_timing !== undefined
          ? Boolean(safeQuestionProfile.asks_timing)
          : true,
      asks_status: Boolean(safeQuestionProfile.asks_status),
      asks_general:
        safeQuestionProfile.asks_general !== undefined
          ? Boolean(safeQuestionProfile.asks_general)
          : false,
      primary_domain
    },
    primary_domain,
    ranked_domains,
    top_ranked_domains: ranked_domains.slice(0, 12),
    domain_results: safeDomainResults,
    current_carryover
  };
}