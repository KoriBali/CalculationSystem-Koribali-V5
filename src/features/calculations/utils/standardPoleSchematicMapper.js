/**
 * standardPoleSchematicMapper.js
 * Maps Standard Pole calculation inputs (specifically types: IA, IS, LA, LS, TA, TS)
 * from specStandardPole.json into the parameters format expected by the Drawing Engine.
 */

import STANDARD_POLE_DATA from "../data/specStandardPole.json";

// Supported standard pole types for schematic generation
export const SUPPORTED_SCHEMATIC_POLE_TYPES = [
  "IA",
  "IS",
  "LA",
  "LS",
  "TA",
  "TS",
  "STRAIGHT",
  "STEPPEDPOLE",
];

/**
 * Checks whether a given pole type is supported by the schematic drawing engine.
 * @param {string} poleType
 * @returns {boolean}
 */
export function isSchematicSupportedPole(poleType) {
  if (!poleType) return false;
  return SUPPORTED_SCHEMATIC_POLE_TYPES.includes(poleType.toUpperCase());
}

/**
 * Maps frontend overhead wire list to the format expected by the Drawing Engine (overHeadWires).
 * @param {Array} rawList
 * @returns {Array}
 */
export function mapSchematicOverheadWires(rawList) {
  if (!Array.isArray(rawList) || rawList.length === 0) return [];

  return rawList
    .filter(
      (w) =>
        w &&
        (w.name ||
          w.zHeight != null ||
          w.elevationM != null ||
          w.diameter != null ||
          w.weight != null),
    )
    .map((w, idx) => {
      // In FE, zHeight is entered in mm (e.g. 7500 or 8000). If elevationM is used, convert to mm if < 100.
      const rawZ = Number(
        w.zHeight ??
          (w.elevationM ? (w.elevationM < 100 ? w.elevationM * 1000 : w.elevationM) : 0),
      );
      const height = isNaN(rawZ) ? 0 : rawZ;

      const rawDia = Number(w.diameter ?? w.diameterMm ?? 0);
      const diameter = isNaN(rawDia) ? 0 : rawDia;

      const rawSpan = Number(w.span ?? w.spanLengthM ?? 0);
      const span = isNaN(rawSpan) ? 0 : rawSpan;

      const rawWeight = Number(w.weight ?? w.massPerLengthKgM ?? 0);
      const weight = isNaN(rawWeight) ? 0 : rawWeight;

      const rawFixAngle = Number(w.fixAngle ?? w.fixedAngleDeg ?? 0);
      const fixAngle = isNaN(rawFixAngle) ? 0 : rawFixAngle;

      const rawVertAngle = Number(w.verticalAngle ?? w.verticalAngleDeg ?? 0);
      const verticalAngle = isNaN(rawVertAngle) ? 0 : rawVertAngle;

      return {
        name: String(w.name || `Overhead Wire ${idx + 1}`).trim(),
        height,
        elevation: height,
        diameter,
        span,
        weight,
        fixAngle,
        verticalAngle,
      };
    });
}

/**
 * Resolves standard straight pole (stepped pole) from specStandardPole.json and user inputs
 * and builds the exact payload structure required by Amir's Drawing Engine.
 *
 * @param {object} params
 * @param {object} params.straightPoleStandard - { combination, upperLength, upperThickness, lowerLength, lowerThickness, groundPosition, lowestHeight }
 * @param {object} [params.condition] - { baseplateEnabled, ... }
 * @param {Array} [params.overheadWires] - array of overhead wire objects
 * @returns {object|null} Returns { standardId, poleType, payload } or null if not supported/available.
 */
export function getStraightPoleSchematicParameters({
  straightPoleStandard,
  condition = {},
  overheadWires = [],
}) {
  if (!straightPoleStandard || !straightPoleStandard.combination) return null;

  // As confirmed: schematic drawing for embedment straight pole is not yet ready in Amir's system.
  if (condition.baseplateEnabled === false) {
    return null;
  }

  const combination = straightPoleStandard.combination;
  const selectedPole = STANDARD_POLE_DATA?.straight?.[combination];
  if (!selectedPole || !Array.isArray(selectedPole.poles) || selectedPole.poles.length < 2) {
    return null;
  }

  const upperLength = Number(straightPoleStandard.upperLength || 0);
  const lowerLength = Number(straightPoleStandard.lowerLength || 0);
  const upperThickness = Number(straightPoleStandard.upperThickness || 0);
  const lowerThickness = Number(straightPoleStandard.lowerThickness || 0);

  if (upperLength <= 0 || lowerLength <= 0) {
    return null;
  }

  const [topRaw, bottomRaw] = selectedPole.poles;

  // Drawing Engine expects individual segment length in 'height'.
  const poles = [
    {
      name: topRaw.name || "上柱",
      material: topRaw.material || "STK400",
      type: "straight",
      Lower_D: Number(topRaw.lowerDiameter),
      Upper_D: Number(topRaw.upperDiameter),
      thickness: upperThickness,
      upperThickness: upperThickness,
      height: upperLength,
      quantity: 1,
    },
    {
      name: bottomRaw.name || "下柱",
      material: bottomRaw.material || "STK400",
      type: "straight",
      Lower_D: Number(bottomRaw.lowerDiameter),
      Upper_D: Number(bottomRaw.upperDiameter),
      thickness: lowerThickness,
      upperThickness: lowerThickness,
      height: lowerLength,
      quantity: 1,
    },
  ];

  const groundPos = straightPoleStandard.groundPosition || "onGL";
  const lowestStep =
    groundPos === "onGL"
      ? 0
      : Number(straightPoleStandard.lowestHeight || 0);

  const overHeadWires = mapSchematicOverheadWires(overheadWires);
  const ohwSuffix =
    overHeadWires.length > 0
      ? `-ohw${overHeadWires.map((w) => `${w.height}_${w.fixAngle}`).join("_")}`
      : "";

  const standardId = `ST-${combination}-${upperLength}-${lowerLength}-${groundPos}${lowestStep !== 0 ? `-${lowestStep}` : ""}${ohwSuffix}`;

  return {
    standardId,
    poleType: "straight",
    payload: {
      poles,
      arms: [],
      directObjects: [],
      overHeadWires,
      lowestStep,
    },
  };
}

/**
 * Resolves standard pole entry from specStandardPole.json and builds
 * the exact payload structure required by Amir's Drawing Engine.
 * Supports both Tapered and Straight (Stepped) standard poles.
 *
 * @param {object} params
 * @param {object} [params.taperPoleStandard] - { poleType, groundPosition, height, embedmentLength }
 * @param {object} [params.straightPoleStandard] - { combination, upperLength, upperThickness, lowerLength, lowerThickness, groundPosition, lowestHeight }
 * @param {object} [params.poleTypeStandard] - { type: "tapered" | "straight" }
 * @param {object} [params.condition] - { baseplateEnabled, ... }
 * @param {Array} [params.overheadWires] - array of overhead wire objects
 * @returns {object|null} Returns { standardId, poleType, payload } or null if not supported/available.
 */
export function getStandardPoleSchematicParameters({
  taperPoleStandard,
  straightPoleStandard,
  poleTypeStandard,
  condition = {},
  overheadWires = [],
}) {
  const isStraight =
    poleTypeStandard?.type === "straight" ||
    (!taperPoleStandard?.poleType && Boolean(straightPoleStandard?.combination));

  if (isStraight) {
    return getStraightPoleSchematicParameters({
      straightPoleStandard,
      condition,
      overheadWires,
    });
  }

  if (!taperPoleStandard || !taperPoleStandard.poleType) return null;

  const type = taperPoleStandard.poleType.toUpperCase();
  if (!isSchematicSupportedPole(type)) {
    return null;
  }

  const isEmbedment =
    !condition.baseplateEnabled && taperPoleStandard.groundPosition === "underGL";

  const rawHeight = Number(taperPoleStandard.height);
  const mHeight = rawHeight > 100 ? rawHeight / 1000 : rawHeight;
  const normalizedHeight = !isNaN(mHeight) && mHeight > 0
    ? String(Math.round(mHeight * 10) / 10)
    : String(taperPoleStandard.height || "");

  const heightKey = isEmbedment
    ? (mHeight + 0.3).toFixed(1)
    : normalizedHeight;

  const dataTaper = STANDARD_POLE_DATA?.tapered || STANDARD_POLE_DATA?.taper || {};
  const groundGroup = dataTaper?.[type]?.[taperPoleStandard.groundPosition || "onGL"] || {};
  const isTypeWith100 = type !== "IS" && type !== "IA";
  const nominalKey = isTypeWith100
    ? String(Math.round((Number(heightKey) - 0.1) * 10) / 10)
    : String(Math.round((Number(heightKey) + 0.1) * 10) / 10);
  const selectedPole =
    groundGroup[heightKey] ||
    groundGroup[nominalKey] ||
    groundGroup[String(rawHeight)] ||
    Object.values(groundGroup)[0];

  if (!selectedPole) {
    return null;
  }

  const rawPoles = selectedPole.poles || [];
  const rawDOs = selectedPole.directObjects || [];
  const rawArms = selectedPole.arms || [];

  // ── 1. MAP POLES & CALCULATE SEGMENT HEIGHTS ──
  // specStandardPole.json stores cumulative zHeight from ground upwards.
  // Drawing Engine expects individual segment length in 'height'.
  const poles = [];
  const n = rawPoles.length;

  if (n === 1) {
    const p = rawPoles[0];
    poles.push({
      name: p.name || "Pole 1",
      material: p.material || "STK400",
      type: "tapered",
      Lower_D: Number(p.lowerDiameter),
      Upper_D: Number(p.upperDiameter),
      thickness: Number(p.lowerThickness),
      upperThickness: Number(p.upperThickness || p.lowerThickness),
      height: Number(p.zHeight),
      quantity: 1,
    });
  } else if (n === 2) {
    const [top, bottom] = rawPoles;
    poles.push({
      name: top.name || "Pole 1",
      material: top.material || "STK400",
      type: "tapered",
      Lower_D: Number(top.lowerDiameter),
      Upper_D: Number(top.upperDiameter),
      thickness: Number(top.lowerThickness),
      upperThickness: Number(top.upperThickness || top.lowerThickness),
      height: Number(top.zHeight) - Number(bottom.zHeight),
      quantity: 1,
    });
    poles.push({
      name: bottom.name || "Pole 2",
      material: bottom.material || "STK400",
      type: "straight",
      Lower_D: Number(bottom.lowerDiameter),
      Upper_D: Number(bottom.upperDiameter),
      thickness: Number(bottom.lowerThickness),
      upperThickness: Number(bottom.upperThickness || bottom.lowerThickness),
      height: Number(bottom.zHeight),
      quantity: 1,
    });
  } else if (n >= 3) {
    const [top, middle, bottom] = rawPoles.slice(0, 3);
    poles.push({
      name: top.name || "Pole 1",
      material: top.material || "STK400",
      type: "straight",
      Lower_D: Number(top.lowerDiameter),
      Upper_D: Number(top.upperDiameter),
      thickness: Number(top.lowerThickness),
      upperThickness: Number(top.upperThickness || top.lowerThickness),
      height: Number(top.zHeight) - Number(middle.zHeight),
      quantity: 1,
    });
    poles.push({
      name: middle.name || "Pole 2",
      material: middle.material || "STK400",
      type: "tapered",
      Lower_D: Number(middle.lowerDiameter),
      Upper_D: Number(middle.upperDiameter),
      thickness: Number(middle.lowerThickness),
      upperThickness: Number(middle.upperThickness || middle.lowerThickness),
      height: Number(middle.zHeight) - Number(bottom.zHeight),
      quantity: 1,
    });
    poles.push({
      name: bottom.name || "Pole 3",
      material: bottom.material || "STK400",
      type: "straight",
      Lower_D: Number(bottom.lowerDiameter),
      Upper_D: Number(bottom.upperDiameter),
      thickness: Number(bottom.lowerThickness),
      upperThickness: Number(bottom.upperThickness || bottom.lowerThickness),
      height: Number(bottom.zHeight),
      quantity: 1,
    });
  }

  // ── 2. MAP DIRECT OBJECTS (IA, IS) ──
  const directObjects = rawDOs.slice(0, 1).map((d) => ({
    name: d.name || "灯具",
    height: Number(d.zHeight),
    quantity: Number(d.quantity || 1),
  }));

  // ── 3. MAP ARMS (LA, LS) ──
  const arms = rawArms.slice(0, 2).map((a, idx) => ({
    name: a.name || `Arm ${idx + 1}`,
    material: a.material || "STK400",
    type: "straight",
    diameter: Number(a.diameter),
    thickness: Number(a.thickness),
    height: Number(a.zHeight),
    length: Number(a.length),
    fixAngle: Number(a.fixAngle || 0),
    verticalAngle: 0,
  }));

  const overHeadWires = mapSchematicOverheadWires(overheadWires);
  const ohwSuffix =
    overHeadWires.length > 0
      ? `-ohw${overHeadWires.map((w) => `${w.height}_${w.fixAngle}`).join("_")}`
      : "";

  const baseStandardId = selectedPole.standardId || `${type}-${heightKey}`;
  const standardId = `${baseStandardId}${ohwSuffix}`;

  return {
    standardId,
    poleType: type,
    payload: {
      poles,
      arms,
      directObjects,
      overHeadWires,
    },
  };
}
