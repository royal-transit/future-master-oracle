// lib/future-layer-micro-timing.js

const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

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

function buildUtcDateTime(isoDate, hour = 12, minute = 0) {
  if (!isoDate) return null;
  const m = String(isoDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  const dt = new Date(
    Date.UTC(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(hour),
      Number(minute),
      0
    )
  );

  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatTime24(hour, minute) {
  return `${pad2(hour)}:${pad2(minute)}`;
}

function formatTime12(hour, minute) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${pad2(minute)} ${suffix}`;
}

function formatIsoDateTimeUTC(dateObj) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return null;

  return `${dateObj.getUTCFullYear()}-${pad2(dateObj.getUTCMonth() + 1)}-${pad2(
    dateObj.getUTCDate()
  )}T${pad2(dateObj.getUTCHours())}:${pad2(dateObj.getUTCMinutes())}:00Z`;
}

function getBandBase(domainKey, eventType, eventStatus) {
  const d = String(domainKey || "").toUpperCase();
  const e = normalizeText(eventType);
  const s = String(eventStatus || "").toUpperCase();

  if (["MARRIAGE", "DIVORCE", "RELATIONSHIP", "LOVE", "PARTNERSHIP"].includes(d)) {
    return { startHour: 16, endHour: 22 };
  }

  if (["HEALTH", "DISEASE", "MENTAL", "RECOVERY", "SURGERY"].includes(d)) {
    return { startHour: 6, endHour: 10 };
  }

  if (["CAREER", "JOB", "BUSINESS", "MONEY", "GAIN", "LOSS", "DEBT"].includes(d)) {
    return { startHour: 10, endHour: 15 };
  }

  if (["FOREIGN", "IMMIGRATION", "VISA", "SETTLEMENT", "PROPERTY", "HOME"].includes(d)) {
    return { startHour: 11, endHour: 17 };
  }

  if (["DOCUMENT", "LEGAL", "AUTHORITY"].includes(d)) {
    return { startHour: 9, endHour: 13 };
  }

  if (e.includes("approval") || e.includes("documentation")) {
    return { startHour: 9, endHour: 13 };
  }

  if (e.includes("marriage") || e.includes("union")) {
    return { startHour: 16, endHour: 22 };
  }

  if (e.includes("stress") || e.includes("health") || e.includes("recovery")) {
    return { startHour: 6, endHour: 10 };
  }

  if (s === "PROMISED" || s === "FORMING" || s === "PENDING") {
    return { startHour: 11, endHour: 16 };
  }

  return { startHour: 11, endHour: 17 };
}

function getQuarterHourSlots(startHour, endHour) {
  const slots = [];

  for (let hour = startHour; hour <= endHour; hour += 1) {
    for (const minute of [0, 15, 30, 45]) {
      if (hour === endHour && minute > 0) continue;
      slots.push({ hour, minute });
    }
  }

  return slots;
}

function scoreStatus(status) {
  const s = String(status || "").toUpperCase();

  if (s === "PROMISED") return 4.6;
  if (s === "FORMING") return 4.3;
  if (s === "PENDING") return 4.1;
  if (s === "BUILDING") return 3.8;
  if (s === "APPROACHING") return 3.6;
  if (s === "ACTIVE") return 2.8;
  if (s === "STABILISING") return 2.4;
  if (s === "EXECUTED") return 0.9;
  if (s === "BROKEN" || s === "FAILED" || s === "DENIED") return -1.2;

  return 0.5;
}

function scoreImportance(importance) {
  const i = String(importance || "").toUpperCase();
  if (i === "MAJOR") return 1.8;
  if (i === "MINOR") return 0.4;
  return 0.2;
}

function scoreEvidence(evidenceStrength) {
  const e = normalizeText(evidenceStrength);
  if (e === "strong") return 1.4;
  if (e === "moderate") return 0.8;
  if (e === "weak") return 0.2;
  return 0.1;
}

function domainPeakPreference(domainKey, eventType, eventStatus) {
  const base = getBandBase(domainKey, eventType, eventStatus);

  const d = String(domainKey || "").toUpperCase();
  const e = normalizeText(eventType);
  const s = String(eventStatus || "").toUpperCase();

  let peakHour = Math.floor((base.startHour + base.endHour) / 2);
  let peakMinute = 30;

  if (["MARRIAGE", "DIVORCE", "RELATIONSHIP", "LOVE", "PARTNERSHIP"].includes(d)) {
    peakHour = 19;
    peakMinute = 15;
  } else if (["HEALTH", "DISEASE", "MENTAL", "RECOVERY"].includes(d)) {
    peakHour = 8;
    peakMinute = 15;
  } else if (["BUSINESS", "CAREER", "JOB", "MONEY", "GAIN", "LOSS", "DEBT"].includes(d)) {
    peakHour = 12;
    peakMinute = 30;
  } else if (["DOCUMENT", "LEGAL", "AUTHORITY"].includes(d)) {
    peakHour = 10;
    peakMinute = 45;
  } else if (["FOREIGN", "IMMIGRATION", "VISA", "SETTLEMENT", "PROPERTY"].includes(d)) {
    peakHour = 13;
    peakMinute = 15;
  }

  if (e.includes("approval")) {
    peakHour = 10;
    peakMinute = 30;
  }

  if (e.includes("marriage")) {
    peakHour = 19;
    peakMinute = 15;
  }

  if (e.includes("stress") || e.includes("health")) {
    peakHour = 8;
    peakMinute = 0;
  }

  if (s === "PROMISED") {
    peakMinute = 0;
  } else if (s === "FORMING") {
    peakMinute = 15;
  } else if (s === "STABILISING") {
    peakMinute = 30;
  } else if (s === "ACTIVE") {
    peakMinute = 45;
  }

  return { ...base, peakHour, peakMinute };
}

function proximityScore(slotHour, slotMinute, peakHour, peakMinute) {
  const slotTotal = slotHour * 60 + slotMinute;
  const peakTotal = peakHour * 60 + peakMinute;
  const gap = Math.abs(slotTotal - peakTotal);

  if (gap === 0) return 3.2;
  if (gap <= 15) return 2.6;
  if (gap <= 30) return 1.9;
  if (gap <= 45) return 1.2;
  if (gap <= 60) return 0.8;
  if (gap <= 90) return 0.4;
  return 0.1;
}

function buildSlotCandidatesForEvent(row) {
  const peak = domainPeakPreference(
    row.domain_key,
    row.event_type,
    row.event_status
  );

  const slots = getQuarterHourSlots(peak.startHour, peak.endHour);

  return slots.map((slot) => {
    const score =
      scoreStatus(row.event_status) +
      scoreImportance(row.event_importance) +
      scoreEvidence(row.evidence_strength) +
      proximityScore(slot.hour, slot.minute, peak.peakHour, peak.peakMinute);

    return {
      domain_key: row.domain_key,
      domain_label: row.domain_label,
      event_type: row.event_type,
      event_number: row.event_number,
      event_status: row.event_status,
      event_importance: row.event_importance,
      evidence_strength: row.evidence_strength,
      iso_date: row.iso_date,
      hour: slot.hour,
      minute: slot.minute,
      time_24: formatTime24(slot.hour, slot.minute),
      time_12: formatTime12(slot.hour, slot.minute),
      raw_micro_score: round2(score)
    };
  });
}

function flattenMicroCandidates(compressedDateRows, exactDate) {
  const targetRow = (compressedDateRows || []).find((r) => r.iso_date === exactDate);
  if (!targetRow) return [];

  const micro = [];

  (targetRow.events || []).forEach((eventRow) => {
    buildSlotCandidatesForEvent(eventRow).forEach((slot) => micro.push(slot));
  });

  return micro.sort((a, b) => {
    if (b.raw_micro_score !== a.raw_micro_score) {
      return b.raw_micro_score - a.raw_micro_score;
    }

    if (a.hour !== b.hour) return a.hour - b.hour;
    if (a.minute !== b.minute) return a.minute - b.minute;
    if (a.domain_key !== b.domain_key) return a.domain_key.localeCompare(b.domain_key);

    return Number(a.event_number || 0) - Number(b.event_number || 0);
  });
}

function compressSlots(flatMicroCandidates) {
  const map = new Map();

  flatMicroCandidates.forEach((slot) => {
    const key = `${slot.hour}:${slot.minute}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        hour: slot.hour,
        minute: slot.minute,
        time_24: slot.time_24,
        time_12: slot.time_12,
        total_score: 0,
        hit_count: 0,
        strongest_slot: slot,
        domains: new Set(),
        rows: []
      });
    }

    const row = map.get(key);
    row.total_score += Number(slot.raw_micro_score || 0);
    row.hit_count += 1;
    row.domains.add(slot.domain_key);
    row.rows.push(slot);

    if (
      Number(slot.raw_micro_score || 0) >
      Number(row.strongest_slot?.raw_micro_score || -999)
    ) {
      row.strongest_slot = slot;
    }
  });

  return Array.from(map.values())
    .map((row) => ({
      key: row.key,
      hour: row.hour,
      minute: row.minute,
      time_24: row.time_24,
      time_12: row.time_12,
      total_score: round2(row.total_score),
      hit_count: row.hit_count,
      linked_domain_count: row.domains.size,
      strongest_slot: row.strongest_slot,
      rows: row.rows
    }))
    .sort((a, b) => {
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;
      if (b.linked_domain_count !== a.linked_domain_count) {
        return b.linked_domain_count - a.linked_domain_count;
      }
      if (a.hour !== b.hour) return a.hour - b.hour;
      return a.minute - b.minute;
    });
}

function buildTimeTolerance(best, second) {
  const gap = round2(Number(best?.total_score || 0) - Number(second?.total_score || 0));

  if (gap >= 4.2) return "±15m";
  if (gap >= 2.4) return "±30m";
  if (gap >= 1.3) return "±45m";
  return "±60m";
}

function buildTimeConfidence(best, second) {
  const bestScore = Number(best?.total_score || 0);
  const secondScore = Number(second?.total_score || 0);

  if (bestScore <= 0) return 0;

  const raw = bestScore / (bestScore + Math.max(secondScore, 1));
  return round2(Math.min(0.98, Math.max(0.36, raw)));
}

function buildAlternativeTimeCandidates(compressedSlots, isoDate) {
  return compressedSlots.slice(1, 4).map((row, idx) => {
    const dt = buildUtcDateTime(isoDate, row.hour, row.minute);

    return {
      rank: idx + 2,
      exact_time_24: row.time_24,
      exact_time_12: row.time_12,
      exact_datetime_utc: formatIsoDateTimeUTC(dt),
      total_score: row.total_score,
      hit_count: row.hit_count,
      linked_domain_count: row.linked_domain_count,
      source_domain_key: row.strongest_slot?.domain_key || null,
      source_domain_label: row.strongest_slot?.domain_label || null,
      source_event_type: row.strongest_slot?.event_type || null,
      source_event_number: row.strongest_slot?.event_number || null
    };
  });
}

function buildWhyThisTimeWins(best, second) {
  if (!best) return "No dominant micro-time candidate was found.";

  const parts = [
    `${best.time_12} wins on the strongest micro-score`,
    `(${best.total_score})`
  ];

  if (best.linked_domain_count > 1) {
    parts.push(`with ${best.linked_domain_count} linked domain convergences`);
  }

  if (best.hit_count > 1) {
    parts.push(`and ${best.hit_count} supporting slot hits`);
  }

  if (second) {
    parts.push(
      `while runner-up ${second.time_12} stayed lower by ${round2(
        best.total_score - second.total_score
      )}`
    );
  }

  return `${parts.join(" ")}.`;
}

function buildMicroRadar(compressedSlots, isoDate) {
  return compressedSlots.slice(0, 7).map((row, idx) => {
    const dt = buildUtcDateTime(isoDate, row.hour, row.minute);

    return {
      rank: idx + 1,
      exact_time_24: row.time_24,
      exact_time_12: row.time_12,
      exact_datetime_utc: formatIsoDateTimeUTC(dt),
      total_score: row.total_score,
      linked_domain_count: row.linked_domain_count,
      hit_count: row.hit_count,
      source_domain_key: row.strongest_slot?.domain_key || null,
      source_domain_label: row.strongest_slot?.domain_label || null,
      source_event_type: row.strongest_slot?.event_type || null,
      source_event_number: row.strongest_slot?.event_number || null,
      source_event_status: row.strongest_slot?.event_status || null
    };
  });
}

export function runFutureMicroTimingLayer({
  compressed_date_rows,
  primary_future_date_packet
}) {
  const exactDate = primary_future_date_packet?.exact_date || null;

  if (!exactDate) {
    return {
      flat_micro_candidates: [],
      compressed_micro_slots: [],
      exact_time_lock: {
        lock_state: "NO_TIME",
        exact_date: null,
        exact_time_24: null,
        exact_time_12: null,
        exact_datetime_utc: null,
        tolerance: null,
        confidence_score: 0,
        why_this_time_wins: "No exact date was available for micro-timing."
      },
      primary_future_time_packet: null,
      alternative_time_candidates: [],
      micro_timing_radar: []
    };
  }

  const flat_micro_candidates = flattenMicroCandidates(compressed_date_rows, exactDate);
  const compressed_micro_slots = compressSlots(flat_micro_candidates);

  const best = compressed_micro_slots[0] || null;
  const second = compressed_micro_slots[1] || null;

  const bestDateTime = best
    ? buildUtcDateTime(exactDate, best.hour, best.minute)
    : null;

  const exact_time_lock = {
    lock_state: best ? "TIME_LOCKED" : "NO_TIME",
    exact_date: exactDate,
    exact_time_24: best?.time_24 || null,
    exact_time_12: best?.time_12 || null,
    exact_datetime_utc: formatIsoDateTimeUTC(bestDateTime),
    tolerance: buildTimeTolerance(best, second),
    confidence_score: buildTimeConfidence(best, second),
    why_this_time_wins: buildWhyThisTimeWins(best, second),
    source_domain_key: best?.strongest_slot?.domain_key || null,
    source_domain_label: best?.strongest_slot?.domain_label || null,
    source_event_type: best?.strongest_slot?.event_type || null,
    source_event_number: best?.strongest_slot?.event_number || null,
    source_event_status: best?.strongest_slot?.event_status || null,
    score_gap: round2(Number(best?.total_score || 0) - Number(second?.total_score || 0))
  };

  const primary_future_time_packet = best
    ? {
        exact_date: exactDate,
        exact_time_24: best.time_24,
        exact_time_12: best.time_12,
        exact_datetime_utc: formatIsoDateTimeUTC(bestDateTime),
        tolerance: exact_time_lock.tolerance,
        confidence_score: exact_time_lock.confidence_score,
        source_domain_key: best.strongest_slot?.domain_key || null,
        source_domain_label: best.strongest_slot?.domain_label || null,
        source_event_type: best.strongest_slot?.event_type || null,
        source_event_number: best.strongest_slot?.event_number || null,
        source_event_status: best.strongest_slot?.event_status || null,
        total_score: best.total_score,
        linked_domain_count: best.linked_domain_count,
        hit_count: best.hit_count
      }
    : null;

  return {
    flat_micro_candidates,
    compressed_micro_slots,
    exact_time_lock,
    primary_future_time_packet,
    alternative_time_candidates: buildAlternativeTimeCandidates(
      compressed_micro_slots,
      exactDate
    ),
    micro_timing_radar: buildMicroRadar(compressed_micro_slots, exactDate)
  };
}