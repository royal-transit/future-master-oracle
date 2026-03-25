export default function handler(req, res) {
  try {
    const now = new Date();
    const query = req.query || {};

    const rawDob = typeof query.dob === "string" ? query.dob.trim() : "";
    const rawName = typeof query.name === "string" ? query.name.trim() : "";
    const rawQuestion = typeof query.question === "string" ? query.question.trim() : "";

    const dobValidation = validateDob(rawDob);
    const dobReady = dobValidation.valid && !!dobValidation.normalized;

    const ageContext = dobReady ? buildAgeContext(dobValidation.normalized, now) : null;
    const domainRouting = detectDomain(rawQuestion);

    const timelineEngine = buildFutureTimeline(ageContext);
    const eventDetectionEngine = buildEventDetection(ageContext, domainRouting);
    const lifeBlueprintEngine = buildLifeBlueprint(ageContext, domainRouting);
    const majorFutureWindows = buildMajorFutureWindows(ageContext, domainRouting);
    const precisionEventWindows = buildPrecisionEventWindows(ageContext, domainRouting);
    const remainingLifeMap = buildRemainingLifeMap(ageContext);
    const confidenceBlock = buildConfidenceBlock(ageContext, domainRouting, rawQuestion);
    const summaryBlock = buildSummaryBlock({
      ageContext,
      domainRouting,
      eventDetectionEngine,
      majorFutureWindows,
      precisionEventWindows,
      remainingLifeMap,
      confidenceBlock
    });
    const lokkothaBlock = buildLokkothaBlock({
      ageContext,
      domainRouting,
      majorFutureWindows,
      precisionEventWindows
    });
    const finalVerdictBlock = buildFinalVerdictBlock({
      ageContext,
      domainRouting,
      precisionEventWindows,
      confidenceBlock
    });
    const projectPasteBlock = buildProjectPasteBlock({
      rawName,
      normalizedDob: dobValidation.normalized,
      domainRouting,
      ageContext,
      confidenceBlock,
      precisionEventWindows,
      majorFutureWindows,
      remainingLifeMap,
      summaryBlock,
      lokkothaBlock,
      finalVerdictBlock
    });

    const response = {
      engine_status: "FUTURE_MASTER_PHASE_4_PREMIUM",
      system_status: "ACTIVE",
      generated_at_utc: now.toISOString(),

      input_block: {
        name: rawName || null,
        dob: rawDob || null,
        question: rawQuestion || null
      },

      validation_block: {
        dob_valid: dobValidation.valid,
        normalized_dob: dobValidation.normalized,
        dob_error: dobValidation.error
      },

      core_analysis: {
        age_context: ageContext,
        domain_detection: domainRouting,
        confidence_block: confidenceBlock
      },

      event_block: {
        future_timeline_engine: timelineEngine,
        event_detection_engine: eventDetectionEngine,
        life_blueprint_engine: lifeBlueprintEngine,
        major_future_windows: majorFutureWindows,
        precision_event_windows: precisionEventWindows,
        remaining_life_map: remainingLifeMap
      },

      summary_block: summaryBlock,

      lokkotha_block: lokkothaBlock,

      project_paste_block: projectPasteBlock,

      final_verdict: finalVerdictBlock
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      engine_status: "FUTURE_MASTER_PHASE_4_PREMIUM",
      system_status: "ERROR",
      error_message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

function validateDob(dob) {
  if (!dob) {
    return {
      valid: false,
      normalized: null,
      error: "DOB not supplied"
    };
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
      : ageYears >= 53
      ? "MEDIUM"
      : "MEDIUM";

  return {
    age_years: ageYears,
    stage,
    intensity_zone: intensityZone,
    current_band:
      ageYears <= 24
        ? "EARLY_FORMATION"
        : ageYears <= 35
        ? "PRE_RISE_BUILD"
        : ageYears <= 42
        ? "DESTINY_ACTIVATION"
        : ageYears <= 52
        ? "POWER_CONSOLIDATION"
        : "STABILITY_AND_LEGACY"
  };
}

function detectDomain(question) {
  const q = (question || "").toLowerCase();

  if (
    q.includes("money") ||
    q.includes("income") ||
    q.includes("payment") ||
    q.includes("debt") ||
    q.includes("rizq")
  ) {
    return {
      dominant_domain: "MONEY",
      routing_mode: "QUESTION_GUIDED_SCAN"
    };
  }

  if (
    q.includes("career") ||
    q.includes("job") ||
    q.includes("business") ||
    q.includes("work") ||
    q.includes("profession")
  ) {
    return {
      dominant_domain: "CAREER",
      routing_mode: "QUESTION_GUIDED_SCAN"
    };
  }

  if (
    q.includes("love") ||
    q.includes("relationship") ||
    q.includes("partner") ||
    q.includes("girlfriend") ||
    q.includes("boyfriend")
  ) {
    return {
      dominant_domain: "RELATIONSHIP",
      routing_mode: "QUESTION_GUIDED_SCAN"
    };
  }

  if (
    q.includes("marriage") ||
    q.includes("wife") ||
    q.includes("husband") ||
    q.includes("marry")
  ) {
    return {
      dominant_domain: "MARRIAGE",
      routing_mode: "QUESTION_GUIDED_SCAN"
    };
  }

  if (
    q.includes("move") ||
    q.includes("relocation") ||
    q.includes("abroad") ||
    q.includes("country") ||
    q.includes("house") ||
    q.includes("home")
  ) {
    return {
      dominant_domain: "RELOCATION",
      routing_mode: "QUESTION_GUIDED_SCAN"
    };
  }

  return {
    dominant_domain: "GENERAL",
    routing_mode: "GENERAL_SCAN"
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
    short_term: "0-30 days",
    mid_term: "1-3 months",
    expansion_term: "3-9 months",
    peak_term: "9-18 months",
    long_term: "18-36 months",
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

function buildEventDetection(ageContext, domainRouting) {
  if (!ageContext) {
    return {
      status: "LIMITED",
      note: "DOB required"
    };
  }

  const domain = domainRouting.dominant_domain;
  const high = ageContext.intensity_zone === "HIGH";
  const highStrength = high ? "HIGH" : "MEDIUM";

  const general = {
    immediate_signal: "communication trigger / small opportunity",
    near_signal: "decision phase / visible movement",
    expansion_signal: "major restructuring / meaningful shift",
    peak_signal: "high-probability breakthrough phase",
    dominant_strength: highStrength
  };

  const domainMap = {
    MONEY: {
      immediate_signal: "small money contact / earnings discussion",
      near_signal: "payment turn / financial decision / income movement",
      expansion_signal: "financial upgrade / stronger cash pattern",
      peak_signal: "high-probability earnings jump or money structure reset",
      dominant_strength: highStrength
    },
    CAREER: {
      immediate_signal: "work contact / opportunity message / role signal",
      near_signal: "career decision / business movement / responsibility increase",
      expansion_signal: "scale growth / business advancement / authority rise",
      peak_signal: "high-probability career shift or major professional breakthrough",
      dominant_strength: highStrength
    },
    RELATIONSHIP: {
      immediate_signal: "message / emotional opening / contact return",
      near_signal: "bond clarification / relationship movement",
      expansion_signal: "serious emotional shift / attachment deepening",
      peak_signal: "high-probability relationship chapter change",
      dominant_strength: highStrength
    },
    MARRIAGE: {
      immediate_signal: "family talk / marriage topic signal",
      near_signal: "proposal / commitment discussion / serious alignment",
      expansion_signal: "marriage structuring / formal union movement",
      peak_signal: "high-probability marriage window",
      dominant_strength: highStrength
    },
    RELOCATION: {
      immediate_signal: "movement talk / logistics / location signal",
      near_signal: "planning / decision / route opening",
      expansion_signal: "environment change / relocation groundwork",
      peak_signal: "high-probability move or relocation window",
      dominant_strength: highStrength
    }
  };

  return {
    status: "ACTIVE",
    dominant_domain: domain,
    ...(domainMap[domain] || general)
  };
}

function buildLifeBlueprint(ageContext, domainRouting) {
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
    question_domain_bias: domainRouting.dominant_domain
  };
}

function buildMajorFutureWindows(ageContext, domainRouting) {
  if (!ageContext) {
    return {
      status: "LIMITED",
      note: "DOB required"
    };
  }

  const age = ageContext.age_years;
  const domain = domainRouting.dominant_domain;

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
      theme:
        domain === "MARRIAGE"
          ? "formal union or commitment structuring"
          : domain === "RELATIONSHIP"
          ? "major bond turning point"
          : domain === "MONEY"
          ? "earnings pattern upgrade"
          : domain === "CAREER"
          ? "career identity shift and scale jump"
          : domain === "RELOCATION"
          ? "major relocation or environment shift"
          : "major life direction restructuring",
      strength: "HIGH"
    }
  };
}

function buildPrecisionEventWindows(ageContext, domainRouting) {
  if (!ageContext) {
    return {
      status: "LIMITED",
      note: "DOB required"
    };
  }

  const domain = domainRouting.dominant_domain;
  const high = ageContext.intensity_zone === "HIGH";

  const byDomain = {
    GENERAL: {
      immediate: { window: "0-30 days", trigger: "incoming signal / small opening", action: "stay alert and respond early" },
      near_term: { window: "1-3 months", trigger: "decision pressure / visible movement", action: "avoid hesitation" },
      expansion: { window: "3-9 months", trigger: "growth opening / structural expansion", action: "push the strongest direction" },
      peak: { window: "9-18 months", trigger: "major life shift / breakthrough corridor", action: "commit fully when signal confirms" }
    },
    MONEY: {
      immediate: { window: "0-30 days", trigger: "money talk / payment contact", action: "track cash opportunities closely" },
      near_term: { window: "1-3 months", trigger: "income movement / deal decision", action: "choose the stronger earning path" },
      expansion: { window: "3-9 months", trigger: "visible earnings improvement", action: "expand disciplined income channels" },
      peak: { window: "9-18 months", trigger: "strong earnings reset / financial rise", action: "scale and stabilize gains" }
    },
    CAREER: {
      immediate: { window: "0-30 days", trigger: "work message / role signal", action: "reply fast and stay prepared" },
      near_term: { window: "1-3 months", trigger: "career decision / business move", action: "act, do not delay" },
      expansion: { window: "3-9 months", trigger: "authority rise / growth chance", action: "push expansion strategically" },
      peak: { window: "9-18 months", trigger: "career breakthrough / strong repositioning", action: "lock the higher lane" }
    },
    RELATIONSHIP: {
      immediate: { window: "0-30 days", trigger: "contact / emotional opening", action: "observe tone and sincerity" },
      near_term: { window: "1-3 months", trigger: "bond clarification / emotional decision", action: "do not force unclear ties" },
      expansion: { window: "3-9 months", trigger: "serious emotional development", action: "stabilize mutual direction" },
      peak: { window: "9-18 months", trigger: "relationship chapter shift", action: "choose truth over delay" }
    },
    MARRIAGE: {
      immediate: { window: "0-30 days", trigger: "marriage topic signal", action: "watch family alignment" },
      near_term: { window: "1-3 months", trigger: "serious commitment discussion", action: "clarify intention early" },
      expansion: { window: "3-9 months", trigger: "formalization movement", action: "stabilize practical conditions" },
      peak: { window: "9-18 months", trigger: "marriage window activation", action: "move when structure is ready" }
    },
    RELOCATION: {
      immediate: { window: "0-30 days", trigger: "movement talk / route signal", action: "collect accurate logistics" },
      near_term: { window: "1-3 months", trigger: "location decision", action: "avoid confused planning" },
      expansion: { window: "3-9 months", trigger: "move preparation / shift pathway", action: "prepare resources and timing" },
      peak: { window: "9-18 months", trigger: "major relocation opening", action: "commit when the route becomes clear" }
    }
  };

  return {
    status: "ACTIVE",
    intensity_zone: ageContext.intensity_zone,
    high_activation: high,
    ...(byDomain[domain] || byDomain.GENERAL)
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

function buildConfidenceBlock(ageContext, domainRouting, rawQuestion) {
  if (!ageContext) {
    return {
      confidence_band: "LOW",
      confidence_score: 25,
      reasons: ["DOB missing or invalid"]
    };
  }

  let score = 55;
  const reasons = ["Valid DOB supplied"];

  if (ageContext.intensity_zone === "HIGH") {
    score += 20;
    reasons.push("High activation age band");
  } else if (ageContext.intensity_zone === "MEDIUM_HIGH") {
    score += 10;
    reasons.push("Elevated activation age band");
  }

  if (domainRouting.routing_mode === "QUESTION_GUIDED_SCAN") {
    score += 10;
    reasons.push("Question-guided domain routing active");
  }

  if (rawQuestion && rawQuestion.trim().length > 0) {
    score += 5;
    reasons.push("Question context supplied");
  }

  let band = "MEDIUM";
  if (score >= 80) band = "HIGH";
  else if (score < 50) band = "LOW";

  return {
    confidence_band: band,
    confidence_score: score,
    reasons
  };
}

function buildSummaryBlock({
  ageContext,
  domainRouting,
  eventDetectionEngine,
  majorFutureWindows,
  precisionEventWindows,
  remainingLifeMap,
  confidenceBlock
}) {
  if (!ageContext) {
    return {
      readable_summary: "A valid DOB is required for a premium future scan.",
      compact_summary: "DOB needed for future scan"
    };
  }

  const readable =
    `You are currently in ${ageContext.stage} at age ${ageContext.age_years}, operating inside the ${ageContext.current_band} activation band. ` +
    `The dominant future reading is ${domainRouting.dominant_domain}. ` +
    `Immediate future shows ${eventDetectionEngine.immediate_signal}. ` +
    `The 3-12 month window shows ${majorFutureWindows.expansion_window.theme}. ` +
    `The strongest 12-24 month movement is ${majorFutureWindows.destiny_window.theme}. ` +
    `The clearest precision trigger is ${precisionEventWindows.peak.trigger}. ` +
    `Overall confidence is ${confidenceBlock.confidence_band}.`;

  const compact =
    `Age ${ageContext.age_years} | ${domainRouting.dominant_domain} | ` +
    `${majorFutureWindows.expansion_window.label}: ${majorFutureWindows.expansion_window.theme} | ` +
    `${majorFutureWindows.destiny_window.label}: ${majorFutureWindows.destiny_window.theme} | ` +
    `Current band ${remainingLifeMap.current_band}`;

  return {
    readable_summary: readable,
    compact_summary: compact
  };
}

function buildLokkothaBlock({ ageContext, domainRouting, majorFutureWindows, precisionEventWindows }) {
  if (!ageContext) {
    return {
      text: "তারিখ ছাড়া দূরের পথ ধরা যায় না।"
    };
  }

  const domainText =
    domainRouting.dominant_domain === "MONEY"
      ? "টাকার হাঁড়ি"
      : domainRouting.dominant_domain === "CAREER"
      ? "কর্মের চাকা"
      : domainRouting.dominant_domain === "RELATIONSHIP"
      ? "মনের সেতু"
      : domainRouting.dominant_domain === "MARRIAGE"
      ? "ঘর বাঁধার দড়ি"
      : domainRouting.dominant_domain === "RELOCATION"
      ? "পথের বোঝা"
      : "ভাগ্যের রথ";

  return {
    text:
      `${domainText} এখন থেমে নেই; ${precisionEventWindows.immediate.window}-এ ছোট সাড়া, ` +
      `${majorFutureWindows.expansion_window.label}-এ জোর নড়া, আর ${majorFutureWindows.destiny_window.label}-এ বড় দরজা খোলার যোগ।`
  };
}

function buildFinalVerdictBlock({ ageContext, domainRouting, precisionEventWindows, confidenceBlock }) {
  if (!ageContext) {
    return "Future premium scan not ready without valid DOB.";
  }

  return (
    `High-value future scan active. Dominant domain: ${domainRouting.dominant_domain}. ` +
    `The strongest actionable window begins in ${precisionEventWindows.near_term.window}, ` +
    `with major breakthrough probability concentrated in ${precisionEventWindows.peak.window}. ` +
    `Confidence: ${confidenceBlock.confidence_band}.`
  );
}

function buildProjectPasteBlock({
  rawName,
  normalizedDob,
  domainRouting,
  ageContext,
  confidenceBlock,
  precisionEventWindows,
  majorFutureWindows,
  remainingLifeMap,
  summaryBlock,
  lokkothaBlock,
  finalVerdictBlock
}) {
  const lines = [];

  lines.push("FUTURE MASTER INTAKE");
  lines.push(`Name: ${rawName || "N/A"}`);
  lines.push(`DOB: ${normalizedDob || "N/A"}`);
  lines.push(`Dominant Domain: ${domainRouting.dominant_domain}`);
  lines.push(`Age: ${ageContext ? ageContext.age_years : "N/A"}`);
  lines.push(`Stage: ${ageContext ? ageContext.stage : "N/A"}`);
  lines.push(`Current Band: ${ageContext ? ageContext.current_band : "N/A"}`);
  lines.push(`Confidence Band: ${confidenceBlock.confidence_band}`);
  lines.push(`Confidence Score: ${confidenceBlock.confidence_score}`);

  lines.push(`Immediate Window: ${precisionEventWindows.immediate?.window || "N/A"}`);
  lines.push(`Near-Term Window: ${precisionEventWindows.near_term?.window || "N/A"}`);
  lines.push(`Expansion Window: ${majorFutureWindows.expansion_window?.label || "N/A"}`);
  lines.push(`Destiny Window: ${majorFutureWindows.destiny_window?.label || "N/A"}`);
  lines.push(`Current Progression Band: ${remainingLifeMap.current_band || "N/A"}`);

  lines.push("Readable Summary:");
  lines.push(summaryBlock.readable_summary);

  lines.push("Lokkotha Summary:");
  lines.push(lokkothaBlock.text);

  lines.push("Final Practical Verdict:");
  lines.push(finalVerdictBlock);

  lines.push("FUTURE MASTER BLOCK END");

  return lines.join("\n");
}