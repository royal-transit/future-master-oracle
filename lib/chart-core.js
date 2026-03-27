// lib/chart-core.js

const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

const normalize360 = (deg) => {
  const n = Number(deg || 0);
  const r = n % 360;
  return r < 0 ? r + 360 : r;
};

const angularDistance = (a, b) => {
  const x = normalize360(a);
  const y = normalize360(b);
  const diff = Math.abs(x - y);
  return Math.min(diff, 360 - diff);
};

const signIndexFromDegree = (deg) => Math.floor(normalize360(deg) / 30);

const zodiacSigns = [
  "ARIES",
  "TAURUS",
  "GEMINI",
  "CANCER",
  "LEO",
  "VIRGO",
  "LIBRA",
  "SCORPIO",
  "SAGITTARIUS",
  "CAPRICORN",
  "AQUARIUS",
  "PISCES"
];

const houseLabels = {
  1: "IDENTITY",
  2: "FAMILY",
  3: "COMMUNICATION",
  4: "HOME",
  5: "CHILDREN",
  6: "LEGAL",
  7: "MARRIAGE",
  8: "TRANSFORMATION",
  9: "FOREIGN",
  10: "CAREER",
  11: "GAIN",
  12: "LOSS"
};

export function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

export function safeObject(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

export function buildBirthContext(input = {}) {
  return {
    birth_datetime_iso: input.birth_datetime_iso || null,
    birthplace: input.pob || input.birthplace || "UNKNOWN",
    latitude: Number(input.latitude ?? 0),
    longitude: Number(input.longitude ?? 0),
    timezone_offset: input.timezone_offset || "+00:00"
  };
}

export function buildCurrentContext(input = {}) {
  return {
    event_datetime_iso:
      input.current_datetime_iso || new Date().toISOString(),
    latitude: Number(input.latitude ?? 0),
    longitude: Number(input.longitude ?? 0),
    timezone_offset: input.timezone_offset || "+00:00"
  };
}

export function buildPlanetTable(rawPlanets = []) {
  return safeArray(rawPlanets)
    .map((p) => {
      const obj = safeObject(p);
      return {
        planet: String(obj.planet || obj.name || "").toUpperCase(),
        degree: round2(normalize360(obj.degree)),
        sign_index: signIndexFromDegree(obj.degree),
        sign: zodiacSigns[signIndexFromDegree(obj.degree)],
        speed: round2(obj.speed ?? 0),
        retrograde: Boolean(obj.retrograde)
      };
    })
    .filter((p) => p.planet);
}

export function buildAscendant(rawAscendant) {
  if (rawAscendant == null) {
    return {
      degree: 0,
      sign_index: 0,
      sign: zodiacSigns[0],
      present: false
    };
  }

  const deg = normalize360(rawAscendant);

  return {
    degree: round2(deg),
    sign_index: signIndexFromDegree(deg),
    sign: zodiacSigns[signIndexFromDegree(deg)],
    present: true
  };
}

export function mapPlanetsToWholeSignHouses(planets = [], ascendant = {}) {
  const ascSign = Number(ascendant.sign_index ?? 0);

  return safeArray(planets).map((p) => {
    const house =
      ((Number(p.sign_index) - ascSign + 12) % 12) + 1;

    return {
      ...p,
      house,
      house_label: houseLabels[house] || `HOUSE_${house}`
    };
  });
}

export function buildAspectTable(planets = []) {
  const aspectDefs = [
    { type: "conjunction", angle: 0, orb: 6 },
    { type: "sextile", angle: 60, orb: 4 },
    { type: "square", angle: 90, orb: 5 },
    { type: "trine", angle: 120, orb: 5 },
    { type: "opposition", angle: 180, orb: 6 }
  ];

  const items = safeArray(planets);
  const aspects = [];

  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const p1 = items[i];
      const p2 = items[j];
      const dist = angularDistance(p1.degree, p2.degree);

      for (const def of aspectDefs) {
        const gap = Math.abs(dist - def.angle);
        if (gap <= def.orb) {
          aspects.push({
            planet1: p1.planet,
            planet2: p2.planet,
            type: def.type,
            angle: def.angle,
            orb_gap: round2(gap)
          });
          break;
        }
      }
    }
  }

  return aspects;
}

export function summarizeEvidence({
  natal_planets = [],
  transit_planets = [],
  ascendant = {},
  house_mapping = [],
  aspects = []
}) {
  return {
    natal_planet_count: safeArray(natal_planets).length,
    transit_planet_count: safeArray(transit_planets).length,
    aspect_count: safeArray(aspects).length,
    ascendant_present: Boolean(ascendant.present),
    house_mapping_present: safeArray(house_mapping).length > 0
  };
}

export function buildChartCore({
  natal_planets = [],
  transit_planets = [],
  ascendant_degree = null
} = {}) {
  const natalPlanetTable = buildPlanetTable(natal_planets);
  const transitPlanetTable = buildPlanetTable(transit_planets);

  const ascendant = buildAscendant(ascendant_degree);

  const natalHouseMapping = mapPlanetsToWholeSignHouses(
    natalPlanetTable,
    ascendant
  );

  const transitHouseMapping = mapPlanetsToWholeSignHouses(
    transitPlanetTable,
    ascendant
  );

  const aspectTable = buildAspectTable(transitPlanetTable);

  const evidence_normalized = summarizeEvidence({
    natal_planets: natalPlanetTable,
    transit_planets: transitPlanetTable,
    ascendant,
    house_mapping: transitHouseMapping,
    aspects: aspectTable
  });

  return {
    ascendant,
    natal_planets: natalPlanetTable,
    transit_planets: transitPlanetTable,
    natal_house_mapping: natalHouseMapping,
    transit_house_mapping: transitHouseMapping,
    aspect_table: aspectTable,
    evidence_normalized
  };
}