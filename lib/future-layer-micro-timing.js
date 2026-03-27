// lib/future-layer-micro-timing.js

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function deterministicWeekday(exactDate) {
  if (!exactDate) return null;
  const d = new Date(`${exactDate}T00:00:00.000Z`);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    timeZone: "UTC"
  });
}

function enrichEvent(event, stableSeed, index) {
  const safeEvent = safeObject(event);
  const exactDate = safeEvent.exact_date || null;
  const exactTimeUtc = safeEvent.exact_time_utc || null;

  return {
    ...safeEvent,
    exact_weekday: deterministicWeekday(exactDate),
    exact_datetime_iso:
      safeEvent.exact_datetime_iso ||
      (exactDate && exactTimeUtc ? `${exactDate}T${exactTimeUtc}:00.000Z` : null),
    exact_time_band: safeEvent.exact_time_band || "12:00-15:00",
    priority_score:
      safeEvent.priority_score !== undefined
        ? Number(safeEvent.priority_score)
        : Number((((stableSeed || 1) % 100) / 20 + 4 + index * 0.01).toFixed(2)),
    tolerance_days: 2,
    precision_level: "NANO_LOCK",
    tolerance_minutes:
      safeEvent.tolerance_minutes !== undefined ? safeEvent.tolerance_minutes : 15
  };
}

export default function runFutureMicroTimingLayer({
  domain_results,
  future_candidates,
  next_major_event,
  stable_seed
}) {
  const safeDomainResults = safeArray(domain_results);
  const safeCandidates = safeArray(future_candidates);
  const safeNext = safeObject(next_major_event);

  const stableNextMajorEvent = enrichEvent(safeNext, stable_seed, 0);

  const alternative_exact_events = safeCandidates
    .slice(1, 3)
    .map((candidate, idx) => {
      const found = safeDomainResults.find((d) => d?.domain_key === candidate.domain_key) || {};
      return {
        domain: found.domain_label || candidate.domain_key,
        domain_key: candidate.domain_key,
        event_type: found.primary_exact_event?.event_type || null,
        candidate_score: Number(candidate.candidate_score || 0),
        exact_time_band: "12:00-15:00"
      };
    });

  const exact_domain_summary = [
    {
      domain_key: stableNextMajorEvent.domain_key || "GENERAL",
      domain_label:
        stableNextMajorEvent.domain_label ||
        stableNextMajorEvent.domain ||
        stableNextMajorEvent.domain_key ||
        "General",
      exact_time_band: stableNextMajorEvent.exact_time_band || "12:00-15:00",
      primary_exact_event: stableNextMajorEvent,
      alternative_exact_events
    }
  ];

  const micro_timing_summary = [
    {
      scan_mode: "DETERMINISTIC_MICRO_LOCK",
      stable_seed: stable_seed || 1,
      selected_domain: stableNextMajorEvent.domain_key || "GENERAL",
      selected_domain_label:
        stableNextMajorEvent.domain_label ||
        stableNextMajorEvent.domain ||
        stableNextMajorEvent.domain_key ||
        "General",
      selected_date: stableNextMajorEvent.exact_date || null,
      selected_time_utc: stableNextMajorEvent.exact_time_utc || null,
      selected_weekday: stableNextMajorEvent.exact_weekday || null,
      precision_level: stableNextMajorEvent.precision_level || "NANO_LOCK",
      tolerance_minutes: stableNextMajorEvent.tolerance_minutes || 15
    }
  ];

  return {
    micro_timing_status: "OK",
    domain_results: safeDomainResults,
    exact_domain_summary,
    micro_timing_summary,
    next_major_event: stableNextMajorEvent,
    future_timeline: []
  };
}