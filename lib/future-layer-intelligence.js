// lib/future-layer-intelligence.js

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function scoreBoostFromTimeline(domain, timeline) {
  const domainKey = domain?.domain_key;
  if (!domainKey) return 0;

  let boost = 0;

  for (const item of safeArray(timeline)) {
    if (item?.domain_key !== domainKey) continue;

    if (item?.timeline_number === 1) boost += 8;
    if (item?.timeline_number === 2) boost += 5;
    if (item?.timeline_number === 3) boost += 3;

    if (item?.importance === "MAJOR") boost += 2;
    if (
      item?.status === "BUILDING" ||
      item?.status === "OPENING" ||
      item?.status === "STABILISING" ||
      item?.status === "ACTIVE"
    ) {
      boost += 1;
    }
  }

  return boost;
}

function resolvePrimaryDomain(questionProfile, timeline, rankedDomains) {
  const qpd = questionProfile?.primary_domain;
  const firstTimeline = safeArray(timeline)[0];
  if (firstTimeline?.domain_key) return firstTimeline.domain_key;
  if (qpd && qpd !== "FUTURE") return qpd;
  const firstRanked = safeArray(rankedDomains)[0];
  return firstRanked?.domain_key || "GENERAL";
}

export default function runFutureIntelligenceLayer({
  domain_results,
  top_ranked_domains,
  question_profile,
  future_timeline
}) {
  const safeQuestionProfile = safeObject(question_profile);
  const safeDomainResults = safeArray(domain_results);
  const safeTimeline = safeArray(future_timeline);

  const baseDomains =
    safeArray(top_ranked_domains).length > 0
      ? safeArray(top_ranked_domains)
      : safeDomainResults;

  const ranked_domains = baseDomains
    .map((d) => {
      const boost = scoreBoostFromTimeline(d, safeTimeline);
      const baseScore = Number(d?.rank_score || d?.normalized_score || 0);

      return {
        ...d,
        rank_score: Number((baseScore + boost).toFixed(2)),
        normalized_score: Number((Number(d?.normalized_score || baseScore) + boost).toFixed(2))
      };
    })
    .sort((a, b) => Number(b.rank_score || 0) - Number(a.rank_score || 0));

  const resolved_primary_domain = resolvePrimaryDomain(
    safeQuestionProfile,
    safeTimeline,
    ranked_domains
  );

  const current_carryover = {
    present_carryover_detected: safeDomainResults.some((d) => d?.present_carryover === "YES"),
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
      primary_domain: resolved_primary_domain
    },
    primary_domain: resolved_primary_domain,
    ranked_domains,
    top_ranked_domains: ranked_domains.slice(0, 12),
    domain_results: safeDomainResults,
    current_carryover
  };
}