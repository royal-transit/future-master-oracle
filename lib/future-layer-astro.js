// lib/future-layer-astro.js

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function scoreDomain(domainKey, questionProfile, input) {
  const q = String(questionProfile?.raw_question || input?.question || "").toLowerCase();

  let score = 1;

  if (domainKey === "GENERAL") score += 1;

  if (q.includes("marriage") || q.includes("wife") || q.includes("husband") || q.includes("relationship")) {
    if (domainKey === "MARRIAGE") score += 10;
    if (domainKey === "DIVORCE") score += 6;
    if (domainKey === "LOVE") score += 4;
  }

  if (q.includes("career") || q.includes("job") || q.includes("work") || q.includes("business")) {
    if (domainKey === "CAREER") score += 10;
    if (domainKey === "JOB") score += 8;
    if (domainKey === "BUSINESS") score += 8;
    if (domainKey === "SUCCESS") score += 5;
  }

  if (q.includes("money") || q.includes("income") || q.includes("debt") || q.includes("finance")) {
    if (domainKey === "DEBT") score += 8;
    if (domainKey === "GAIN") score += 7;
    if (domainKey === "LOSS") score += 5;
  }

  if (q.includes("foreign") || q.includes("visa") || q.includes("abroad") || q.includes("settlement") || q.includes("relocation")) {
    if (domainKey === "FOREIGN") score += 10;
    if (domainKey === "IMMIGRATION") score += 10;
    if (domainKey === "SETTLEMENT") score += 8;
    if (domainKey === "VISA") score += 8;
    if (domainKey === "CITIZENSHIP") score += 7;
  }

  if (q.includes("legal") || q.includes("court") || q.includes("case") || q.includes("authority") || q.includes("penalty")) {
    if (domainKey === "LEGAL") score += 10;
    if (domainKey === "AUTHORITY") score += 8;
    if (domainKey === "DOCUMENT") score += 5;
  }

  if (q.includes("health") || q.includes("disease") || q.includes("surgery") || q.includes("recovery")) {
    if (domainKey === "HEALTH") score += 10;
    if (domainKey === "DISEASE") score += 9;
    if (domainKey === "SURGERY") score += 8;
    if (domainKey === "RECOVERY") score += 8;
  }

  if (q.includes("travel")) {
    if (domainKey === "TRAVEL_SHORT") score += 5;
    if (domainKey === "TRAVEL_LONG") score += 6;
    if (domainKey === "FOREIGN") score += 4;
  }

  if (q.includes("house") || q.includes("property") || q.includes("home") || q.includes("land")) {
    if (domainKey === "PROPERTY") score += 10;
    if (domainKey === "HOME") score += 8;
    if (domainKey === "SETTLEMENT") score += 6;
  }

  if (q.includes("next") || q.includes("future") || q.includes("exact date") || q.includes("exact time")) {
    score += 2;
  }

  return score;
}

function buildDomain(domainKey, domainLabel, score) {
  return {
    domain_key: domainKey,
    domain_label: domainLabel,
    rank_score: Number(score.toFixed(2)),
    normalized_score: Number(score.toFixed(2)),
    density: score >= 8 ? "HIGH" : score >= 4 ? "MED" : "LOW",
    residual_impact: score >= 8 ? "HIGH" : score >= 4 ? "MED" : "LOW",
    present_carryover: "NO",
    house_hits: [],
    aspect_hits: [],
    major_event_count: 0,
    minor_event_count: 0,
    broken_event_count: 0,
    active_event_count: 0,
    events: [],
    exact_resolver_active: false,
    primary_exact_event: null,
    alternative_exact_events: [],
    exact_time_band: null
  };
}

export default function runFutureAstroLayer({
  input,
  facts,
  question_profile,
  birth_context,
  current_context
}) {
  const safeInput = safeObject(input);
  const safeFacts = safeObject(facts);
  const safeQuestionProfile = safeObject(question_profile);
  const safeBirthContext = safeObject(birth_context);
  const safeCurrentContext = safeObject(current_context);

  const primary_domain =
    safeQuestionProfile.primary_domain ||
    safeInput.primary_domain ||
    "GENERAL";

  const domainCatalog = [
    ["GENERAL", "General / Life Direction"],
    ["MARRIAGE", "Marriage / Partnership"],
    ["DIVORCE", "Separation / Divorce / Break"],
    ["LOVE", "Love / Romance / Attachment"],
    ["CAREER", "Career / Authority / Public Role"],
    ["JOB", "Job / Service / Employment"],
    ["BUSINESS", "Business / Trade / Deal"],
    ["SUCCESS", "Success / Rise / Execution"],
    ["FOREIGN", "Foreign / Distance / Withdrawal"],
    ["IMMIGRATION", "Immigration / Relocation Path"],
    ["SETTLEMENT", "Settlement / Base Formation"],
    ["VISA", "Visa / Permission / External Clearance"],
    ["CITIZENSHIP", "Status / Permanence / Recognition"],
    ["LEGAL", "Legal / Penalty / Authority"],
    ["AUTHORITY", "Authority / State / Structure"],
    ["DOCUMENT", "Documents / Records / Paperwork"],
    ["HEALTH", "Health / Disease / Stress"],
    ["DISEASE", "Disease / Recurring Illness"],
    ["SURGERY", "Surgery / Invasive Event"],
    ["RECOVERY", "Recovery / Healing Phase"],
    ["PROPERTY", "Property / Residence / Land"],
    ["HOME", "Home / Mother / Base"],
    ["GAIN", "Gain / Network / Fulfilment"],
    ["LOSS", "Loss / Isolation / Exit"],
    ["DEBT", "Debt / Liability / Pressure"],
    ["TRAVEL_SHORT", "Short Travel / Movement"],
    ["TRAVEL_LONG", "Long Travel / Distance"]
  ];

  const domain_results = domainCatalog.map(([key, label]) =>
    buildDomain(key, label, scoreDomain(key, safeQuestionProfile, safeInput))
  );

  domain_results.sort((a, b) => b.rank_score - a.rank_score);

  const boosted = domain_results.map((d, idx) => {
    if (d.domain_key === primary_domain) {
      return {
        ...d,
        rank_score: Number((d.rank_score + 25).toFixed(2)),
        normalized_score: Number((d.normalized_score + 25).toFixed(2))
      };
    }
    return {
      ...d,
      rank_score: Number((d.rank_score - idx * 0.01).toFixed(2)),
      normalized_score: Number((d.normalized_score - idx * 0.01).toFixed(2))
    };
  });

  boosted.sort((a, b) => b.rank_score - a.rank_score);

  const top_ranked_domains = boosted.slice(0, 12);

  return {
    astro_status: "OK",
    primary_domain,
    input_normalized: safeInput,
    fact_anchor_block: safeFacts,
    birth_context: safeBirthContext,
    current_context: safeCurrentContext,
    question_profile: {
      raw_question: safeQuestionProfile.raw_question || safeInput.question || "",
      asks_count: Boolean(safeQuestionProfile.asks_count),
      asks_timing:
        safeQuestionProfile.asks_timing !== undefined
          ? Boolean(safeQuestionProfile.asks_timing)
          : true,
      asks_status: Boolean(safeQuestionProfile.asks_status),
      asks_general:
        safeQuestionProfile.asks_general !== undefined
          ? Boolean(safeQuestionProfile.asks_general)
          : false,
      primary_domain
    },
    linked_domain_expansion: [primary_domain],
    evidence_normalized: {
      natal_planet_count: 0,
      transit_planet_count: 0,
      aspect_count: 0,
      ascendant_present: false,
      house_mapping_present: false
    },
    domain_results: boosted,
    top_ranked_domains
  };
}