// lib/future-layer-timing.js

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

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateSafe(value, fallback = null) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function addHours(date, hours) {
  const d = new Date(date.getTime());
  d.setUTCHours(d.getUTCHours() + hours);
  return d;
}

function formatYMD(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function weekdayName(date) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getUTCDay()];
}

function parseTimeBand(band) {
  const raw = str(band).trim();
  if (!raw || !raw.includes("-")) {
    return { startHour: 12, endHour: 15, raw: "12:00-15:00" };
  }

  const [start, end] = raw.split("-").map((x) => x.trim());
  const [sh, sm] = start.split(":").map((x) => num(x, 0));
  const [eh, em] = end.split(":").map((x) => num(x, 0));

  return {
    startHour: sh,
    startMinute: sm,
    endHour: eh,
    endMinute: em,
    raw
  };
}

function bandMidHour(band) {
  const parsed = parseTimeBand(band);
  const start = parsed.startHour + (num(parsed.startMinute, 0) / 60);
  const end = parsed.endHour + (num(parsed.endMinute, 0) / 60);
  return (start + end) / 2;
}

function questionWantsExact(question) {
  const q = str(question).toLowerCase();
  return (
    q.includes("exact") ||
    q.includes("time") ||
    q.includes("date") ||
    q.includes("next major") ||
    q.includes("when")
  );
}

function makeFutureSeedDate(current_context) {
  const iso = current_context?.event_datetime_iso || new Date().toISOString();
  return toDateSafe(iso, new Date());
}

function futurePriority(domain) {
  const key = str(domain?.domain_key);
  const active = num(domain?.active_event_count, 0);
  const major = num(domain?.major_event_count, 0);
  const base = num(domain?.rank_score, 0);

  const bonusMap = {
    MARRIAGE: 2.8,
    CAREER: 2.5,
    BUSINESS: 2.4,
    JOB: 2.2,
    DOCUMENT: 2.1,
    IMMIGRATION: 2.1,
    SETTLEMENT: 2.0,
    PROPERTY: 1.9,
    FOREIGN: 1.8,
    SUCCESS: 1.7,
    VISA: 1.7,
    GAIN: 1.5,
    RECOVERY: 1.2,
    LEGAL: 1.1
  };

  return Number((base + active * 0.9 + major * 0.45 + (bonusMap[key] || 0)).toFixed(2));
}

function buildFutureCandidate(domain, now, offsetDays, sourceTag = "DOMAIN_SCAN") {
  const key = str(domain?.domain_key);
  const label = str(domain?.domain_label);
  const band = str(domain?.exact_time_band, "12:00-15:00");
  const parsedBand = parseTimeBand(band);

  const eventDate = addDays(now, offsetDays);
  const midHour = bandMidHour(band);
  const hour = Math.floor(midHour);
  const minute = Math.round((midHour - hour) * 60);

  let exactDT = new Date(Date.UTC(
    eventDate.getUTCFullYear(),
    eventDate.getUTCMonth(),
    eventDate.getUTCDate(),
    hour,
    minute,
    0
  ));

  if (hour < parsedBand.startHour) {
    exactDT = addHours(exactDT, parsedBand.startHour - hour);
  }

  const statusByDomain = {
    MARRIAGE: "BUILDING",
    CAREER: "BUILDING",
    JOB: "BUILDING",
    BUSINESS: "BUILDING",
    DOCUMENT: "OPENING",
    IMMIGRATION: "OPENING",
    FOREIGN: "OPENING",
    SETTLEMENT: "STABILISING",
    PROPERTY: "STABILISING",
    SUCCESS: "BUILDING",
    GAIN: "OPENING",
    LEGAL: "WATCH"
  };

  const typeByDomain = {
    MARRIAGE: "future union / relationship event",
    CAREER: "career movement event",
    JOB: "job / role movement event",
    BUSINESS: "business / trade opening event",
    DOCUMENT: "paperwork / approval opening",
    IMMIGRATION: "immigration / clearance movement",
    FOREIGN: "foreign pathway movement",
    SETTLEMENT: "base strengthening event",
    PROPERTY: "property / base event",
    SUCCESS: "rise / success event",
    GAIN: "gain / inflow event",
    LEGAL: "authority / legal movement"
  };

  return {
    domain_key: key,
    domain_label: label,
    event_type: typeByDomain[key] || "future major event",
    status: statusByDomain[key] || "BUILDING",
    importance: "MAJOR",
    trigger_phase: "future activation",
    source: sourceTag,

    exact_date: formatYMD(exactDT),
    exact_weekday: weekdayName(exactDT),
    exact_datetime_iso: exactDT.toISOString(),
    exact_time_band: band,

    priority_score: futurePriority(domain),
    tolerance_days: key === "DOCUMENT" || key === "IMMIGRATION" ? 1 : 2
  };
}

function buildPrimaryFutureCandidates(domain_results, now) {
  const domains = arr(domain_results);

  const importantDomains = domains
    .filter((d) => num(d.rank_score, 0) > 0)
    .sort((a, b) => futurePriority(b) - futurePriority(a));

  const offsetMap = {
    DOCUMENT: 18,
    IMMIGRATION: 24,
    LEGAL: 20,
    SETTLEMENT: 30,
    PROPERTY: 34,
    BUSINESS: 16,
    CAREER: 19,
    JOB: 21,
    MARRIAGE: 26,
    FOREIGN: 28,
    SUCCESS: 15,
    GAIN: 17,
    RECOVERY: 12
  };

  return importantDomains.slice(0, 12).map((domain, idx) => {
    const fallbackOffset = 14 + idx * 3;
    const domainOffset = offsetMap[domain.domain_key] ?? fallbackOffset;
    return buildFutureCandidate(domain, now, domainOffset);
  });
}

function pickNextMajorEvent(candidates, question) {
  const all = arr(candidates).slice().sort((a, b) => {
    if (a.priority_score !== b.priority_score) {
      return b.priority_score - a.priority_score;
    }
    return String(a.exact_datetime_iso).localeCompare(String(b.exact_datetime_iso));
  });

  const exactWanted = questionWantsExact(question);

  if (!all.length) return null;

  if (!exactWanted) {
    return all[0];
  }

  const majorPreferred = all.filter((x) => x.importance === "MAJOR");
  return majorPreferred[0] || all[0];
}

function buildExactDomainSummary(domain_results) {
  return arr(domain_results)
    .filter((d) => d && (d.primary_exact_event || d.exact_time_band))
    .map((d) => ({
      domain_key: d.domain_key,
      domain_label: d.domain_label,
      exact_time_band: d.exact_time_band || null,
      primary_exact_event: d.primary_exact_event || null,
      alternative_exact_events: arr(d.alternative_exact_events)
    }))
    .sort((a, b) => {
      const as = num(a?.primary_exact_event?.score, 0);
      const bs = num(b?.primary_exact_event?.score, 0);
      return bs - as;
    });
}

function buildFutureTimeline(candidates) {
  return arr(candidates)
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
      exact_weekday: c.exact_weekday,
      exact_datetime_iso: c.exact_datetime_iso,
      exact_time_band: c.exact_time_band,
      tolerance_days: c.tolerance_days,
      source: c.source
    }));
}

function buildEventRadar(next_major_event) {
  if (!next_major_event) return null;

  return {
    date: next_major_event.exact_date,
    weekday: next_major_event.exact_weekday,
    uk_time_band: next_major_event.exact_time_band,
    bd_time_band: next_major_event.exact_time_band,
    tolerance: `±${next_major_event.tolerance_days} day`
  };
}

export function runFutureTimingLayer({
  input = {},
  question_profile = {},
  domain_results = [],
  current_context = {}
} = {}) {
  const question = str(input.question || question_profile.raw_question);
  const now = makeFutureSeedDate(current_context);

  const safeDomains = arr(domain_results);
  const exact_domain_summary = buildExactDomainSummary(safeDomains);

  const futureCandidates = buildPrimaryFutureCandidates(safeDomains, now);
  const next_major_event = pickNextMajorEvent(futureCandidates, question);
  const future_timeline = buildFutureTimeline(futureCandidates);
  const event_radar = buildEventRadar(next_major_event);

  return {
    timing_status: "OK",

    exact_domain_summary,
    future_candidates: futureCandidates,
    future_timeline,

    next_major_event,
    event_radar,

    timing_meta: {
      question_used: question,
      current_datetime_iso: now.toISOString(),
      exact_question_mode: questionWantsExact(question),
      candidate_count: futureCandidates.length
    }
  };
}

export default runFutureTimingLayer;