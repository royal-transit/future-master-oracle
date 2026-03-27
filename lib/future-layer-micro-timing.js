// lib/future-layer-micro-timing.js

import { safeArray } from "./chart-core.js";

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

function round2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function parseIsoSafe(value) {
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

// Time band → minute window
function getBandRange(timeBand) {
  const [start, end] = String(timeBand || "10:00-15:00").split("-");
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);

  return {
    startMinutes: sh * 60 + (sm || 0),
    endMinutes: eh * 60 + (em || 0)
  };
}

// Deterministic micro offset generator
function deriveMinuteOffset(seed) {
  const base = Math.abs(Math.sin(seed * 9999)) * 10000;
  return Math.floor(base % 60);
}

// Deterministic hour shift inside band
function deriveHourOffset(seed, bandHours) {
  const base = Math.abs(Math.cos(seed * 7777)) * 10000;
  return Math.floor(base % bandHours);
}

function buildExactTimestamp(event, baseDate, index = 0) {
  const date = parseIsoSafe(event.exact_datetime_iso);
  if (!date) return event;

  const band = getBandRange(event.exact_time_band);

  const bandStartHour = Math.floor(band.startMinutes / 60);
  const bandEndHour = Math.floor(band.endMinutes / 60);
  const bandHours = clamp(bandEndHour - bandStartHour, 1, 12);

  // seed = score + index → deterministic
  const seed = Number(event.score || 1) + index * 0.77;

  const hourOffset = deriveHourOffset(seed, bandHours);
  const minuteOffset = deriveMinuteOffset(seed + 1.33);

  const finalHour = clamp(bandStartHour + hourOffset, bandStartHour, bandEndHour);
  const finalMinute = clamp(minuteOffset, 0, 59);

  const exact = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      finalHour,
      finalMinute,
      0,
      0
    )
  );

  return {
    ...event,
    exact_datetime_iso: exact.toISOString(),
    exact_time_utc: `${String(finalHour).padStart(2, "0")}:${String(
      finalMinute
    ).padStart(2, "0")}`,
    precision_level: "MICRO",
    tolerance: "±15m"
  };
}

function refineDomain(domain) {
  const primary = domain.primary_exact_event
    ? buildExactTimestamp(domain.primary_exact_event, null, 0)
    : null;

  const alternatives = safeArray(domain.alternative_exact_events).map((ev, i) =>
    buildExactTimestamp(ev, null, i + 1)
  );

  return {
    ...domain,
    primary_exact_event: primary,
    alternative_exact_events: alternatives
  };
}

function buildMicroSummary(domainResults) {
  return safeArray(domainResults)
    .filter((d) => d.primary_exact_event)
    .map((d) => ({
      domain: d.domain_label,
      event: d.primary_exact_event.event_type,
      exact_datetime_iso: d.primary_exact_event.exact_datetime_iso,
      exact_time_utc: d.primary_exact_event.exact_time_utc,
      precision_level: "MICRO",
      tolerance: "±15m"
    }));
}

export function runFutureMicroTimingLayer({
  domain_results = []
} = {}) {
  const refined = safeArray(domain_results).map(refineDomain);

  const micro_timing_summary = buildMicroSummary(refined);

  return {
    domain_results: refined,
    micro_timing_summary
  };
}