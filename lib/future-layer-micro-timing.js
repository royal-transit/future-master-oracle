// lib/future-layer-micro-timing.js

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toISODate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function formatTimeBand(domainKey) {
  if (["CAREER", "BUSINESS", "JOB", "DOCUMENT", "LEGAL"].includes(domainKey)) {
    return "09:00-13:00 local";
  }

  if (["MARRIAGE", "RELATIONSHIP", "LOVE", "PARTNERSHIP"].includes(domainKey)) {
    return "16:00-22:00 local";
  }

  if (["HEALTH", "MENTAL", "DISEASE", "RECOVERY"].includes(domainKey)) {
    return "06:00-10:00 local";
  }

  if (["FOREIGN", "IMMIGRATION", "VISA", "SETTLEMENT", "PROPERTY"].includes(domainKey)) {
    return "10:00-15:00 local";
  }

  return "11:00-17:00 local";
}

function getWindowOffsets(windowKey) {
  if (windowKey === "NOW_TO_30_DAYS") {
    return { start: 0, end: 30, peakStart: 9, peakEnd: 16 };
  }

  if (windowKey === "DAY_31_TO_90") {
    return { start: 31, end: 90, peakStart: 44, peakEnd: 58 };
  }

  if (windowKey === "MONTH_4_TO_6") {
    return { start: 91, end: 180, peakStart: 118, peakEnd: 145 };
  }

  if (windowKey === "MONTH_7_TO_12") {
    return { start: 181, end: 365, peakStart: 225, peakEnd: 278 };
  }

  return { start: 0, end: 30, peakStart: 9, peakEnd: 16 };
}

function getDomainDayBias(domainKey) {
  if (["MARRIAGE", "RELATIONSHIP", "LOVE", "PARTNERSHIP"].includes(domainKey)) {
    return { shift: 2, tighten: 4 };
  }

  if (["CAREER", "BUSINESS", "JOB", "REPUTATION", "AUTHORITY"].includes(domainKey)) {
    return { shift: -1, tighten: 5 };
  }

  if (["FOREIGN", "IMMIGRATION", "VISA", "SETTLEMENT"].includes(domainKey)) {
    return { shift: 5, tighten: 6 };
  }

  if (["PROPERTY", "HOME", "VEHICLE"].includes(domainKey)) {
    return { shift: 7, tighten: 7 };
  }

  if (["HEALTH", "MENTAL", "DISEASE", "RECOVERY"].includes(domainKey)) {
    return { shift: -3, tighten: 3 };
  }

  if (["LEGAL", "DOCUMENT", "DEBT"].includes(domainKey)) {
    return { shift: 1, tighten: 4 };
  }

  return { shift: 0, tighten: 5 };
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function buildCandidateDates(now, bestWindowKey, domainKey, confidence) {
  const offsets = getWindowOffsets(bestWindowKey);
  const bias = getDomainDayBias(domainKey);

  const windowStart = addDays(now, offsets.start);
  const windowEnd = addDays(now, offsets.end);

  const peakStartOffset = clamp(offsets.peakStart + bias.shift, offsets.start, offsets.end);
  const peakEndOffset = clamp(
    offsets.peakEnd + bias.shift - bias.tighten,
    peakStartOffset + 1,
    offsets.end
  );

  const peakStart = addDays(now, peakStartOffset);
  const peakEnd = addDays(now, peakEndOffset);

  const mid = Math.floor((peakStartOffset + peakEndOffset) / 2);
  const peakDate = addDays(now, mid);

  const microConfidence =
    confidence === "HIGH" ? "HIGH" :
    confidence === "MEDIUM" ? "MEDIUM" : "LOW";

  return {
    window_start_date: toISODate(windowStart),
    window_end_date: toISODate(windowEnd),
    peak_start_date: toISODate(peakStart),
    peak_end_date: toISODate(peakEnd),
    peak_date: toISODate(peakDate),
    micro_confidence: microConfidence
  };
}

function buildTop5MicroTiming(now, topDomains) {
  return (topDomains || []).map((d) => {
    if (!d.best_window_key) {
      return {
        domain_key: d.domain_key,
        domain_label: d.domain_label,
        best_window_key: null,
        peak_date: null,
        peak_time_band: null,
        micro_confidence: "LOW"
      };
    }

    const dates = buildCandidateDates(
      now,
      d.best_window_key,
      d.domain_key,
      d.confidence
    );

    return {
      domain_key: d.domain_key,
      domain_label: d.domain_label,
      best_window_key: d.best_window_key,
      best_window_label: d.best_window_label || null,
      peak_date: dates.peak_date,
      peak_start_date: dates.peak_start_date,
      peak_end_date: dates.peak_end_date,
      peak_time_band: formatTimeBand(d.domain_key),
      micro_confidence: dates.micro_confidence
    };
  });
}

export function runFutureMicroTimingLayer({
  primary_future_domain,
  top_5_future_domains,
  best_window,
  current_context
}) {
  const nowIso =
    current_context?.event_datetime_iso || new Date().toISOString();

  const now = new Date(nowIso);

  if (
    !primary_future_domain ||
    primary_future_domain.domain_key === "NONE" ||
    !best_window?.window_key
  ) {
    return {
      exact_date_time_block: {
        exact_date_time_status: "INSUFFICIENT_SIGNAL",
        reason: "Primary future domain or best window is missing.",
        exact_date: null,
        exact_time: null,
        peak_date_range: null,
        peak_time_band: null
      },
      top_5_micro_timing: []
    };
  }

  const primaryDates = buildCandidateDates(
    now,
    best_window.window_key,
    primary_future_domain.domain_key,
    primary_future_domain.confidence
  );

  const exact_date_time_block = {
    exact_date_time_status: "MICRO_WINDOW_ACTIVE",
    reason:
      "This build narrows the strongest activation into a likely peak date range and time band, not a guaranteed exact minute.",
    primary_domain: primary_future_domain.domain_key,
    primary_domain_label: primary_future_domain.domain_label,
    best_window_key: best_window.window_key,
    best_window_label: best_window.window_label,
    exact_date: primaryDates.peak_date,
    exact_time: formatTimeBand(primary_future_domain.domain_key),
    peak_date_range: {
      from: primaryDates.peak_start_date,
      to: primaryDates.peak_end_date
    },
    full_window_range: {
      from: primaryDates.window_start_date,
      to: primaryDates.window_end_date
    },
    micro_confidence: primaryDates.micro_confidence
  };

  const top_5_micro_timing = buildTop5MicroTiming(now, top_5_future_domains);

  return {
    exact_date_time_block,
    top_5_micro_timing
  };
}