// lib/future-layer-micro-timing.js

const asArray = (v) => (Array.isArray(v) ? v : []);
const asObj = (v) => (v && typeof v === "object" ? v : {});
const asNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

function toDateSafe(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateOnly(dateObj) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return null;
  return dateObj.toISOString().slice(0, 10);
}

function addMinutes(dateObj, minutes) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return null;
  return new Date(dateObj.getTime() + minutes * 60000);
}

function buildLocalIso(dateStr, hour, minute) {
  if (!dateStr) return null;
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${dateStr}T${hh}:${mm}:00`;
}

function bandToClockRange(band) {
  const map = {
    "05:00-08:00": { start_hour: 5, start_minute: 0, end_hour: 8, end_minute: 0 },
    "06:00-10:00": { start_hour: 6, start_minute: 0, end_hour: 10, end_minute: 0 },
    "09:00-13:00": { start_hour: 9, start_minute: 0, end_hour: 13, end_minute: 0 },
    "10:00-15:00": { start_hour: 10, start_minute: 0, end_hour: 15, end_minute: 0 },
    "11:00-17:00": { start_hour: 11, start_minute: 0, end_hour: 17, end_minute: 0 },
    "13:00-18:00": { start_hour: 13, start_minute: 0, end_hour: 18, end_minute: 0 },
    "16:00-22:00": { start_hour: 16, start_minute: 0, end_hour: 22, end_minute: 0 },
    "18:00-23:00": { start_hour: 18, start_minute: 0, end_hour: 23, end_minute: 0 }
  };

  return map[band] || { start_hour: 11, start_minute: 0, end_hour: 17, end_minute: 0 };
}

function midpointMinutes(range) {
  const start = asNum(range.start_hour) * 60 + asNum(range.start_minute);
  const end = asNum(range.end_hour) * 60 + asNum(range.end_minute);
  return Math.round((start + end) / 2);
}

function chooseBandFromDomain(domainKey) {
  const fixed = {
    HEALTH: "06:00-10:00",
    DISEASE: "06:00-10:00",
    RECOVERY: "06:00-10:00",
    DOCUMENT: "09:00-13:00",
    LEGAL: "09:00-13:00",
    BUSINESS: "10:00-15:00",
    MONEY: "10:00-15:00",
    GAIN: "10:00-15:00",
    LOSS: "10:00-15:00",
    FOREIGN: "11:00-17:00",
    PROPERTY: "11:00-17:00",
    SETTLEMENT: "11:00-17:00",
    CAREER: "11:00-17:00",
    JOB: "11:00-17:00",
    MARRIAGE: "16:00-22:00",
    RELATIONSHIP: "16:00-22:00",
    DIVORCE: "16:00-22:00"
  };

  return fixed[domainKey] || "11:00-17:00";
}

function deriveBand(primaryPacket, winnerLock) {
  const packet = asObj(primaryPacket);
  const winner = asObj(winnerLock);

  return (
    packet.exact_time_band ||
    winner.exact_time_band ||
    chooseBandFromDomain(packet.source_domain_key || winner.winning_domain_key || "GENERAL")
  );
}

function deriveAnchorDate(primaryPacket, winnerLock, currentContext) {
  const packet = asObj(primaryPacket);
  const winner = asObj(winnerLock);

  if (packet.exact_date) return packet.exact_date;
  if (winner.exact_date) return winner.exact_date;

  const now =
    toDateSafe(asObj(currentContext).event_datetime_iso) ||
    new Date();

  const fallback = addMinutes(now, 7 * 24 * 60);
  return formatDateOnly(fallback);
}

function buildMicroPacket({
  anchorDate,
  timeBand,
  primaryPacket,
  winnerLock,
  currentContext
}) {
  const packet = asObj(primaryPacket);
  const winner = asObj(winnerLock);

  const range = bandToClockRange(timeBand);
  const midpoint = midpointMinutes(range);

  const chosenHour = Math.floor(midpoint / 60);
  const chosenMinute = midpoint % 60;

  const exact_local_datetime = buildLocalIso(anchorDate, chosenHour, chosenMinute);

  const now =
    toDateSafe(asObj(currentContext).event_datetime_iso) ||
    new Date();

  const anchorDateObj = toDateSafe(`${anchorDate}T00:00:00Z`);
  const daysAway =
    anchorDateObj instanceof Date && !Number.isNaN(anchorDateObj.getTime())
      ? Math.round((anchorDateObj.getTime() - now.getTime()) / 86400000)
      : null;

  return {
    exact_date: anchorDate,
    exact_time_band: timeBand,
    exact_local_datetime,
    chosen_hour: chosenHour,
    chosen_minute: chosenMinute,
    tolerance_minutes: 90,
    tolerance_text: "±90 minutes",
    days_from_now: daysAway,
    source_domain_key:
      packet.source_domain_key || winner.winning_domain_key || "GENERAL",
    source_domain_label:
      packet.source_domain_label || winner.winning_domain_label || "General",
    source_event_type:
      packet.source_event_type || winner.winning_event_type || "event",
    source_event_number:
      packet.source_event_number || winner.winning_event_number || 1,
    source_event_status:
      packet.source_event_status || winner.winning_event_status || "PENDING"
  };
}

function buildScanWindows(microPacket) {
  const p = asObj(microPacket);
  if (!p.exact_date || p.chosen_hour == null || p.chosen_minute == null) {
    return [];
  }

  const offsets = [-90, -60, -30, 0, 30, 60, 90];

  return offsets.map((offset, idx) => {
    const base = toDateSafe(buildLocalIso(p.exact_date, p.chosen_hour, p.chosen_minute));
    const shifted = addMinutes(base, offset);

    return {
      scan_rank: idx + 1,
      offset_minutes: offset,
      local_datetime: shifted ? shifted.toISOString() : null,
      emphasis: offset === 0 ? "PEAK" : Math.abs(offset) <= 30 ? "HIGH" : "SUPPORT"
    };
  });
}

function buildEventRadar(microPacket) {
  const p = asObj(microPacket);
  if (!p.exact_date) return null;

  const bandRange = bandToClockRange(p.exact_time_band);

  return {
    date: p.exact_date,
    time_band: p.exact_time_band,
    uk_window: `${String(bandRange.start_hour).padStart(2, "0")}:${String(
      bandRange.start_minute
    ).padStart(2, "0")} - ${String(bandRange.end_hour).padStart(2, "0")}:${String(
      bandRange.end_minute
    ).padStart(2, "0")}`,
    tolerance: p.tolerance_text,
    source_domain_key: p.source_domain_key,
    source_event_type: p.source_event_type
  };
}

export function runFutureMicroTimingLayer({
  primary_future_date_packet,
  dominant_date_lock,
  current_context
}) {
  const primaryPacket = asObj(primary_future_date_packet);
  const winnerLock = asObj(dominant_date_lock);
  const currentContext = asObj(current_context);

  const anchorDate = deriveAnchorDate(primaryPacket, winnerLock, currentContext);
  const timeBand = deriveBand(primaryPacket, winnerLock);

  const micro_timing_packet = buildMicroPacket({
    anchorDate,
    timeBand,
    primaryPacket,
    winnerLock,
    currentContext
  });

  const nano_scan_windows = buildScanWindows(micro_timing_packet);
  const event_radar = buildEventRadar(micro_timing_packet);

  return {
    micro_timing_packet,
    nano_scan_windows,
    event_radar
  };
}