// lib/future-layer-evidence.js

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v, fallback = "") {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

function arr(v) {
  return Array.isArray(v) ? v : [];
}

function obj(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

function getLastByStatus(events, statuses) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (statuses.includes(events[i].status)) return events[i];
  }
  return null;
}

function buildEventSummary(domain_results) {
  const domains = arr(domain_results);

  const marriageDomain = domains.find((d) => d.domain_key === "MARRIAGE");

  const marriageEvents =
    arr(marriageDomain?.events).filter((e) => e.event_type.includes("marriage"));

  const activeMarriage = getLastByStatus(marriageEvents, ["ACTIVE", "STABILISING", "BUILDING"]);

  return {
    total_domains_scanned: domains.length,
    total_major_events: domains.reduce((a, b) => a + num(b.major_event_count), 0),
    total_active_events: domains.reduce((a, b) => a + num(b.active_event_count), 0),
    total_broken_events: domains.reduce((a, b) => a + num(b.broken_event_count), 0),

    marriage_count: marriageEvents.length,
    broken_marriage_count: marriageEvents.filter((e) => e.status === "BROKEN").length,
    current_marriage_status:
      activeMarriage?.status ||
      marriageEvents[marriageEvents.length - 1]?.status ||
      "UNKNOWN"
  };
}

function buildValidation(facts, summary) {
  return {
    marriage_fact_match:
      facts?.marriage_count_claim == null
        ? "NOT_PROVIDED"
        : facts.marriage_count_claim === summary.marriage_count
          ? "EXACT"
          : "CONFLICT",

    broken_marriage_fact_match:
      facts?.broken_marriage_claim == null
        ? "NOT_PROVIDED"
        : facts.broken_marriage_claim === summary.broken_marriage_count
          ? "EXACT"
          : "CONFLICT"
  };
}

function buildLokkotha(nextEvent, summary) {
  if (!nextEvent) {
    return {
      text: "সময় দাঁড়িয়ে নেই, কিন্তু সংকেত এখনো জাগেনি।"
    };
  }

  return {
    text:
      `${str(nextEvent.domain_label)}-এর ঘড়ি বাজবে ${nextEvent.exact_date} তারিখে, ` +
      `${nextEvent.exact_time_utc || "সময় নির্দিষ্ট"}, ` +
      `এর আগে পথ পরিষ্কার হচ্ছে—বড় সিগন্যাল ${summary.total_major_events}, ` +
      `ভাঙা চিহ্ন ${summary.total_broken_events}।`
  };
}

function buildForensicVerdict(question_profile, nextEvent, summary) {
  return {
    outcome:
      nextEvent ? "EVENT_CONFIRMED" : "NO_CLEAR_EVENT",

    primary_domain: question_profile.primary_domain,

    next_event_domain: nextEvent?.domain_label || "UNKNOWN",

    event_time:
      nextEvent
        ? `${nextEvent.exact_date} ${nextEvent.exact_time_utc || ""}`
        : "UNKNOWN",

    direction:
      nextEvent
        ? `${question_profile.primary_domain} signal active with ${summary.total_major_events} major triggers.`
        : "No strong forward trigger detected."
  };
}

function buildProjectBlock({
  input,
  question_profile,
  ranked_domains,
  next_event,
  summary,
  lokkotha
}) {
  return [
    "FUTURE UNIVERSAL NANO SCAN BLOCK",

    `Subject: ${input.name || "UNKNOWN"}`,
    `Primary Domain: ${question_profile.primary_domain}`,

    `Top Domains: ${arr(ranked_domains).slice(0, 6).map((d) => d.domain_label).join(" | ")}`,

    `Total Major Events: ${summary.total_major_events}`,
    `Total Active Events: ${summary.total_active_events}`,
    `Total Broken Events: ${summary.total_broken_events}`,

    `Marriage Count: ${summary.marriage_count}`,
    `Broken Marriage Count: ${summary.broken_marriage_count}`,
    `Current Marriage Status: ${summary.current_marriage_status}`,

    `Next Event Domain: ${next_event?.domain_label || "UNKNOWN"}`,
    `Next Event Date: ${next_event?.exact_date || "UNKNOWN"}`,
    `Next Event Time: ${next_event?.exact_time_utc || "UNKNOWN"}`,

    `Direction: ${question_profile.primary_domain}`,
    `Lokkotha: ${lokkotha.text}`,

    "FUTURE UNIVERSAL NANO SCAN BLOCK END"
  ].join("\n");
}

export function runFutureEvidenceLayer({
  input = {},
  facts = {},
  question_profile = {},
  ranked_domains = [],
  next_major_event = null
} = {}) {
  const summary = buildEventSummary(ranked_domains);
  const validation = buildValidation(facts, summary);
  const lokkotha = buildLokkotha(next_major_event, summary);
  const verdict = buildForensicVerdict(question_profile, next_major_event, summary);

  const project_block = buildProjectBlock({
    input,
    question_profile,
    ranked_domains,
    next_event: next_major_event,
    summary,
    lokkotha
  });

  return {
    evidence_status: "OK",
    event_summary: summary,
    validation_block: validation,
    forensic_verdict: verdict,
    lokkotha_summary: lokkotha,
    project_paste_block: project_block
  };
}

export default runFutureEvidenceLayer;