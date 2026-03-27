// lib/future-layer-evidence.js

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function pickTopDomains(ranked_domains, limit = 5) {
  return safeArray(ranked_domains)
    .slice(0, limit)
    .map((d) => d.domain_label || d.domain_key || "UNKNOWN");
}

function formatEventLabel(event) {
  if (!event) return "unknown event";
  return (
    event.event_type ||
    event.domain_label ||
    event.domain_key ||
    "unknown event"
  );
}

function buildLokkotha(primary_domain, next_major_event, total_major_events) {
  const domain = String(primary_domain || "future").toLowerCase();
  const exactDate = next_major_event?.exact_date || "তারিখ ধরা আছে";
  const timeBand = next_major_event?.exact_time_band || "সময় ধরা আছে";
  const eventLabel = formatEventLabel(next_major_event);

  return (
    `${domain}-এর রাস্তা ফাঁকা নয়; ` +
    `আগের ঢেউ পেরিয়ে পরের দাগ ${exactDate}-এ উঠে। ` +
    `${eventLabel} চুপে চুপে পাকে, ` +
    `ঘড়ির কাঁটা ${timeBand}-এর ভেতরেই তার দরজা খোলে। ` +
    `মোট বড় সংকেত এখন ${total_major_events}টি।`
  );
}

export default function runFutureEvidenceLayer({
  input,
  facts,
  question_profile,
  ranked_domains,
  next_major_event
}) {
  const safeInput = safeObject(input);
  const safeFacts = safeObject(facts);
  const safeQuestionProfile = safeObject(question_profile);
  const safeRankedDomains = safeArray(ranked_domains);
  const safeNextMajorEvent = safeObject(next_major_event);

  const total_major_events = safeRankedDomains.reduce(
    (sum, d) => sum + Number(d?.major_event_count || 0),
    0
  );

  const total_minor_events = safeRankedDomains.reduce(
    (sum, d) => sum + Number(d?.minor_event_count || 0),
    0
  );

  const total_broken_events = safeRankedDomains.reduce(
    (sum, d) => sum + Number(d?.broken_event_count || 0),
    0
  );

  const total_active_events = safeRankedDomains.reduce(
    (sum, d) => sum + Number(d?.active_event_count || 0),
    0
  );

  const event_summary = {
    total_estimated_events:
      total_major_events + total_minor_events,
    total_major_events,
    total_minor_events,
    total_broken_events,
    total_active_events,
    next_major_domain:
      safeNextMajorEvent.domain_label ||
      safeNextMajorEvent.domain ||
      safeNextMajorEvent.domain_key ||
      "UNKNOWN",
    next_major_event_type: formatEventLabel(safeNextMajorEvent),
    next_major_date: safeNextMajorEvent.exact_date || null,
    next_major_time_utc: safeNextMajorEvent.exact_time_utc || null,
    top_5_domains: pickTopDomains(safeRankedDomains, 5)
  };

  const validation_block = {
    reality_validation_active: Boolean(safeFacts.provided),
    has_next_major_event: Boolean(
      safeNextMajorEvent && Object.keys(safeNextMajorEvent).length
    ),
    next_major_has_exact_date: Boolean(safeNextMajorEvent.exact_date),
    next_major_has_exact_time: Boolean(safeNextMajorEvent.exact_time_utc),
    next_major_has_precision: Boolean(safeNextMajorEvent.precision_level)
  };

  const forensic_verdict = {
    forensic_direction:
      `${safeQuestionProfile.primary_domain || "FUTURE"} scan shows ` +
      `${event_summary.total_major_events} major future signatures, ` +
      `${event_summary.total_broken_events} broken residues, and ` +
      `${event_summary.total_active_events} active build lines.`,
    validation_state:
      validation_block.has_next_major_event &&
      validation_block.next_major_has_exact_date &&
      validation_block.next_major_has_exact_time
        ? "STABLE"
        : "PARTIAL"
  };

  const lokkotha_summary = {
    text: buildLokkotha(
      safeQuestionProfile.primary_domain || "FUTURE",
      safeNextMajorEvent,
      event_summary.total_major_events
    )
  };

  const project_paste_block = [
    "FUTURE UNIVERSAL NANO BLOCK",
    `Subject: ${safeInput.name || "UNKNOWN"}`,
    `Primary Domain: ${safeQuestionProfile.primary_domain || "FUTURE"}`,
    `Top Domains: ${event_summary.top_5_domains.join(" | ")}`,
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
    project_paste_block
  };
}