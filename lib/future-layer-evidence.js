// lib/future-layer-evidence.js

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function safeString(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function countBy(items, predicate) {
  return safeArray(items).filter(predicate).length;
}

function uniqTopDomainsFromTimeline(timeline, limit = 5) {
  const seen = new Set();
  const result = [];

  for (const item of safeArray(timeline)) {
    const label = item?.domain || item?.domain_label || item?.domain_key;
    if (!label) continue;
    if (seen.has(label)) continue;
    seen.add(label);
    result.push(label);
    if (result.length >= limit) break;
  }

  return result;
}

function buildPrimaryDomain(questionProfile, nextMajorEvent, topRankedDomains) {
  if (nextMajorEvent?.domain_key) return nextMajorEvent.domain_key;
  if (nextMajorEvent?.domain_label) return nextMajorEvent.domain_label;
  if (questionProfile?.primary_domain && questionProfile.primary_domain !== "FUTURE") {
    return questionProfile.primary_domain;
  }
  const first = safeArray(topRankedDomains)[0];
  return first?.domain_key || first?.domain_label || "GENERAL";
}

function buildLokkotha(primaryDomain, nextMajorEvent, majorCount, brokenCount) {
  const pd = safeString(primaryDomain, "future").toLowerCase();
  const date = nextMajorEvent?.exact_date || "তারিখ এখনও কুয়াশায়";
  const time = nextMajorEvent?.exact_time_utc || nextMajorEvent?.exact_time_band || "সময় এখনও চুপে";
  const eventType =
    nextMajorEvent?.event_type ||
    nextMajorEvent?.domain_label ||
    nextMajorEvent?.domain ||
    "পরের ঘটনা";

  return (
    `${pd}-এর পথ এখন শুকনো না; ` +
    `${date} তারিখে ${eventType} মাথা তোলে। ` +
    `সময় ধরা আছে ${time}। ` +
    `বড় সিগন্যাল ${majorCount}, ভাঙা ছাপ ${brokenCount}।`
  );
}

export default function runFutureEvidenceLayer({
  input,
  facts,
  question_profile,
  ranked_domains,
  next_major_event,
  future_timeline
}) {
  const safeInput = safeObject(input);
  const safeFacts = safeObject(facts);
  const safeQuestionProfile = safeObject(question_profile);
  const safeRankedDomains = safeArray(ranked_domains);
  const safeTimeline = safeArray(future_timeline);
  const safeNext = safeObject(next_major_event);

  const total_major_events = countBy(
    safeTimeline,
    (e) => e?.importance === "MAJOR"
  );

  const total_minor_events = countBy(
    safeTimeline,
    (e) => e?.importance === "MINOR"
  );

  const total_broken_events = countBy(
    safeTimeline,
    (e) => e?.status === "BROKEN"
  );

  const total_active_events = countBy(
    safeTimeline,
    (e) =>
      e?.status === "ACTIVE" ||
      e?.status === "BUILDING" ||
      e?.status === "OPENING" ||
      e?.status === "STABILISING"
  );

  const primary_domain = buildPrimaryDomain(
    safeQuestionProfile,
    safeNext,
    safeRankedDomains
  );

  const event_summary = {
    total_estimated_events: safeTimeline.length,
    total_major_events,
    total_minor_events,
    total_broken_events,
    total_active_events,
    next_major_domain:
      safeNext.domain ||
      safeNext.domain_label ||
      safeNext.domain_key ||
      "UNKNOWN",
    next_major_event_type:
      safeNext.event_type ||
      safeNext.domain_label ||
      safeNext.domain_key ||
      "UNKNOWN",
    next_major_date: safeNext.exact_date || null,
    next_major_time_utc: safeNext.exact_time_utc || null,
    top_5_domains:
      uniqTopDomainsFromTimeline(safeTimeline, 5).length > 0
        ? uniqTopDomainsFromTimeline(safeTimeline, 5)
        : safeRankedDomains.slice(0, 5).map((d) => d.domain_label || d.domain_key || "UNKNOWN")
  };

  const validation_block = {
    reality_validation_active: Boolean(safeFacts.provided),
    has_next_major_event: Boolean(Object.keys(safeNext).length > 0),
    next_major_has_exact_date: Boolean(safeNext.exact_date),
    next_major_has_exact_time: Boolean(safeNext.exact_time_utc),
    next_major_has_precision: Boolean(safeNext.precision_level),
    timeline_present: safeTimeline.length > 0
  };

  const forensic_verdict = {
    forensic_direction:
      `${primary_domain} scan shows ` +
      `${event_summary.total_major_events} major future signatures, ` +
      `${event_summary.total_broken_events} broken residues, and ` +
      `${event_summary.total_active_events} active build lines.`,
    validation_state:
      validation_block.has_next_major_event &&
      validation_block.next_major_has_exact_date &&
      validation_block.next_major_has_exact_time &&
      validation_block.timeline_present
        ? "STABLE"
        : "PARTIAL",
    resolved_primary_domain: primary_domain
  };

  const lokkotha_summary = {
    text: buildLokkotha(
      primary_domain,
      safeNext,
      event_summary.total_major_events,
      event_summary.total_broken_events
    )
  };

  const project_paste_block = [
    "FUTURE UNIVERSAL NANO BLOCK",
    `Subject: ${safeInput.name || "UNKNOWN"}`,
    `Primary Domain: ${primary_domain}`,
    `Top Domains: ${event_summary.top_5_domains.join(" | ")}`,
    `Total Estimated Events: ${event_summary.total_estimated_events}`,
    `Total Major Events: ${event_summary.total_major_events}`,
    `Total Minor Events: ${event_summary.total_minor_events}`,
    `Total Broken Events: ${event_summary.total_broken_events}`,
    `Total Active Events: ${event_summary.total_active_events}`,
    `Next Major Domain: ${event_summary.next_major_domain}`,
    `Next Major Event: ${event_summary.next_major_event_type}`,
    `Next Major Date: ${event_summary.next_major_date || "UNKNOWN"}`,
    `Next Major Time UTC: ${event_summary.next_major_time_utc || "UNKNOWN"}`,
    `Validation State: ${forensic_verdict.validation_state}`,
    `Direction: ${forensic_verdict.forensic_direction}`,
    `Lokkotha: ${lokkotha_summary.text}`,
    "FUTURE UNIVERSAL NANO BLOCK END"
  ].join("\n");

  return {
    event_summary,
    validation_block,
    forensic_verdict,
    lokkotha_summary,
    project_paste_block,
    resolved_primary_domain: primary_domain
  };
}