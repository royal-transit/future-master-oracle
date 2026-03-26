// lib/future-oracle-contract.js

export const FUTURE_ORACLE_VERSION = "FUTURE_ORACLE_HARDENED_V1";

export const FUTURE_DOMAIN_REGISTRY = [
  "IDENTITY",
  "MIND",
  "COMMUNICATION",
  "FAMILY",
  "HOME",
  "LOVE",
  "CHILDREN",
  "HEALTH",
  "MARRIAGE",
  "SEX",
  "TRANSFORMATION",
  "FOREIGN",
  "RELIGION",
  "CAREER",
  "GAIN",
  "LOSS",
  "DEBT",
  "LEGAL",
  "ENEMY",
  "FRIEND",
  "NETWORK",
  "REPUTATION",
  "POWER",
  "AUTHORITY",
  "BUSINESS",
  "JOB",
  "PARTNERSHIP",
  "DIVORCE",
  "MULTIPLE_MARRIAGE",
  "TRAVEL_SHORT",
  "TRAVEL_LONG",
  "SETTLEMENT",
  "CITIZENSHIP",
  "ACCIDENT",
  "SURGERY",
  "DISEASE",
  "RECOVERY",
  "MENTAL",
  "SPIRITUAL",
  "TANTRIC",
  "BLOCKAGE",
  "SUCCESS",
  "FAILURE",
  "DELAY",
  "SUDDEN_GAIN",
  "SUDDEN_LOSS",
  "FAME",
  "SCANDAL",
  "DOCUMENT",
  "VISA",
  "IMMIGRATION",
  "PROPERTY",
  "VEHICLE"
];

export const FUTURE_CORE_DOMAINS = new Set([
  "MARRIAGE",
  "DIVORCE",
  "RELATIONSHIP",
  "LOVE",
  "CHILDREN",
  "FOREIGN",
  "SETTLEMENT",
  "IMMIGRATION",
  "VISA",
  "CAREER",
  "JOB",
  "BUSINESS",
  "MONEY",
  "DEBT",
  "HEALTH",
  "MENTAL",
  "DISEASE",
  "RECOVERY",
  "PROPERTY",
  "HOME",
  "LEGAL",
  "DOCUMENT"
]);

export const FUTURE_NOISY_DOMAINS = new Set([
  "NETWORK",
  "TRAVEL_SHORT",
  "TRAVEL_LONG",
  "COMMUNICATION",
  "POWER",
  "FAME",
  "SCANDAL",
  "SUCCESS",
  "REPUTATION",
  "AUTHORITY",
  "CITIZENSHIP",
  "FRIEND",
  "ENEMY",
  "SUDDEN_GAIN",
  "SUDDEN_LOSS",
  "RELIGION",
  "SPIRITUAL",
  "TANTRIC",
  "SEX",
  "TRANSFORMATION"
]);

export const FUTURE_TIME_WINDOWS = [
  {
    key: "NOW_TO_30_DAYS",
    label: "Now to 30 days",
    order: 1
  },
  {
    key: "DAY_31_TO_90",
    label: "31 to 90 days",
    order: 2
  },
  {
    key: "MONTH_4_TO_6",
    label: "4 to 6 months",
    order: 3
  },
  {
    key: "MONTH_7_TO_12",
    label: "7 to 12 months",
    order: 4
  }
];

export const FUTURE_STRENGTH_LEVELS = [
  "DORMANT",
  "LOW",
  "MODERATE",
  "HIGH",
  "PEAK"
];

export const FUTURE_CONFIDENCE_LEVELS = [
  "LOW",
  "MEDIUM",
  "HIGH"
];

export const FUTURE_OUTPUT_REQUIREMENTS = {
  must_include: [
    "question_profile",
    "linked_domain_expansion",
    "evidence_normalized",
    "domain_results",
    "top_ranked_domains",
    "activation_windows",
    "top_5_future_domains",
    "primary_future_domain",
    "validation_block",
    "future_verdict",
    "lokkotha_summary",
    "project_paste_block"
  ],

  compact_mode_must_include: [
    "primary_future_domain",
    "top_5_future_domains",
    "best_window",
    "risk_window",
    "future_verdict"
  ],

  project_mode_must_include: [
    "project_paste_block"
  ]
};

export const FUTURE_ENGINE_LAWS = {
  scope_law:
    "The future oracle MUST scan all registered domains, but MUST NOT inflate noisy side domains above core future domains without evidence.",
  timing_law:
    "The future oracle MUST output domain activation across the fixed future time windows.",
  ranking_law:
    "The future oracle MUST identify primary domain, top 5 domains, and suppress weak noisy signals.",
  evidence_law:
    "The future oracle MUST explain why a future domain is rising using chart evidence, timing evidence, and question/domain relevance.",
  stability_law:
    "Same input + same chart packet + same timing base should produce the same ranked future output.",
  anti_noise_law:
    "Minor or decorative domains MUST NOT crowd out marriage, career, money, foreign, health, property, legal, or settlement when those have stronger evidence."
};

export const FUTURE_SCAN_OBJECTIVE = {
  primary_goal:
    "Identify which domains are most likely to activate next, in which time window, with what strength, and why.",
  secondary_goal:
    "Separate immediate activation from medium-term activation and distinguish real promise from weak noise.",
  premium_goal:
    "Produce a premium forward scan that is ranked, timed, evidence-backed, and reusable for different people without hardcoding."
};

export const FUTURE_RESULT_TEMPLATE = {
  primary_future_domain: {
    domain_key: "",
    domain_label: "",
    strength: "",
    confidence: "",
    best_window_key: "",
    why_rising: ""
  },

  top_5_future_domains: [
    {
      domain_key: "",
      domain_label: "",
      strength: "",
      confidence: "",
      best_window_key: ""
    }
  ],

  activation_windows: [
    {
      window_key: "NOW_TO_30_DAYS",
      strongest_domains: [],
      risk_domains: [],
      notes: ""
    },
    {
      window_key: "DAY_31_TO_90",
      strongest_domains: [],
      risk_domains: [],
      notes: ""
    },
    {
      window_key: "MONTH_4_TO_6",
      strongest_domains: [],
      risk_domains: [],
      notes: ""
    },
    {
      window_key: "MONTH_7_TO_12",
      strongest_domains: [],
      risk_domains: [],
      notes: ""
    }
  ]
};

export const FUTURE_BUILD_SEQUENCE = [
  "future-layer-intelligence.js",
  "future-layer-astro.js",
  "future-layer-timing.js",
  "future-layer-evidence.js",
  "future-oracle.js"
];