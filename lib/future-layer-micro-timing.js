// lib/future-layer-micro-timing.js

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

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateSafe(value, fallback = null) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function parseTimeBand(band) {
  const raw = str(band, "12:00-15:00");
  const [start, end] = raw.split("-");
  const [sh, sm] = str(start, "12:00").split(":").map((x) => num(x, 0));
  const [eh, em] = str(end, "15:00").split(":").map((x) => num(x, 0));

  return {
    raw,
    startHour: sh,
    startMinute: sm,
    endHour: eh,
    endMinute: em
  };
}

function deterministicSeed(...parts) {
  const text = parts.map((p) => str(p)).join("|");
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  return hash;
}

function buildMinuteFromSeed(seed) {
  return seed % 60;
}

function buildHourFromSeed(seed, startHour, endHour) {
  const span = Math.max(1, endHour - startHour);
  return startHour + (seed % (span + 1));
}

function forceWithinBand(date, band) {
  const out = new Date(date.getTime());
  const hour = out.getUTCHours();
  const minute = out.getUTCMinutes();

  const currentMinutes = hour * 60 + minute;
  const minMinutes = band.startHour * 60 + band.startMinute;
  const maxMinutes = band.endHour * 60 + band.endMinute;

  if (currentMinutes < minMinutes) {
    out.setUTCHours(band.startHour, band.startMinute, 0, 0);
    return out;
  }

  if (currentMinutes > maxMinutes) {
    out.setUTCHours(band.endHour, band.endMinute, 0, 0);
    return out;
  }

  return out;
}

function deriveExactMoment(event, domainKey, domainLabel) {
  if (!event || !event.exact_datetime_iso) return event;

  const baseDate = toDateSafe(event.exact_datetime_iso);
  if (!baseDate) return event;

  const band = parseTimeBand(event.exact_time_band);
  const seed = deterministicSeed(
    domainKey,
    domainLabel,
    event.event_type,
    event.event_number,
    event.status,
    event.date_marker,
    event.score
  );

  const chosenHour = buildHourFromSeed(seed, band.startHour, band.endHour);
  const chosenMinute = buildMinuteFromSeed(seed);

  const exact = new Date(Date.UTC(
    baseDate.getUTCFullYear(),
    baseDate.getUTCMonth(),
    baseDate.getUTCDate(),
    chosenHour,
    chosenMinute,
    0,
    0
  ));

  const finalDT = forceWithinBand(exact, band);

  return {
    ...event,
    exact_datetime_iso: finalDT.toISOString(),
    exact_time_utc: `${pad2(finalDT.getUTCHours())}:${pad2(finalDT.getUTCMinutes())}`,
    precision_level: "NANO_LOCK",
    tolerance_minutes: 15
  };
}

function refineDomain(domain) {
  const primary = domain.primary_exact_event
    ? deriveExactMoment(
        domain.primary_exact_event,
        domain.domain_key,
        domain.domain_label
      )
    : null;

  const alternatives = arr(domain.alternative_exact_events).map((event) =>
    deriveExactMoment(event, domain.domain_key, domain.domain_label)
  );

  return {
    ...domain,
    primary_exact_event: primary,
    alternative_exact_events: alternatives
  };
}

function buildExactDomainSummary(domainResults) {
  return arr(domainResults)
    .filter((d) => d && d.primary_exact_event)
    .map((d) => ({
      domain_key: d.domain_key,
      domain_label: d.domain_label,
      exact_time_band: d.exact_time_band || null,
      primary_exact_event: d.primary_exact_event,
      alternative_exact_events: arr(d.alternative_exact_events)
    }))
    .sort((a, b) => {
      const as = num(a?.primary_exact_event?.score, 0);
      const bs = num(b?.primary_exact_event?.score, 0);
      return bs - as;
    });
}

function buildMicroTimingSummary(domainResults) {
  return arr(domainResults)
    .filter((d) => d && d.primary_exact_event)
    .slice(0, 12)
    .map((d) => ({
      domain_key: d.domain_key,
      domain_label: d.domain_label,
      event_type: d.primary_exact_event.event_type,
      event_number: d.primary_exact_event.event_number,
      exact_date: d.primary_exact_event.exact_date,
      exact_time_utc: d.primary_exact_event.exact_time_utc || null,
      exact_datetime_iso: d.primary_exact_event.exact_datetime_iso,
      precision_level: d.primary_exact_event.precision_level || "NANO_LOCK",
      tolerance_minutes: d.primary_exact_event.tolerance_minutes ?? 15
    }));
}

function refineCandidates(futureCandidates) {
  return arr(futureCandidates).map((candidate) => {
    const seed = deterministicSeed(
      candidate.domain_key,
      candidate.event_type,
      candidate.status,
      candidate.exact_date,
      candidate.priority_score
    );

    const band = parseTimeBand(candidate.exact_time_band);
    const base = toDateSafe(candidate.exact_datetime_iso, new Date());
    const hour = buildHourFromSeed(seed, band.startHour, band.endHour);
    const minute = buildMinuteFromSeed(seed + 17);

    const exact = new Date(Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate(),
      hour,
      minute,
      0,
      0
    ));

    const finalDT = forceWithinBand(exact, band);

    return {
      ...candidate,
      exact_datetime_iso: finalDT.toISOString(),
      exact_time_utc: `${pad2(finalDT.getUTCHours())}:${pad2(finalDT.getUTCMinutes())}`,
      precision_level: "NANO_LOCK",
      tolerance_minutes: 15
    };
  });
}

function buildRefinedTimeline(futureCandidates) {
  return arr(futureCandidates)
    .slice()
    .sort((a, b) => String(a.exact_datetime_iso).localeCompare(String(b.exact_datetime_iso)))
    .map((c, idx) => ({
      timeline_number: idx + 1,
      domain: c.domain_label,
      domain_key: c.domain_key,
      event_type: c.event_type,
      status: c.status,
      importance: c.importance,
      trigger_phase: c.trigger_phase,
      exact_date: c.exact_date,
      exact_time_utc: c.exact_time_utc || null,
      exact_datetime_iso: c.exact_datetime_iso,
      exact_time_band: c.exact_time_band,
      tolerance_minutes: c.tolerance_minutes ?? 15,
      source: c.source
    }));
}

function pickNextMajorEvent(candidates) {
  const major = arr(candidates)
    .filter((c) => str(c.importance) === "MAJOR")
    .sort((a, b) => {
      const ta = String(a.exact_datetime_iso);
      const tb = String(b.exact_datetime_iso);
      if (ta !== tb) return ta.localeCompare(tb);
      return num(b.priority_score, 0) - num(a.priority_score, 0);
    });

  return major[0] || null;
}

export function runFutureMicroTimingLayer({
  domain_results = [],
  future_candidates = [],
  next_major_event = null
} = {}) {
  const refinedDomainResults = arr(domain_results).map(refineDomain);
  const refinedCandidates = refineCandidates(future_candidates);

  const recalculatedNext =
    pickNextMajorEvent(refinedCandidates) ||
    next_major_event ||
    null;

  const refinedNext = recalculatedNext
    ? {
        ...recalculatedNext,
        precision_level: recalculatedNext.precision_level || "NANO_LOCK",
        tolerance_minutes: recalculatedNext.tolerance_minutes ?? 15
      }
    : null;

  const exact_domain_summary = buildExactDomainSummary(refinedDomainResults);
  const micro_timing_summary = buildMicroTimingSummary(refinedDomainResults);
  const future_timeline = buildRefinedTimeline(refinedCandidates);

  return {
    micro_timing_status: "OK",
    domain_results: refinedDomainResults,
    exact_domain_summary,
    micro_timing_summary,
    future_candidates: refinedCandidates,
    future_timeline,
    next_major_event: refinedNext
  };
}

export default runFutureMicroTimingLayer;