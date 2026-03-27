// lib/provider-adapter.js

function toNumber(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeString(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function normalizeQuestion(rawPayload = {}) {
  return normalizeString(rawPayload.question, "next major event exact date and time");
}

function normalizeFacts(rawPayload = {}) {
  return normalizeString(rawPayload.facts, "");
}

function normalizeBirthInput(rawPayload = {}) {
  return {
    name: normalizeString(rawPayload.name, "UNKNOWN"),
    dob: normalizeString(rawPayload.dob, ""),
    tob: normalizeString(rawPayload.tob, ""),
    pob: normalizeString(rawPayload.pob, ""),
    latitude: toNumber(rawPayload.latitude, null),
    longitude: toNumber(rawPayload.longitude, null),
    timezone_offset: normalizeString(rawPayload.timezone_offset, "+00:00"),
    question: normalizeQuestion(rawPayload),
    facts: normalizeFacts(rawPayload),
    current_datetime_iso: normalizeString(rawPayload.current_datetime_iso, "")
  };
}

function buildInputNormalized(rawPayload = {}) {
  const birth = normalizeBirthInput(rawPayload);

  return {
    ...birth,
    raw_payload: { ...rawPayload }
  };
}

function buildBirthContext(inputNormalized = {}) {
  const {
    dob,
    tob,
    pob,
    latitude,
    longitude,
    timezone_offset
  } = inputNormalized;

  const birth_datetime_iso =
    dob && tob
      ? `${dob}T${tob}:00${timezone_offset || "+00:00"}`
      : null;

  return {
    birth_datetime_iso,
    birthplace: pob || "UNKNOWN",
    latitude,
    longitude,
    timezone_offset: timezone_offset || "+00:00"
  };
}

function buildCurrentContext(inputNormalized = {}) {
  return {
    event_datetime_iso:
      inputNormalized.current_datetime_iso ||
      new Date().toISOString(),
    latitude: inputNormalized.latitude,
    longitude: inputNormalized.longitude,
    timezone_offset: inputNormalized.timezone_offset || "+00:00"
  };
}

function buildQuestionProfile(inputNormalized = {}) {
  const q = normalizeString(inputNormalized.question, "").toLowerCase();

  const asks_count =
    q.includes("how many") ||
    q.includes("count") ||
    q.includes("koita") ||
    q.includes("koyta");

  const asks_timing =
    q.includes("when") ||
    q.includes("time") ||
    q.includes("date") ||
    q.includes("exact") ||
    q.includes("kobe");

  const asks_status =
    q.includes("status") ||
    q.includes("will") ||
    q.includes("happen") ||
    q.includes("possible");

  const asks_general = !asks_count && !asks_timing && !asks_status;

  return {
    raw_question: inputNormalized.question || "",
    asks_count,
    asks_timing,
    asks_status,
    asks_general,
    primary_domain: "FUTURE"
  };
}

function buildFactAnchorBlock(inputNormalized = {}) {
  const rawText = normalizeString(inputNormalized.facts, "");
  return {
    provided: rawText.length > 0,
    raw_text: rawText
  };
}

function buildProviderAdapter(rawPayload = {}) {
  const input_normalized = buildInputNormalized(rawPayload);
  const birth_context = buildBirthContext(input_normalized);
  const current_context = buildCurrentContext(input_normalized);
  const question_profile = buildQuestionProfile(input_normalized);
  const fact_anchor_block = buildFactAnchorBlock(input_normalized);

  return {
    input_normalized,
    birth_context,
    current_context,
    question_profile,
    fact_anchor_block
  };
}

export {
  buildProviderAdapter,
  buildInputNormalized,
  buildBirthContext,
  buildCurrentContext,
  buildQuestionProfile,
  buildFactAnchorBlock
};

export default buildProviderAdapter;