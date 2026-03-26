// lib/chart-core.js

function str(v) {
  return v == null ? "" : String(v).trim();
}

function toNum(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeTimezoneOffset(v) {
  const x = str(v || "+06:00");
  if (/^[+-]\d{2}:\d{2}$/.test(x)) return x;
  return "+06:00";
}

function buildBirthIso(dob, tob, timezone_offset) {
  const d = str(dob);
  const t = str(tob || "12:00");
  const z = normalizeTimezoneOffset(timezone_offset);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  if (!/^\d{2}:\d{2}$/.test(t)) return null;

  return `${d}T${t}:00${z}`;
}

function safeNowIso(current_datetime_iso) {
  const x = str(current_datetime_iso);
  if (!x) return new Date().toISOString();
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export async function buildChartCore(input, astroProvider) {
  const name = str(input.name);
  const dob = str(input.dob);
  const tob = str(input.tob || "12:00");
  const pob = str(input.pob);
  const latitude = toNum(input.latitude);
  const longitude = toNum(input.longitude);
  const timezone_offset = normalizeTimezoneOffset(input.timezone_offset);

  if (!dob) {
    return {
      system_status: "ERROR",
      error_message: "DOB is required"
    };
  }

  const birth_datetime_iso = buildBirthIso(dob, tob, timezone_offset);
  if (!birth_datetime_iso) {
    return {
      system_status: "ERROR",
      error_message: "Invalid DOB/TOB format. Expected dob=YYYY-MM-DD and tob=HH:MM"
    };
  }

  const current_datetime_iso = safeNowIso(input.current_datetime_iso);

  const input_normalized = {
    name,
    dob,
    tob,
    pob,
    latitude,
    longitude,
    timezone_offset,
    question: str(input.question),
    facts: str(input.facts),
    current_datetime_iso: str(input.current_datetime_iso || "")
  };

  const birth_context = {
    birth_datetime_iso,
    birthplace: pob,
    latitude,
    longitude,
    timezone_offset
  };

  const current_context = {
    event_datetime_iso: current_datetime_iso,
    latitude,
    longitude,
    timezone_offset
  };

  const evidence_packet = await astroProvider.buildEvidence({
    birth_datetime_iso,
    latitude,
    longitude,
    current_datetime_iso
  });

  return {
    system_status: "OK",
    mode: "FULL_BIRTH_MODE",
    input_normalized,
    birth_context,
    current_context,
    evidence_packet
  };
}