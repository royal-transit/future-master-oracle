// lib/future-layer-timing.js

import { safeArray } from "./chart-core.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function round2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

function parseIsoSafe(value) {
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function formatDateOnlyUTC(date) {
  return date.toISOString().slice(0, 10);
}

function getWeekdayNameUTC(date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    timeZone: "UTC"
  });
}

function getTimeBandForDomain(domainKey) {
  const key = String(domainKey || "").toUpperCase();

  if (["MENTAL", "HEALTH", "DISEASE", "RECOVERY"].includes(key)) {
    return "06:00-10:00";
  }

  if (
    ["DOCUMENT", "IMMIGRATION", "LEGAL", "BUSINESS", "GAIN", "LOSS"].includes(key)
  ) {
    return "09:00-13:00";
  }

  if (
    ["SETTLEMENT", "PROPERTY", "HOME", "FOREIGN", "CAREER", "JOB", "AUTHORITY"].includes(
      key
    )
  ) {
    return "11:00-17:00";
  }

  if (["MARRIAGE", "LOVE", "PARTNERSHIP", "DIVORCE"].includes(key)) {
    return "16:00-22:00";
  }

  return "10:00-15:00";
}

function bandStartHour(timeBand) {
  const [start] = String(timeBand || "10:00-15:00").split("-");
  return Number(start.split(":")[0] || 10);
}

function bandEndHour(timeBand) {
  const [, end] = String(timeBand || "10:00-15:00").split("-");
  return Number(end.split(":")[0] || 15);
}

function computeTimingWeight(domain) {
  const normalized = Number(domain.normalized_score || 0);
  const rank = Number(domain.rank_score || 0);
  const densityBoost =
    domain.density === "HIGH" ? 1.4 : domain.density === "MED" ? 0.7 : 0.2;
  const residualBoost =
    domain.residual_impact === "HIGH"
      ? 1.2
      : domain.residual_impact === "MED"
        ? 0.6
        : 0.15;
  const activeBoost = Number(domain.active_event_count || 0) * 1.1;
  const majorBoost = Number(domain.major_event_count || 0) * 0.9;

  return round2(normalized + rank * 0.22 + densityBoost + residualBoost + activeBoost + majorBoost);
}

function computeDayOffset(domainKey, score, eventIndex = 0) {
  const key = String(domainKey || "").toUpperCase();

  const baseMap = {
    DOCUMENT: 9,
    IMMIGRATION: 11,
    LEGAL: 12,
    AUTHORITY: 10,
    BUSINESS: 13,
    GAIN: 8,
    LOSS: 7,
    SETTLEMENT: 18,
    PROPERTY: 20,
    HOME: 16,
    FOREIGN: 17,
    CAREER: 19,
    JOB: 15,
    MARRIAGE: 23,
    LOVE: 21,
    PARTNERSHIP: 22,
    DIVORCE: 14,
    MENTAL: 6,
    HEALTH: 6,
    DISEASE: 5,
    RECOVERY: 9,
    VEHICLE: 8,
    NETWORK: 10,
    COMMUNICATION: 7,
    TRAVEL_SHORT: 8,
    TRAVEL_LONG: 18,
    DEBT: 9,
    DELAY: 24,
    BLOCKAGE: 25,
    REPUTATION: 17,
    POWER: 16,
    SUCCESS: 14,
    CHILDREN: 20,
    SUDDEN_GAIN: 7,
    SUDDEN_LOSS: 6,
    ACCIDENT: 5,
    SURGERY: 6,
    SCANDAL: 9,
    SPIRITUAL: 14,
    RELIGION: 15,
    IDENTITY: 10,
    ENEMY: 8,
    FRIEND: 9
  };

  const base = baseMap[key] ?? 14;

  // Stronger score brings event closer
  const scorePull = clamp(Math.floor(score / 2), 0, 6);

  // Alternative events move later
  const indexPush = eventIndex * 5;

  const raw = base - scorePull + indexPush;
  return clamp(raw, 2, 45);
}

function deriveExactDate(baseDate, offsetDays, timeBand) {
  const date = addDays(baseDate, offsetDays);

  const startHour = bandStartHour(timeBand);
  const endHour = bandEndHour(timeBand);

  const chosenHour = clamp(
    Math.round((startHour + endHour) / 2),
    startHour,
    endHour
  );

  const exact = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      chosenHour,
      0,
      0,
      0
    )
  );

  return {
    date_only: formatDateOnlyUTC(date),
    weekday: getWeekdayNameUTC(date),
    exact_datetime_iso: exact.toISOString()
  };
}

function buildExactEvent(domain, sourceEvent, baseDate, eventIndex = 0) {
  const score = computeTimingWeight(domain);
  const timeBand = domain.exact_time_band || getTimeBandForDomain(domain.domain_key);
  const offsetDays = computeDayOffset(domain.domain_key, score, eventIndex);
  const derived = deriveExactDate(baseDate, offsetDays, timeBand);

  return {
    domain: domain.domain_label,
    domain_key: domain.domain_key,
    event_type: sourceEvent.event_type,
    event_number: sourceEvent.event_number,
    status: sourceEvent.status,
    trigger_phase: sourceEvent.trigger_phase,
    evidence_strength: sourceEvent.evidence_strength,
    importance: sourceEvent.importance,
    exact_date: derived.date_only,
    weekday: derived.weekday,
    exact_datetime_iso: derived.exact_datetime_iso,
    date_marker: derived.date_only,
    exact_time_band: timeBand,
    score
  };
}

function attachTiming(domain, baseDate) {
  const timeBand = getTimeBandForDomain(domain.domain_key);
  const events = safeArray(domain.events);

  const primarySourceEvent = events[0] || null;
  const alternativeSourceEvents = events.slice(1);

  const primary_exact_event = primarySourceEvent
    ? buildExactEvent(domain, primarySourceEvent, baseDate, 0)
    : null;

  const alternative_exact_events = alternativeSourceEvents.map((event, idx) =>
    buildExactEvent(domain, event, baseDate, idx + 1)
  );

  return {
    ...domain,
    exact_time_band: timeBand,
    exact_resolver_active: true,
    primary_exact_event,
    alternative_exact_events
  };
}

function buildExactDomainSummary(domainResults) {
  return safeArray(domainResults)
    .filter((d) => d.primary_exact_event)
    .map((d) => ({
      domain_key: d.domain_key,
      domain_label: d.domain_label,
      exact_time_band: d.exact_time_band,
      primary_exact_event: d.primary_exact_event,
      alternative_exact_events: d.alternative_exact_events || []
    }));
}

export function runFutureTimingLayer({
  domain_results = [],
  current_context = {},
  input = {}
} = {}) {
  const baseDate =
    parseIsoSafe(current_context.current_datetime_iso) ||
    parseIsoSafe(current_context.event_datetime_iso) ||
    parseIsoSafe(input.current_datetime_iso) ||
    new Date();

  const timedResults = safeArray(domain_results).map((domain) =>
    attachTiming(domain, baseDate)
  );

  const exact_domain_summary = buildExactDomainSummary(timedResults);

  return {
    domain_results: timedResults,
    exact_domain_summary
  };
}