export default function handler(req, res) {
  try {
    const { dob = "", question = "", name = "" } = req.query;

    const now = new Date();
    const dobValidation = validateDob(String(dob).trim());
    const dobReady = dobValidation.valid && !!dobValidation.normalized;

    const ageContext = dobReady ? buildAgeContext(dobValidation.normalized, now) : null;
    const questionDomain = detectDomain(String(question).trim());

    const futureTimeline = buildFutureTimeline(ageContext);
    const eventDetection = buildEventDetection(ageContext, questionDomain);
    const lifeBlueprint = buildLifeBlueprint(ageContext, questionDomain);
    const majorFutureWindows = buildMajorFutureWindows(ageContext, questionDomain);
    const remainingLifeMap = buildRemainingLifeMap(ageContext);

    const response = {
      endpoint_called: "future-oracle.js",
      engine_status: "FUTURE_MASTER_PHASE_3",
      system_status: "ACTIVE",
      generated_at_utc: now.toISOString(),

      input: {
        name: String(name).trim() || null,
        dob: String(dob).trim() || null,
        question: String(question).trim() || null
      },

      validation: {
        dob_valid: dobValidation.valid,
        normalized_dob: dobValidation.normalized,
        dob_error: dobValidation.error
      },

      age_context: ageContext,

      domain_detection: {
        dominant_domain: questionDomain,
        routing_mode: questionDomain === "GENERAL" ? "GENERAL_SCAN" : "QUESTION_GUIDED_SCAN"
      },

      future_timeline_engine: futureTimeline,

      event_detection_engine: eventDetection,

      life_blueprint_engine: lifeBlueprint,

      major_future_windows: majorFutureWindows,

      remaining_life_map: remainingLifeMap,

      readable_future_summary: buildReadableFutureSummary({
        ageContext,
        questionDomain,
        eventDetection,
        majorFutureWindows,
        remainingLifeMap
      }),

      lokkotha_summary: buildLokkothaSummary({
        ageContext,
        questionDomain,
        majorFutureWindows
      }),

      next_stage: "PRECISION_EVENT_WINDOW_PHASE"
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      engine_status: "FUTURE_MASTER_PHASE_3",
      system_status: "ERROR",
      error_message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

function validateDob(dob) {
  if (!dob) {
    return { valid: false, normalized: null, error: "DOB not supplied" };
  }

  const isoLike = /^(\d{4})-(\d{2})-(\d{2})$/;
  const slashLike = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

  if (isoLike.test(dob)) {
    const [, y, m, d] = dob.match(isoLike) || [];
    if (!isRealDate(Number(y), Number(m), Number(d))) {
      return { valid: false, normalized: null, error: "Invalid YYYY-MM-DD date" };
    }
    return { valid: true, normalized: `${y}-${m}-${d}`, error: null };
  }

  if (slashLike.test(dob)) {
    const [, d, m, y] = dob.match(slashLike) || [];
    const dd = String(d).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    if (!isRealDate(Number(y), Number(mm), Number(dd))) {
      return { valid: false, normalized: null, error: "Invalid DD/MM/YYYY date" };
    }
    return { valid: true, normalized: `${y}-${mm}-${dd}`, error: null };
  }

  return {
    valid: false,
    normalized: null,
    error: "Unsupported DOB format. Use YYYY-MM-DD or DD/MM/YYYY"
  };
}

function isRealDate(year, month, day) {
  if (!year || !month || !day) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function buildAgeContext(normalizedDob, now) {
  const birth = new Date(`${normalizedDob}T00:00:00Z`);
  const current = new Date(now.toISOString());

  let ageYears = current.getUTCFullYear() - birth.getUTCFullYear();
  const currentMonthDay = `${String(current.getUTCMonth() + 1).padStart(2, "0")}-${String(
    current.getUTCDate()
  ).padStart(2, "0")}`;
  const birthMonthDay = `${String(birth.getUTCMonth() + 1).padStart(2, "0")}-${String(
    birth.getUTCDate()
  ).padStart(2, "0")}`;
  if (currentMonthDay < birthMonthDay) ageYears -= 1;

  const stage =
    ageYears < 25
      ? "YOUTH"
      : ageYears < 40
      ? "BUILD_PHASE"
      : ageYears < 60
      ? "POWER_PHASE"
      : "LEGACY_PHASE";

  const intensityZone =
    ageYears >= 36 && ageYears <= 42
      ? "HIGH"
      : ageYears >= 28 && ageYears <= 35
      ? "MEDIUM_HIGH"
      : ageYears >= 43 && ageYears <= 52
      ? "MEDIUM_HIGH"
      : "MEDIUM";

  return {
    age_years: ageYears,
    stage,
    intensity_zone: intensityZone
  };
}

function detectDomain(question) {
  if (!question) return "GENERAL";
  const q = question.toLowerCase();

  if (
    q.includes("money") ||
    q.includes("income") ||
    q.includes("payment") ||
    q.includes("debt")
  ) return "MONEY";

  if (
    q.includes("career") ||
    q.includes("job") ||
    q.includes("business") ||
    q.includes("work")
  ) return "CAREER";

  if (
    q.includes("love") ||
    q.includes("relationship") ||
    q.includes("partner")
  ) return "RELATIONSHIP";

  if (q.includes("marriage") || q.includes("wife") || q.includes("husband")) {
    return "MARRIAGE";
  }

  if (
    q.includes("move") ||
    q.includes("relocation") ||
    q.includes("abroad") ||
    q.includes("country") ||
    q.includes("house")
  ) return "RELOCATION";

  return "GENERAL";
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
    short_term: "0-7 days",
    mid_term: "7-90 days",
    long_term: "3-24 months",
    extended_life_scan: "2-12 years",
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

function buildEventDetection(ageContext, domain) {
  if (!ageContext) {
    return {
      status: "LIMITED",
      note: "DOB required"
    };
  }

  const high = ageContext.intensity_zone === "HIGH";
  const longImpact = high ? "HIGH" : "MEDIUM";

  const general = {
    short_term: {
      window: "0-7 days",
      event: "communication trigger / small opportunity",
      impact: "LOW"
    },
    mid_term: {
      window: "7-90 days",
      event: "decision phase / visible movement",
      impact: "MEDIUM"
    },
    long_term: {
      window: "3-24 months",
      event: "major restructuring / meaningful shift",
      impact: longImpact
    }
  };

  const domainMap = {
    MONEY: {
      short_term: { window: "0-7 days", event: "small money contact / financial discussion", impact: "LOW" },
      mid_term: { window: "7-90 days", event: "income movement / payment turn / money decision", impact: "MEDIUM" },
      long_term: { window: "3-24 months", event: "financial upgrade / stronger earnings structure", impact: longImpact }
    },
    CAREER: {
      short_term: { window: "0-7 days", event: "work contact / message / role signal", impact: "LOW" },
      mid_term: { window: "7-90 days", event: "career decision / business movement", impact: "MEDIUM" },
      long_term: { window: "3-24 months", event: "major career shift / scale expansion", impact: longImpact }
    },
    RELATIONSHIP: {
      short_term: { window: "0-7 days", event: "message / emotional contact / small opening", impact: "LOW" },
      mid_term: { window: "7-90 days", event: "relationship movement / bond clarification", impact: "MEDIUM" },
      long_term: { window: "3-24 months", event: "major bond shift / serious relationship chapter", impact: longImpact }
    },
    MARRIAGE: {
      short_term: { window: "0-7 days", event: "family talk / marriage topic signal", impact: "LOW" },
      mid_term: { window: "7-90 days", event: "proposal / serious commitment discussion", impact: "MEDIUM" },
      long_term: { window: "3-24 months", event: "marriage structuring / formal union window", impact: longImpact }
    },
    RELOCATION: {
      short_term: { window: "0-7 days", event: "movement signal / logistics talk", impact: "LOW" },
      mid_term: { window: "7-90 days", event: "location decision / travel / move planning", impact: "MEDIUM" },
      long_term: { window: "3-24 months", event: "major relocation / environment change", impact: longImpact }
    }
  };

  return {
    status: "ACTIVE",
    dominant_domain: domain,
    ...(domainMap[domain] || general)
  };
}

function buildLifeBlueprint(ageContext, domain) {
  if (!ageContext) {
    return {
      status: "LIMITED",
      note: "DOB required"
    };
  }

  const stageMap = {
    YOUTH: {
      main_task: "identity formation and path selection",
      risk_zone: "instability from scattered focus",
      reward_zone: "fast growth through skill alignment"
    },
    BUILD_PHASE: {
      main_task: "career base, income structure, relationship direction",
      risk_zone: "wrong long-term commitments or delayed action",
      reward_zone: "foundation building with visible rise"
    },
    POWER_PHASE: {
      main_task: "expansion, authority, wealth consolidation",
      risk_zone: "stress from burden overload",
      reward_zone: "peak positioning and durable gains"
    },
    LEGACY_PHASE: {
      main_task: "stability, transfer, protection of results",
      risk_zone: "rigidity or missed adaptation",
      reward_zone: "lasting reputation and secured structure"
    }
  };

  return {
    status: "ACTIVE",
    stage: ageContext.stage,
    dominant_life_theme: stageMap[ageContext.stage].main_task,
    current_risk_zone: stageMap[ageContext.stage].risk_zone,
    current_reward_zone: stageMap[ageContext.stage].reward_zone,
    question_domain_bias: domain
  };
}

function buildMajorFutureWindows(ageContext, domain) {
  if (!ageContext) {
    return {
      status: "LIMITED",
      note: "DOB required"
    };
  }

  const age = ageContext.age_years;

  return {
    status: "ACTIVE",
    immediate_window: {
      label: "0-3 months",
      theme: domain === "GENERAL" ? "signal gathering and directional shift" : `${domain.toLowerCase()} activation`,
      strength: "MEDIUM"
    },
    expansion_window: {
      label: "3-12 months",
      theme: age >= 36 && age <= 42 ? "high-probability expansion and visible movement" : "gradual opening and consolidation",
      strength: age >= 36 && age <= 42 ? "HIGH" : "MEDIUM"
    },
    destiny_window: {
      label: "12-24 months",
      theme: domain === "MARRIAGE"
        ? "formal union or commitment structuring"
        : domain === "RELATIONSHIP"
        ? "major bond turning point"
        : domain === "MONEY"
        ? "earnings pattern upgrade"
        : domain === "CAREER"
        ? "career identity shift and scale jump"
        : domain === "GENERAL"
        ? "major life direction restructuring"
        : "major life shift",
      strength: "HIGH"
    }
  };
}

function buildRemainingLifeMap(ageContext) {
  if (!ageContext) {
    return {
      status: "LIMITED",
      note: "DOB required"
    };
  }

  const age = ageContext.age_years;

  return {
    status: "ACTIVE",
    current_band: `${age}-${age + 4}`,
    next_band: `${age + 5}-${age + 9}`,
    future_band: `${age + 10}-${age + 15}`,
    expected_progression: [
      {
        band: `${age}-${age + 4}`,
        theme: "restructuring and active decision period"
      },
      {
        band: `${age + 5}-${age + 9}`,
        theme: "consolidation and visible result period"
      },
      {
        band: `${age + 10}-${age + 15}`,
        theme: "stabilized authority / mature life pattern"
      }
    ]
  };
}

function buildReadableFutureSummary({
  ageContext,
  questionDomain,
  eventDetection,
  majorFutureWindows,
  remainingLifeMap
}) {
  if (!ageContext) {
    return {
      status: "LIMITED",
      text: "A full future scan needs a valid DOB."
    };
  }

  return {
    status: "ACTIVE",
    text:
      `You are currently in ${ageContext.stage} at age ${ageContext.age_years}. ` +
      `The dominant future scan is reading strongest in the ${questionDomain} domain. ` +
      `Short-term signals show ${eventDetection.short_term.event}. ` +
      `Mid-term signals show ${eventDetection.mid_term.event}. ` +
      `The strongest long-term movement is ${majorFutureWindows.destiny_window.theme}. ` +
      `Your current major progression band is ${remainingLifeMap.current_band}.`
  };
}

function buildLokkothaSummary({ ageContext, questionDomain, majorFutureWindows }) {
  if (!ageContext) {
    return {
      status: "LIMITED",
      text: "তারিখ ছাড়া দূরের পথ ধরা যায় না।"
    };
  }

  const domainText =
    questionDomain === "MONEY"
      ? "টাকার হাঁড়ি"
      : questionDomain === "CAREER"
      ? "কর্মের চাকা"
      : questionDomain === "RELATIONSHIP"
      ? "মনের সেতু"
      : questionDomain === "MARRIAGE"
      ? "ঘর বাঁধার দড়ি"
      : questionDomain === "RELOCATION"
      ? "পথের থলে"
      : "ভাগ্যের রথ";

  return {
    status: "ACTIVE",
    text: `${domainText} এখন থেমে নেই; সামনের বড় ঘুরনির আগে ছোট স্রোত already নড়ছে। প্রধান দরজা খুলবে ${majorFutureWindows.destiny_window.label} band-এ।`
  };
}