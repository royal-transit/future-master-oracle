export default function handler(req, res) {
  try {
    const now = new Date();
    const query = req.query || {};

    const rawDob = typeof query.dob === "string" ? query.dob.trim() : "";
    const rawName = typeof query.name === "string" ? query.name.trim() : "";
    const rawQuestion = typeof query.question === "string" ? query.question.trim() : "";

    const hasDob = rawDob.length > 0;
    const hasName = rawName.length > 0;

    const dobValidation = validateDob(rawDob);
    const dobReady = dobValidation.valid && !!dobValidation.normalized;

    const ageContext = dobReady ? buildAgeContext(dobValidation.normalized, now) : null;

    const futureTimeline = buildFutureTimeline(ageContext);
    const domainIntent = detectDomain(rawQuestion);

    const response = {
      endpoint_called: "future-oracle.js",
      engine_status: "FUTURE_MASTER_PHASE_1",
      system_status: "ACTIVE",
      generated_at_utc: now.toISOString(),

      input: {
        name: rawName || null,
        dob: rawDob || null,
        question: rawQuestion || null
      },

      validation: {
        dob_valid: dobValidation.valid,
        normalized_dob: dobValidation.normalized
      },

      age_context: ageContext,

      future_timeline_engine: futureTimeline,

      domain_detection: domainIntent,

      next_stage: "EVENT_DETECTION_PHASE"
    };

    return res.status(200).json(response);

  } catch (error) {
    return res.status(500).json({
      engine_status: "FUTURE_MASTER_PHASE_1",
      error: error.message
    });
  }
}

function validateDob(dob) {
  if (!dob) return { valid: false };

  const parts = dob.split("-");
  if (parts.length !== 3) return { valid: false };

  return {
    valid: true,
    normalized: dob
  };
}

function buildAgeContext(dob, now) {
  const birth = new Date(dob);
  const age = now.getFullYear() - birth.getFullYear();

  return {
    age_years: age,
    stage:
      age < 25 ? "YOUTH"
      : age < 40 ? "BUILD_PHASE"
      : age < 60 ? "POWER_PHASE"
      : "LEGACY_PHASE"
  };
}

function buildFutureTimeline(ageContext) {
  if (!ageContext) {
    return {
      status: "LIMITED",
      note: "DOB required for full future scan"
    };
  }

  return {
    status: "ACTIVE",

    short_term: "0–7 days",
    mid_term: "7–90 days",
    long_term: "3–24 months",

    life_cycle_window:
      ageContext.stage === "YOUTH"
        ? "foundation building"
        : ageContext.stage === "BUILD_PHASE"
        ? "career and relationship structuring"
        : ageContext.stage === "POWER_PHASE"
        ? "peak expansion and consolidation"
        : "legacy and stability phase"
  };
}

function detectDomain(question) {
  if (!question) return "GENERAL";

  const q = question.toLowerCase();

  if (q.includes("money") || q.includes("income")) return "MONEY";
  if (q.includes("love") || q.includes("relationship")) return "RELATIONSHIP";
  if (q.includes("marriage")) return "MARRIAGE";
  if (q.includes("business") || q.includes("job")) return "CAREER";

  return "GENERAL";
}
