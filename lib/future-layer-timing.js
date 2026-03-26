// lib/future-layer-timing.js

const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

const MONTH_INDEX = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

function normalizeText(v) {
  return String(v || "").toLowerCase().trim();
}

function safeDate(dateLike) {
  const d = new Date(dateLike);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoDate(dateObj) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return null;
  return `${dateObj.getUTCFullYear()}-${pad2(dateObj.getUTCMonth() + 1)}-${pad2(dateObj.getUTCDate())}`;
}

function addDaysUTC(dateObj, days) {
  const d = new Date(Date.UTC(
    dateObj.getUTCFullYear(),
    dateObj.getUTCMonth(),
    dateObj.getUTCDate(),
    dateObj.getUTCHours(),
    dateObj.getUTCMinutes(),
    dateObj.getUTCSeconds()
  ));
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d;
}

function monthNameToNumber(monthName) {
  return MONTH_INDEX[normalizeText(monthName)] || null;
}

function extractStructuredDateCandidates(text) {
  const raw = String(text || "");
  const lower = normalizeText(raw);
  const candidates = [];

  // YYYY-MM-DD
  for (const m of lower.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)) {
    candidates.push({
      year: Number(m[1]),
      month: Number(m[2]),
      day: Number(m[3]),
      precision: "DAY"
    });
  }

  // DD/MM/YYYY or D/M/YYYY
  for (const m of lower.matchAll(/\b(\d{1,2})[\/](\d{1,2})[\/](20\d{2})\b/g)) {
    candidates.push({
      year: Number(m[3]),
      month: Number(m[2]),
      day: Number(m[1]),
      precision: "DAY"
    });
  }

  // DD-MM-YYYY
  for (const m of lower.matchAll(/\b(\d{1,2})-(\d{1,2})-(20\d{2})\b/g)) {
    candidates.push({
      year: Number(m[3]),
      month: Number(m[2]),
      day: Number(m[1]),
      precision: "DAY"
    });
  }

  // Month DD YYYY
  for (const m of lower.matchAll(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s+(20\d{2})\b/g
  )) {
    candidates.push({
      year: Number(m[3]),
      month: monthNameToNumber(m[1]),
      day: Number(m[2]),
      precision: "DAY"
    });
  }

  // DD Month YYYY
  for (const m of lower.matchAll(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(20\d{2})\b/g
  )) {
    candidates.push({
      year: Number(m[3]),
      month: monthNameToNumber(m[2]),
      day: Number(m[1]),
      precision: "DAY"
    });
  }

  // Month YYYY
  for (const m of lower.matchAll(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(20\d{2})\b/g
  )) {
    candidates.push({
      year: Number(m[2]),
      month: monthNameToNumber(m[1]),
      day: null,
      precision: "MONTH"
    });
  }

  // Bare future years
  for (const m of lower.matchAll(/\b(20\d{2})\b/g)) {
    candidates.push({
      year: Number(m[1]),
      month: null,
      day: null,
      precision: "YEAR"
    });
  }

  return candidates.filter((c) => c.year >= 2024 && c.year <= 2036);
}

function eventStatusWeight(status) {
  const s = String(status || "").toUpperCase();

  if (s === "PROMISED") return 5.0;
  if (s === "FORMING") return 4.8;
  if (s === "PENDING") return 4.6;
  if (s === "BUILDING") return 4.2;
  if (s === "APPROACHING") return 4.0;
  if (s === "ACTIVE") return 3.2;
  if (s === "STABILISING") return 2.8;
  if (s === "EXECUTED") return 0.8;
  if (s === "BROKEN" || s === "FAILED" || s === "DENIED") return -1.5;

  return 0.6;
}

function eventImportanceWeight(importance) {
  const i = String(importance || "").toUpperCase();
  if (i === "MAJOR") return 2.2;
  if (i === "MINOR") return 0.6;
  return 0.2;
}

function evidenceWeight(evidenceStrength) {
  const e = normalizeText(evidenceStrength);
  if (e === "strong") return 1.9;
  if (e === "moderate") return 1.0;
  if (e === "weak") return 0.3;
  return 0.1;
}

function domainDensityWeight(density) {
  const d = normalizeText(density);
  if (d === "high") return 1.1;
  if (d === "medium" || d === "med") return 0.6;
  if (d === "low") return 0.2;
  return 0;
}

function buildDateFromParts(year, month, day) {
  if (!year) return null;

  const safeMonth = month || 6;
  const safeDay = day || 15;

  const d = new Date(Date.UTC(year, safeMonth - 1, safeDay, 12, 0, 0));
  if (Number.isNaN(d.getTime())) return null;

  // validate rollover
  if (d.getUTCFullYear() !== year) return null;
  if (month && d.getUTCMonth() + 1 !== month) return null;
  if (day && d.getUTCDate() !== day) return null;

  return d;
}

function inferFallbackDateFromYear(event, nowDate) {
  const dateMarker = Number(event.date_marker || event.exact_year || 0);
  if (!dateMarker || dateMarker < nowDate.getUTCFullYear()) return null;

  const eventNum = Number(event.event_number || 1);
  const fallbackMonth = Math.min(12, Math.max(1, 2 + eventNum * 2));
  const fallbackDay = Math.min(28, 8 + eventNum * 3);

  return buildDateFromParts(dateMarker, fallbackMonth, fallbackDay);
}

function buildEventDateCandidates(event, domain, nowDate) {
  const textBlob = [
    event.event_type,
    event.trigger_phase,
    event.summary,
    event.description,
    event.projected_window,
    event.predicted_window,
    event.window_text,
    domain.domain_label,
    domain.domain_key
  ]
    .filter(Boolean)
    .join(" ");

  const parsed = extractStructuredDateCandidates(textBlob);
  const candidates = [];

  parsed.forEach((c) => {
    const dateObj = buildDateFromParts(c.year, c.month, c.day);
    if (!dateObj) return;

    let precisionBoost = 0;
    if (c.precision === "DAY") precisionBoost = 2.1;
    else if (c.precision === "MONTH") precisionBoost = 1.1;
    else if (c.precision === "YEAR") precisionBoost = 0.4;

    candidates.push({
      source: "PARSED_TEXT",
      precision: c.precision,
      date_obj: dateObj,
      iso_date: toIsoDate(dateObj),
      score_boost: precisionBoost
    });
  });

  const fallback = inferFallbackDateFromYear(event, nowDate);
  if (fallback) {
    candidates.push({
      source: "DATE_MARKER_FALLBACK",
      precision: "YEAR",
      date_obj: fallback,
      iso_date: toIsoDate(fallback),
      score_boost: 0.5
    });
  }

  return candidates.filter((c) => c.iso_date);
}

function buildCandidateScore({
  event,
  domain,
  candidate,
  questionProfile,
  winnerLock,
  currentDate
}) {
  let score = 0;

  score += eventStatusWeight(event.status);
  score += eventImportanceWeight(event.importance);
  score += evidenceWeight(event.evidence_strength);
  score += domainDensityWeight(domain.density);

  if (domain.domain_key === questionProfile.primary_domain) score += 3.6;
  if (domain.domain_key === winnerLock.winning_domain_key) score += 2.8;
  if (candidate.source === "PARSED_TEXT") score += 1.2;
  score += Number(candidate.score_boost || 0);

  const daysAway =
    (candidate.date_obj.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysAway >= 0 && daysAway <= 45) score += 2.4;
  else if (daysAway > 45 && daysAway <= 120) score += 1.4;
  else if (daysAway > 120 && daysAway <= 240) score += 0.8;
  else if (daysAway < 0) score -= 4.0;

  if (["PROMISED", "FORMING", "PENDING", "BUILDING", "APPROACHING"].includes(String(event.status || "").toUpperCase())) {
    score += 0.9;
  }

  return round2(score);
}

function flattenDateCandidates(rankedDomains, questionProfile, winnerLock, currentDate) {
  const all = [];

  rankedDomains.forEach((domain) => {
    const events = Array.isArray(domain.ranked_events) && domain.ranked_events.length
      ? domain.ranked_events
      : Array.isArray(domain.events)
        ? domain.events
        : [];

    events.forEach((event) => {
      const candidates = buildEventDateCandidates(event, domain, currentDate);

      candidates.forEach((candidate) => {
        all.push({
          domain_key: domain.domain_key,
          domain_label: domain.domain_label,
          event_type: event.event_type || null,
          event_number: Number(event.event_number || 0),
          event_status: event.status || null,
          event_importance: event.importance || null,
          trigger_phase: event.trigger_phase || null,
          evidence_strength: event.evidence_strength || null,
          candidate_source: candidate.source,
          precision: candidate.precision,
          date_obj: candidate.date_obj,
          iso_date: candidate.iso_date,
          raw_candidate_score: buildCandidateScore({
            event,
            domain,
            candidate,
            questionProfile,
            winnerLock,
            currentDate
          })
        });
      });
    });
  });

  return all.sort((a, b) => {
    if (b.raw_candidate_score !== a.raw_candidate_score) {
      return b.raw_candidate_score - a.raw_candidate_score;
    }

    if (a.iso_date !== b.iso_date) {
      return a.iso_date.localeCompare(b.iso_date);
    }

    if (a.domain_key !== b.domain_key) {
      return a.domain_key.localeCompare(b.domain_key);
    }

    return Number(a.event_number || 0) - Number(b.event_number || 0);
  });
}

function compressByDate(flatCandidates) {
  const map = new Map();

  flatCandidates.forEach((c) => {
    if (!map.has(c.iso_date)) {
      map.set(c.iso_date, {
        iso_date: c.iso_date,
        date_obj: c.date_obj,
        total_score: 0,
        hit_count: 0,
        strongest_candidate: c,
        linked_domains: new Set(),
        sources: new Set(),
        events: []
      });
    }

    const row = map.get(c.iso_date);
    row.total_score += Number(c.raw_candidate_score || 0);
    row.hit_count += 1;
    row.linked_domains.add(c.domain_key);
    row.sources.add(c.candidate_source);
    row.events.push(c);

    if (
      Number(c.raw_candidate_score || 0) >
      Number(row.strongest_candidate?.raw_candidate_score || -999)
    ) {
      row.strongest_candidate = c;
    }
  });

  return Array.from(map.values())
    .map((row) => ({
      iso_date: row.iso_date,
      date_obj: row.date_obj,
      total_score: round2(row.total_score),
      hit_count: row.hit_count,
      linked_domain_count: row.linked_domains.size,
      source_count: row.sources.size,
      strongest_candidate: row.strongest_candidate,
      events: row.events
    }))
    .sort((a, b) => {
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;
      if (b.linked_domain_count !== a.linked_domain_count) {
        return b.linked_domain_count - a.linked_domain_count;
      }
      return a.iso_date.localeCompare(b.iso_date);
    });
}

function buildDateTolerance(bestRow, secondRow) {
  const gap = round2(
    Number(bestRow?.total_score || 0) - Number(secondRow?.total_score || 0)
  );

  if (gap >= 5.5) return "±0 day";
  if (gap >= 3.2) return "±6 hours";
  if (gap >= 1.6) return "±12 hours";
  return "±1 day";
}

function buildDateConfidence(bestRow, secondRow) {
  const best = Number(bestRow?.total_score || 0);
  const second = Number(secondRow?.total_score || 0);

  if (best <= 0) return 0;

  const raw = best / (best + Math.max(second, 1));
  return round2(Math.min(0.98, Math.max(0.35, raw)));
}

function buildTimingRadar(compressedRows) {
  return compressedRows.slice(0, 7).map((row, idx) => ({
    rank: idx + 1,
    iso_date: row.iso_date,
    total_score: row.total_score,
    hit_count: row.hit_count,
    linked_domain_count: row.linked_domain_count,
    strongest_domain_key: row.strongest_candidate?.domain_key || null,
    strongest_domain_label: row.strongest_candidate?.domain_label || null,
    strongest_event_type: row.strongest_candidate?.event_type || null,
    strongest_event_number: row.strongest_candidate?.event_number || null,
    strongest_event_status: row.strongest_candidate?.event_status || null
  }));
}

export function runFutureTimingLayer({
  ranked_domains,
  question_profile,
  winner_lock,
  current_context
}) {
  const currentDate =
    safeDate(current_context?.event_datetime_iso) ||
    safeDate(new Date().toISOString()) ||
    new Date();

  const flat_date_candidates = flattenDateCandidates(
    ranked_domains,
    question_profile,
    winner_lock,
    currentDate
  );

  const compressed_date_rows = compressByDate(flat_date_candidates);

  const bestRow = compressed_date_rows[0] || null;
  const secondRow = compressed_date_rows[1] || null;

  const dominant_date_lock = {
    lock_state: bestRow ? "DATE_LOCKED" : "NO_DATE",
    exact_date: bestRow?.iso_date || null,
    tolerance: buildDateTolerance(bestRow, secondRow),
    confidence_score: buildDateConfidence(bestRow, secondRow),
    winning_domain_key: bestRow?.strongest_candidate?.domain_key || null,
    winning_domain_label: bestRow?.strongest_candidate?.domain_label || null,
    winning_event_type: bestRow?.strongest_candidate?.event_type || null,
    winning_event_number: bestRow?.strongest_candidate?.event_number || null,
    winning_event_status: bestRow?.strongest_candidate?.event_status || null,
    total_score: bestRow?.total_score || 0,
    runner_up_date: secondRow?.iso_date || null,
    score_gap: round2(
      Number(bestRow?.total_score || 0) - Number(secondRow?.total_score || 0)
    )
  };

  const primary_future_date_packet = bestRow
    ? {
        exact_date: bestRow.iso_date,
        tolerance: dominant_date_lock.tolerance,
        confidence_score: dominant_date_lock.confidence_score,
        source_domain_key: bestRow.strongest_candidate?.domain_key || null,
        source_domain_label: bestRow.strongest_candidate?.domain_label || null,
        source_event_type: bestRow.strongest_candidate?.event_type || null,
        source_event_number: bestRow.strongest_candidate?.event_number || null,
        source_event_status: bestRow.strongest_candidate?.event_status || null,
        linked_domain_count: bestRow.linked_domain_count,
        hit_count: bestRow.hit_count,
        total_score: bestRow.total_score
      }
    : null;

  return {
    flat_date_candidates,
    compressed_date_rows,
    dominant_date_lock,
    primary_future_date_packet,
    timing_radar: buildTimingRadar(compressed_date_rows)
  };
}