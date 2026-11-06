import { findRequestOfCase, updateRequest } from "../data/requestStore";
import { getUser } from "../../../utils/auth";
import {
  saveCalculationDraft,
  getCalculationDraft,
  deleteCalculationDraft,
  getRequests,
  fetchAllProjectCases,
} from "../services/requestService";

/**
 * Resolves the request ID owning a specific case, checking session storage, local store, and backend API.
 */
export const resolveRequestIdForCase = async (caseId) => {
  if (!caseId) return null;
  const fromSession =
    sessionStorage.getItem(`case_request_id_${caseId}`) ||
    sessionStorage.getItem("active_request_id");
  if (fromSession) return fromSession;

  const found = findRequestOfCase(caseId);
  if (found?.request?.id) {
    sessionStorage.setItem(`case_request_id_${caseId}`, found.request.id);
    return found.request.id;
  }

  try {
    const res = await getRequests();
    const items = Array.isArray(res) ? res : res?.items || res?.data || [];
    for (const req of items) {
      if (!req?.id) continue;
      if (req.cases && req.cases.some((c) => c.id === caseId)) {
        sessionStorage.setItem(`case_request_id_${caseId}`, req.id);
        sessionStorage.setItem("active_request_id", req.id);
        return req.id;
      }
    }

    // Secondary fallback: query cases endpoint for candidate requests (top 20)
    for (const req of items.slice(0, 20)) {
      if (!req?.id) continue;
      try {
        const cases = await fetchAllProjectCases(req.id);
        if (cases && cases.some((c) => c.id === caseId)) {
          sessionStorage.setItem(`case_request_id_${caseId}`, req.id);
          sessionStorage.setItem("active_request_id", req.id);
          return req.id;
        }
      } catch {
        // continue search
      }
    }
  } catch (err) {
    console.debug("[resolveRequestIdForCase] getRequests fallback search:", err?.message);
  }

  return null;
};

// ===============================================================================
// FUNCTIONS: Check whether the session contains any meaningful calculation data
// ===============================================================================

// Keys that represent user-filled data (excludes projectType itself)
export const DATA_KEYS = [
  "cover",
  "projectIdentity",
  "workflow",
  "condition",
  "poleConfig",
  "poles",
  "directObjects",
  "overheadWires",
  "arms",
  "results",
  "resultsDo",
  "resultsOhw",
  "resultsArm",
  "showResults",
  "drawing",
  "drawing_completed",
  "openingType",
  "boxType",
  "rType",
  "baseplateType",
  "fourRibType",
  "eightRibType",
  "foundationType",
  "squareCaisson",
  "roundCaisson",
  "poleTypeStandard",
  "taperPoleStandard",
  "straightPoleStandard",
  "hasReport",
  "showResultsOp",
  "calculatedOp",
  "showResultsBaseplate",
  "calculatedBaseplate",
  "calculatedFoundation",
  "showResultsFoundation",
  "reportSnapshot",
  "calculation_config",
  "drawing",
  "drawing_completed",
  "drawing_general",
  "drawing_pole",
  "drawing_pole_completed",
  "drawing_opening",
  "drawing_opening_completed",
  "drawing_baseplate",
  "drawing_baseplate_completed",
  "drawing_foundation_type",
  "drawing_square_caisson",
  "drawing_round_caisson",
  "drawing_foundation_completed",
  "drawing_coupling_location",
  "drawing_coupling_count",
  "drawing_coupling_data",
  "drawing_coupling_completed",
  "drawing_surface",
  "drawing_coupling_confirmed",
  "schematic_data",
  "isCalculatedPole",
  "isCalculatedOp",
  "isCalculatedBp",
  "isCalculatedFd",
  "displayResult",
  "display",
];

/**
 * Returns true if the user has any meaningful calculation data for this project type.
 * Strategy:
 *  - `calculation_config` is only written when the user submits the Initial Input form (proceed()).
 *    If it exists, the user has definitely filled in and confirmed something.
 *  - Additionally check a set of "deep" keys that are only written after real user interaction
 *    (results, report, etc.), as a fallback for edge cases.
 */
export const hasCalculationData = (projectType) => {
  // Primary signal: config is only saved after the user confirms Initial Input
  if (sessionStorage.getItem(`${projectType}_calculation_config`) !== null) {
    return true;
  }

  // Check if cover or identity data has been filled
  const hasNonEmptyStringField = (raw) => {
    if (!raw) return false;
    try {
      const obj = JSON.parse(raw);
      return Object.values(obj).some((val) => typeof val === "string" && val.trim() !== "");
    } catch {
      return false;
    }
  };

  if (hasNonEmptyStringField(sessionStorage.getItem(`${projectType}_cover`))) return true;
  if (hasNonEmptyStringField(sessionStorage.getItem(`${projectType}_projectIdentity`))) return true;

  // Secondary signal: any computed/result data exists
  const deepKeys = [
    "results",
    "resultsDo",
    "resultsOhw",
    "resultsArm",
    "showResults",
    "hasReport",
    "reportSnapshot",
    "calculatedOp",
    "calculatedBaseplate",
    "calculatedFoundation",
  ];

  return deepKeys.some(
    (key) => sessionStorage.getItem(`${projectType}_${key}`) !== null,
  );
};

/**
 * Checks whether the user has already filled in the report cover information for this projectType.
 */
export const hasCoverData = (projectType) => {
  try {
    const raw = sessionStorage.getItem(`${projectType}_cover`);
    if (!raw) return false;
    const data = JSON.parse(raw);
    const reportNum = (data.reportNumber?.trim() || data.calculationNumber?.trim() || "");
    const title1 = (data.title1?.trim() || data.projectName?.trim() || "");

    const isDummy =
      !reportNum ||
      reportNum === "WS76509-001" ||
      reportNum === "1111" ||
      reportNum === "KB-2026-001" ||
      !title1 ||
      title1 === "江戸川フラワーガーデン" ||
      title1 === "1";

    if (isDummy) return false;

    return Boolean(
      data &&
        reportNum &&
        title1 &&
        data.author?.trim() &&
        (data.responsibleDepartment?.trim() ||
          data.region?.trim() ||
          data.managementCode?.trim())
    );
  } catch {
    return false;
  }
};

export const isProjectComplete = (projectType) => {
  const workflowRaw = sessionStorage.getItem(`${projectType}_workflow`);
  const workflow = workflowRaw ? JSON.parse(workflowRaw) : {};
  const mode = workflow.projectMode || "calculation";

  const isCalculationDone = () => {
    const raw = sessionStorage.getItem(`${projectType}_calculation_config`);
    if (!raw) return false;
    const config = JSON.parse(raw);
    const hasArrayData = (key) => {
      const val = sessionStorage.getItem(`${projectType}_${key}`);
      return val && val !== "null" && Array.isArray(JSON.parse(val)) && JSON.parse(val).length > 0;
    };
    const isValueSet = (key) => {
      const val = sessionStorage.getItem(`${projectType}_${key}`);
      return val !== null && val !== "null";
    };
    const hasPole = config.pole ? hasArrayData("results") : true;
    const hasOpening = config.opening ? isValueSet("calculatedOp") : true;
    const hasBaseplate = config.baseplate ? isValueSet("calculatedBaseplate") : true;
    const hasFoundation = config.foundation ? isValueSet("calculatedFoundation") : true;
    return hasPole && hasOpening && hasBaseplate && hasFoundation;
  };

  const isDrawingDone = () => {
    // Basic check for drawing completion, if drawing is implemented.
    const raw = sessionStorage.getItem(`${projectType}_drawing`);
    if (!raw) return false;
    try {
      const drawingData = JSON.parse(raw);
      return drawingData && Object.keys(drawingData).length > 0;
    } catch {
      return false;
    }
  };

  if (mode === "both") {
    return isCalculationDone() && isDrawingDone();
  } else if (mode === "drawing") {
    return isDrawingDone();
  }
  return isCalculationDone();
};

// ===============================================================================
// FUNCTIONS: Completely reset all calculation data, UI states, and storage
// ===============================================================================
export const clearCalculationSession = (projectType) => {
  // All keys except "calculation_config" which is handled separately below
  const keys = DATA_KEYS.filter((k) => k !== "calculation_config");

  keys.forEach((key) => sessionStorage.removeItem(`${projectType}_${key}`));

  sessionStorage.removeItem(`${projectType}_calculation_config`);
  sessionStorage.removeItem(`${projectType}_isCalculatedPole`);
  sessionStorage.removeItem(`${projectType}_isCalculatedOp`);
  sessionStorage.removeItem(`${projectType}_isCalculatedBp`);
  sessionStorage.removeItem(`${projectType}_isCalculatedFd`);
};


// ===============================================================================
// DRAFT MANAGEMENT LOGIC
// ===============================================================================

export const getDraftsIndex = (projectType) => {
  const raw = sessionStorage.getItem(`${projectType}_drafts_index`);
  if (!raw) return [];
  const drafts = JSON.parse(raw);
  return drafts.sort((a, b) => new Date(b.lastEdited) - new Date(a.lastEdited));
};

export const saveDraftsIndex = (projectType, drafts) => {
  sessionStorage.setItem(`${projectType}_drafts_index`, JSON.stringify(drafts));
};

export const getDraftData = (projectType, draftId) => {
  const raw = sessionStorage.getItem(`${projectType}_draft_data_${draftId}`);
  return raw ? JSON.parse(raw) : null;
};

// Serializes the current active working session into an object
export const serializeWorkingSession = (projectType) => {
  // Sync calculation_config with condition if condition exists
  try {
    const rawCond = sessionStorage.getItem(`${projectType}_condition`);
    if (rawCond) {
      const cond = JSON.parse(rawCond);
      sessionStorage.setItem(
        `${projectType}_calculation_config`,
        JSON.stringify({
          pole: true,
          opening: Boolean(cond.openingEnabled),
          baseplate: Boolean(cond.baseplateEnabled),
          foundation: Boolean(cond.foundationEnabled),
        })
      );
    }
  } catch {
    // ignore
  }

  const data = {};
  DATA_KEYS.forEach(key => {
    const val = sessionStorage.getItem(`${projectType}_${key}`);
    if (val !== null) {
      data[key] = val; // Store raw stringified JSON
    }
  });
  return data;
};

// Builds clean backend calculation draft payload matching Backend CalculationInput schema:
// Allowed keys: poleStandardHeightId, directObjects, overheadWires, arms, groundPosition, embedmentLengthMm, recopyCatalog
export const buildCalculationDraftPayload = (projectType, sessionData) => {
  const getParsed = (key) => {
    const raw = sessionData?.[key] || sessionStorage.getItem(`${projectType}_${key}`);
    if (!raw) return null;
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  };

  const taperStandard = getParsed("taperPoleStandard");
  const straightStandard = getParsed("straightPoleStandard");
  const poleConfig = getParsed("poleConfig");
  const rawDo = getParsed("directObjects") || [];
  const rawOhw = getParsed("overheadWires") || [];
  const rawArms = getParsed("arms") || [];

  let poleStandardHeightId =
    taperStandard?.poleStandardHeightId ||
    straightStandard?.poleStandardHeightId ||
    null;

  if (!poleStandardHeightId && taperStandard?.height) {
    try {
      const cached = sessionStorage.getItem("poleStandardData");
      if (cached) {
        const parsed = JSON.parse(cached);
        const list = parsed?.data || [];
        const taperEntries = list.filter(
          (i) => i.type === "taper" || i.type === "tapered"
        );
        const shortCode = taperStandard.poleType;
        const targetEntry = taperEntries.find(
          (e) => e.name && (shortCode ? e.name.includes(shortCode) : true)
        );
        if (targetEntry?.poleStandardHeights) {
          const hM = Number(taperStandard.height);
          const match = targetEntry.poleStandardHeights.find((h) => {
            const num = Number(h.height);
            const m = num > 100 ? num / 1000 : num;
            return Math.abs(m - hM) < 0.05 || Math.abs(num - hM) < 0.05;
          });
          if (match?.id) poleStandardHeightId = match.id;
        }
      }
    } catch {}
  }

  const directObjects = (Array.isArray(rawDo) ? rawDo : []).map((d) => {
    const rawH = Number(d.zHeight || 8000);
    const elevationM = rawH > 100 ? rawH / 1000 : rawH;
    return {
      name: d.name || "灯具",
      objectKind: d.type === "directional" ? "directional" : "omni",
      frontAreaM2: Number(d.frontArea || 0.1),
      sideAreaM2:
        d.sideArea != null && d.sideArea !== "" ? Number(d.sideArea) : null,
      fixedAngleDeg:
        d.fixAngle != null && d.fixAngle !== "" ? Number(d.fixAngle) : null,
      massPerUnitKg: Number(d.weight || 14),
      elevationM,
      baseWindCoefficient: Number(d.nnC || 1.0),
      quantity: Number(d.quantity || 1),
    };
  });

  const overheadWires = (Array.isArray(rawOhw) ? rawOhw : []).map((w) => ({
    name: w.name || "Overhead Wire",
    massPerLengthKgM: Number(w.weightPerM || w.massPerLengthKgM || 0),
    diameterMm: Number(w.diameterMm || 0),
    elevationM: Number(
      w.elevationM || (w.zHeight ? Number(w.zHeight) / 1000 : 0)
    ),
    spanLengthM: Number(w.spanLengthM || 0),
    sagRatioPercent: Number(w.sagRatioPercent || 0),
    baseWindCoefficient: Number(w.baseWindCoefficient || 1.0),
    fixedAngleDeg:
      w.fixedAngleDeg != null && w.fixedAngleDeg !== ""
        ? Number(w.fixedAngleDeg)
        : null,
    verticalAngleDeg:
      w.verticalAngleDeg != null && w.verticalAngleDeg !== ""
        ? Number(w.verticalAngleDeg)
        : null,
  }));

  const arms = (Array.isArray(rawArms) ? rawArms : []).map((a) => ({
    name: a.name || "Arm",
    materialId: a.materialId || null,
    diameterMm: Number(a.diameterMm || 0),
    thicknessMm: Number(a.thicknessMm || 0),
    totalLengthM: Number(a.totalLengthM || 0),
    exposedLengthM: Number(a.exposedLengthM || 0),
    installationHeightM: Number(a.installationHeightM || 0),
    fixedAngleDeg:
      a.fixedAngleDeg != null && a.fixedAngleDeg !== ""
        ? Number(a.fixedAngleDeg)
        : null,
    objects: Array.isArray(a.objects) ? a.objects : [],
  }));

  const rawGp =
    taperStandard?.groundPosition ||
    straightStandard?.groundPosition ||
    poleConfig?.groundPosition;
  const groundPosition =
    rawGp === "underGL" || rawGp === "under_gl" ? "under_gl" : "on_gl";

  const rawEmb =
    taperStandard?.embedmentLength ||
    straightStandard?.embedmentLength ||
    poleConfig?.embedmentLength;
  const embedmentLengthMm =
    rawEmb != null && rawEmb !== "" ? Number(rawEmb) : null;

  return {
    poleStandardHeightId,
    directObjects,
    overheadWires,
    arms,
    groundPosition,
    embedmentLengthMm,
  };
};

// Deserializes a draft object into the active working session
export const deserializeWorkingSession = (projectType, draftData) => {
  clearCalculationSession(projectType); // Clear existing first
  if (draftData) {
    const rawData =
      draftData?.draftData && typeof draftData.draftData === "object"
        ? { ...draftData, ...draftData.draftData }
        : draftData?.payload && typeof draftData.payload === "object"
          ? { ...draftData, ...draftData.payload }
          : draftData?.data && typeof draftData.data === "object" && !Array.isArray(draftData.data)
            ? { ...draftData, ...draftData.data }
            : draftData?.input && typeof draftData.input === "object"
              ? { ...draftData, ...draftData.input }
              : draftData;

    Object.entries(rawData).forEach(([key, val]) => {
      if (val === null || val === undefined) return;
      if (key === "payload" || key === "draftData" || key === "input" || key === "data") return;
      const strVal = typeof val === "string" ? val : JSON.stringify(val);
      sessionStorage.setItem(`${projectType}_${key}`, strVal);
    });

    // Unpack nested opening if provided as object
    if (rawData.opening && typeof rawData.opening === "object") {
      const op = rawData.opening;
      if (op.openingType)
        sessionStorage.setItem(
          `${projectType}_openingType`,
          typeof op.openingType === "string" ? op.openingType : JSON.stringify(op.openingType)
        );
      if (op.boxType)
        sessionStorage.setItem(
          `${projectType}_boxType`,
          typeof op.boxType === "string" ? op.boxType : JSON.stringify(op.boxType)
        );
      if (op.rType)
        sessionStorage.setItem(
          `${projectType}_rType`,
          typeof op.rType === "string" ? op.rType : JSON.stringify(op.rType)
        );
      if (op.calculatedOp)
        sessionStorage.setItem(
          `${projectType}_calculatedOp`,
          typeof op.calculatedOp === "string" ? op.calculatedOp : JSON.stringify(op.calculatedOp)
        );
    }

    // Unpack nested baseplate if provided as object
    if (rawData.baseplate && typeof rawData.baseplate === "object") {
      const bp = rawData.baseplate;
      if (bp.baseplateType)
        sessionStorage.setItem(
          `${projectType}_baseplateType`,
          typeof bp.baseplateType === "string" ? bp.baseplateType : JSON.stringify(bp.baseplateType)
        );
      if (bp.fourRibType)
        sessionStorage.setItem(
          `${projectType}_fourRibType`,
          typeof bp.fourRibType === "string" ? bp.fourRibType : JSON.stringify(bp.fourRibType)
        );
      if (bp.eightRibType)
        sessionStorage.setItem(
          `${projectType}_eightRibType`,
          typeof bp.eightRibType === "string" ? bp.eightRibType : JSON.stringify(bp.eightRibType)
        );
      if (bp.calculatedBaseplate)
        sessionStorage.setItem(
          `${projectType}_calculatedBaseplate`,
          typeof bp.calculatedBaseplate === "string" ? bp.calculatedBaseplate : JSON.stringify(bp.calculatedBaseplate)
        );
    }

    // Unpack nested foundation if provided as object
    if (rawData.foundation && typeof rawData.foundation === "object") {
      const fd = rawData.foundation;
      if (fd.foundationType)
        sessionStorage.setItem(
          `${projectType}_foundationType`,
          typeof fd.foundationType === "string" ? fd.foundationType : JSON.stringify(fd.foundationType)
        );
      if (fd.squareCaisson)
        sessionStorage.setItem(
          `${projectType}_squareCaisson`,
          typeof fd.squareCaisson === "string" ? fd.squareCaisson : JSON.stringify(fd.squareCaisson)
        );
      if (fd.roundCaisson)
        sessionStorage.setItem(
          `${projectType}_roundCaisson`,
          typeof fd.roundCaisson === "string" ? fd.roundCaisson : JSON.stringify(fd.roundCaisson)
        );
      if (fd.calculatedFoundation)
        sessionStorage.setItem(
          `${projectType}_calculatedFoundation`,
          typeof fd.calculatedFoundation === "string" ? fd.calculatedFoundation : JSON.stringify(fd.calculatedFoundation)
        );
    }

    // Unpack cover if provided
    if (rawData.cover) {
      sessionStorage.setItem(
        `${projectType}_cover`,
        typeof rawData.cover === "string" ? rawData.cover : JSON.stringify(rawData.cover)
      );
    }

    // Unpack reportSnapshot if provided
    if (rawData.reportSnapshot) {
      sessionStorage.setItem(
        `${projectType}_reportSnapshot`,
        typeof rawData.reportSnapshot === "string"
          ? rawData.reportSnapshot
          : JSON.stringify(rawData.reportSnapshot)
      );
      sessionStorage.setItem(`${projectType}_hasReport`, "true");
    }

    // If this draft is in backend CalculationInput format (e.g. loaded from server in another browser),
    // unpack it into the frontend session keys
    if (rawData.poleStandardHeightId && !rawData.taperPoleStandard) {
      const isUnderGl =
        rawData.groundPosition === "under_gl" || rawData.groundPosition === "underGL";
      const groundPosUi = isUnderGl ? "underGL" : "onGL";

      sessionStorage.setItem(
        `${projectType}_poleTypeStandard`,
        JSON.stringify({ type: "taper" })
      );

      // Attempt reverse lookup of shortCode and height from cached master pole data
      let resolvedShortCode = "IS";
      let resolvedHeight = "10";
      try {
        const cached = sessionStorage.getItem("poleStandardData");
        if (cached) {
          const parsed = JSON.parse(cached);
          const list = parsed?.data || [];
          for (const entry of list) {
            const hMatch = (entry.poleStandardHeights || []).find(
              (h) => h.id === rawData.poleStandardHeightId
            );
            if (hMatch) {
              const match = entry.name?.match(/\(([^)]+)\)/);
              if (match) resolvedShortCode = match[1];
              const num = Number(hMatch.height);
              resolvedHeight = String(num > 100 ? num / 1000 : num);
              break;
            }
          }
        }
      } catch {}

      sessionStorage.setItem(
        `${projectType}_taperPoleStandard`,
        JSON.stringify({
          poleType: resolvedShortCode,
          groundPosition: groundPosUi,
          height: resolvedHeight,
          poleStandardHeightId: rawData.poleStandardHeightId,
        })
      );

      sessionStorage.setItem(
        `${projectType}_poleConfig`,
        JSON.stringify({
          groundPosition: groundPosUi,
          embedmentLength:
            rawData.embedmentLengthMm != null
              ? String(rawData.embedmentLengthMm)
              : "",
        })
      );

      if (
        Array.isArray(rawData.directObjects) &&
        rawData.directObjects.length > 0
      ) {
        const uiDo = rawData.directObjects.map((d, idx) => ({
          id: `do_${idx + 1}`,
          name: d.name || "灯具",
          type: d.objectKind === "directional" ? "directional" : "omni",
          frontArea: d.frontAreaM2 != null ? String(d.frontAreaM2) : "0.1",
          sideArea: d.sideAreaM2 != null ? String(d.sideAreaM2) : "",
          fixAngle: d.fixedAngleDeg != null ? String(d.fixedAngleDeg) : "",
          weight: d.massPerUnitKg != null ? String(d.massPerUnitKg) : "14",
          zHeight:
            d.elevationM != null
              ? String(
                  Number(d.elevationM) > 100
                    ? d.elevationM
                    : Number(d.elevationM) * 1000
                )
              : "8000",
          nnC:
            d.baseWindCoefficient != null
              ? String(d.baseWindCoefficient)
              : "1.0",
          quantity: d.quantity != null ? Number(d.quantity) : 1,
        }));
        sessionStorage.setItem(
          `${projectType}_directObjects`,
          JSON.stringify(uiDo)
        );
      }

      if (!sessionStorage.getItem(`${projectType}_condition`)) {
        sessionStorage.setItem(
          `${projectType}_condition`,
          JSON.stringify({
            designStandard: "jil",
            designWindSpeed: "60",
            designAirDensity: "1.23",
            poleType: "standard",
            openingEnabled: true,
            baseplateEnabled: true,
            foundationEnabled: false,
          })
        );
      }
    }

    // Ensure calculation_config matches condition if condition is present
    try {
      const rawCond =
        rawData.condition || sessionStorage.getItem(`${projectType}_condition`);
      if (rawCond) {
        const cond =
          typeof rawCond === "string" ? JSON.parse(rawCond) : rawCond;
        sessionStorage.setItem(
          `${projectType}_calculation_config`,
          JSON.stringify({
            pole: true,
            opening: Boolean(cond.openingEnabled),
            baseplate: Boolean(cond.baseplateEnabled),
            foundation: Boolean(cond.foundationEnabled),
          })
        );
      }
    } catch {
      // ignore
    }
  }
};

// Saves the current working session to a specific draft ID
export const saveWorkingSessionToDraft = async (projectType, draftId, defaultTitle = "Untitled") => {
  if (sessionStorage.getItem("case_read_only") === "true") {
    return null;
  }
  const data = serializeWorkingSession(projectType);
  
  // Extract title/subtitle/details from identity data if available
  let title = defaultTitle;
  let requestNo = "";
  let companyName = "";
  let projectNo = "";

  const tryExtract = (raw) => {
    if (!raw) return null;
    try {
      const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
      return {
        name: obj.projectName?.trim() || null,
        requestNo: obj.requestNo?.trim() || null,
        companyName: obj.companyName?.trim() || null,
        projectNo: obj.projectNo?.trim() || null,
      };
    } catch {
      return null;
    }
  };

  const fromIdentity = tryExtract(data.projectIdentity);
  const fromLegacyCover = tryExtract(data.cover);

  if (fromIdentity?.name) title = fromIdentity.name;
  else if (fromLegacyCover?.name) title = fromLegacyCover.name;

  if (fromIdentity?.requestNo) requestNo = fromIdentity.requestNo;
  else if (fromLegacyCover?.requestNo) requestNo = fromLegacyCover.requestNo;
  
  if (fromIdentity?.companyName) companyName = fromIdentity.companyName;
  else if (fromLegacyCover?.companyName) companyName = fromLegacyCover.companyName;

  if (fromIdentity?.projectNo) projectNo = fromIdentity.projectNo;
  else if (fromLegacyCover?.projectNo) projectNo = fromLegacyCover.projectNo;

  // Cleanse incomplete reports: report must only exist if all calculation steps and cover info are complete
  try {
    const cond = data.condition
      ? typeof data.condition === "string"
        ? JSON.parse(data.condition)
        : data.condition
      : {};
    const hasPole = Boolean(data.results && data.results !== "null");
    const hasOp = !cond.openingEnabled || Boolean(data.calculatedOp && data.calculatedOp !== "null");
    const hasBp = !cond.baseplateEnabled || Boolean(data.calculatedBaseplate && data.calculatedBaseplate !== "null");
    const hasFd = !cond.foundationEnabled || Boolean(data.calculatedFoundation && data.calculatedFoundation !== "null");

    let rawCover = null;
    if (data.cover) {
      try {
        rawCover = typeof data.cover === "string" ? JSON.parse(data.cover) : data.cover;
      } catch {
        rawCover = null;
      }
    }
    const hasCoverInfo = Boolean(
      rawCover &&
        (rawCover.reportNumber?.trim() || rawCover.calculationNumber?.trim()) &&
        rawCover.author?.trim() &&
        (rawCover.responsibleDepartment?.trim() ||
          rawCover.region?.trim() ||
          rawCover.managementCode?.trim())
    );

    if (!hasPole || !hasOp || !hasBp || !hasFd || !hasCoverInfo) {
      delete data.reportSnapshot;
      delete data.hasReport;
    }
  } catch {
    // ignore
  }

  // Save the draft data payload
  sessionStorage.setItem(`${projectType}_draft_data_${draftId}`, JSON.stringify(data));

  // Update index
  const drafts = getDraftsIndex(projectType);
  const existingIdx = drafts.findIndex(d => d.id === draftId);
  const draftMeta = {
    id: draftId,
    title,
    requestNo,
    companyName,
    projectNo,
    lastEdited: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    drafts[existingIdx] = draftMeta;
  } else {
    drafts.unshift(draftMeta);
  }
  saveDraftsIndex(projectType, drafts);

  // Sync case status in request store: if "Not started", advance to "In progress"
  try {
    const found = draftId ? findRequestOfCase(draftId) : null;
    if (found) {
      const { request, case: caseItem } = found;
      const user = getUser();
      const userName =
        user?.fullName || user?.name || "Drafter";
      const currentStatus = caseItem?.status || "Not started";
      const newStatus = currentStatus === "Not started" ? "In progress" : currentStatus;
      updateRequest(request.id, (r) => ({
        ...r,
        cases: (r.cases || []).map((c) =>
          c.id === draftId
            ? {
                ...c,
                status: newStatus,
                lastEdited: new Date().toISOString(),
                lastEditedBy: userName,
              }
            : c
        ),
      }));
    }
  } catch {
    // ignore
  }

  // Also persist draft to backend database asynchronously
  const isDrawing =
    draftId.startsWith("drawing") ||
    sessionStorage.getItem("projectMode") === "drawing";
  if (draftId && !isDrawing) {
    try {
      const reqId = await resolveRequestIdForCase(draftId);
      if (reqId) {
        const calcPayload = buildCalculationDraftPayload(projectType, data);
        const backendPayload = {
          ...(calcPayload?.poleStandardHeightId
            ? {
                poleStandardHeightId: calcPayload.poleStandardHeightId,
                directObjects: calcPayload.directObjects || [],
                overheadWires: calcPayload.overheadWires || [],
                arms: calcPayload.arms || [],
                groundPosition: calcPayload.groundPosition || "on_gl",
                embedmentLengthMm: calcPayload.embedmentLengthMm ?? null,
              }
            : {}),

          // 1. Full draft state as JSON so Opening, Baseplate, Foundation, Cover, and Report are preserved in DB
          payload: data,
          draftData: data,

          // 2. Structured component JSON objects (compatible with both nested & flat BE models)
          opening: data.openingType
            ? {
                openingType: data.openingType,
                boxType: data.boxType,
                rType: data.rType,
                calculatedOp: data.calculatedOp,
              }
            : null,
          baseplate: data.baseplateType
            ? {
                baseplateType: data.baseplateType,
                fourRibType: data.fourRibType,
                eightRibType: data.eightRibType,
                calculatedBaseplate: data.calculatedBaseplate,
              }
            : null,
          foundation: data.foundationType
            ? {
                foundationType: data.foundationType,
                squareCaisson: data.squareCaisson,
                roundCaisson: data.roundCaisson,
                calculatedFoundation: data.calculatedFoundation,
              }
            : null,
          condition: data.condition,
          cover: data.cover,
          results: data.results,
          calculatedOp: data.calculatedOp,
          calculatedBaseplate: data.calculatedBaseplate,
          calculatedFoundation: data.calculatedFoundation,
          reportSnapshot: data.reportSnapshot,
          hasReport: data.hasReport,
          schematic_data: data.schematic_data,
          calculation_config: data.calculation_config,
          workflow: data.workflow,
          projectIdentity: data.projectIdentity,
        };

        let draftSavedOnServer = false;
        try {
          await saveCalculationDraft(reqId, draftId, backendPayload);
          draftSavedOnServer = true;
          console.info(
            `[saveWorkingSessionToDraft] Synced complete calculation draft to backend for ${draftId}`
          );
        } catch (strictErr) {
          // If backend rejects extra keys (e.g. Unknown calculation draft keys), fallback to standard CalculationInput payload
          if (calcPayload?.poleStandardHeightId) {
            try {
              const cleanBackendPayload = {
                poleStandardHeightId: calcPayload.poleStandardHeightId,
                directObjects: calcPayload.directObjects || [],
                overheadWires: calcPayload.overheadWires || [],
                arms: calcPayload.arms || [],
                groundPosition: calcPayload.groundPosition || "on_gl",
                embedmentLengthMm: calcPayload.embedmentLengthMm ?? null,
              };
              await saveCalculationDraft(reqId, draftId, cleanBackendPayload);
              draftSavedOnServer = true;
              console.info(
                `[saveWorkingSessionToDraft] Synced standard calculation draft to backend for ${draftId}`
              );
            } catch (fallbackErr) {
              console.warn(
                "[saveWorkingSessionToDraft] Standard calculation draft save failed:",
                fallbackErr?.response?.data || fallbackErr?.message
              );
            }
          }
        }

        // Persist cover header to server if cover data is present
        if (data.cover) {
          try {
            const parsedCover =
              typeof data.cover === "string" ? JSON.parse(data.cover) : data.cover;
            if (
              parsedCover &&
              (parsedCover.reportNumber ||
                parsedCover.calculationNumber ||
                parsedCover.title1 ||
                parsedCover.projectName)
            ) {
              const { saveReportHeader, buildReportHeaderPayload } = await import(
                "../services/requestService"
              );
              const headerPayload = buildReportHeaderPayload(parsedCover);
              await saveReportHeader(reqId, draftId, headerPayload);
            }
          } catch (covErr) {
            console.debug(
              "[saveWorkingSessionToDraft] saveReportHeader sync error:",
              covErr?.message
            );
          }
        }
      } else {
        console.warn(
          "[saveWorkingSessionToDraft] Could not resolve request ID for draft:",
          draftId
        );
      }
    } catch (apiErr) {
      console.warn(
        "[saveWorkingSessionToDraft] Backend database sync failed, kept in local session storage:",
        apiErr?.response?.data || apiErr?.message
      );
      // Non-blocking: Do not re-throw error so the UI save is never broken or interrupted
    }
  }

  return data;
};

export const deleteDraft = (projectType, draftId) => {
  // Remove data locally
  sessionStorage.removeItem(`${projectType}_draft_data_${draftId}`);
  // Update index
  const drafts = getDraftsIndex(projectType);
  saveDraftsIndex(projectType, drafts.filter(d => d.id !== draftId));

  // Also remove from backend database
  try {
    resolveRequestIdForCase(draftId)
      .then((reqId) => {
        if (reqId && draftId) {
          return deleteCalculationDraft(reqId, draftId);
        }
        return null;
      })
      .catch(() => {});
  } catch {}
};

// Manages switching between drafts. If the user navigated away from a draft without saving,
// this ensures the unsaved changes are preserved in that draft before loading a new one.

export const hasDraftChanged = (projectType, draftId) => {
  if (sessionStorage.getItem("case_read_only") === "true") {
    return false;
  }
  const currentSession = serializeWorkingSession(projectType);
  const savedDraft = getDraftData(projectType, draftId);
  
  // If it's a completely new draft (not saved yet), check if they actually inputted anything meaningful
  if (!savedDraft) {
    return hasCalculationData(projectType);
  }

  // Compare the current session with the saved draft
  const currentKeys = Object.keys(currentSession);
  const savedKeys = Object.keys(savedDraft);
  
  if (currentKeys.length !== savedKeys.length) return true;
  
  for (let key of currentKeys) {
    if (currentSession[key] !== savedDraft[key]) return true;
  }
  return false;
};

export const handleSessionTransitionAsync = async (projectType, targetDraftId) => {
  const activeDraftId = sessionStorage.getItem(`${projectType}_active_draft_id`);
  
  if (activeDraftId && activeDraftId !== targetDraftId) {
    // Auto-save the previous draft before transitioning
    try {
      await saveWorkingSessionToDraft(projectType, activeDraftId);
    } catch (saveErr) {
      console.warn("[handleSessionTransitionAsync] Previous draft auto-save error:", saveErr);
    }
  }

  // Check if active session already has loaded condition data
  const hasLoadedData = sessionStorage.getItem(`${projectType}_condition`) !== null;

  if (targetDraftId && (targetDraftId !== activeDraftId || !hasLoadedData)) {
    let draftData = getDraftData(projectType, targetDraftId);

    // If not in sessionStorage (e.g. opened in another browser or after session cleared), fetch from DB
    if (!draftData) {
      try {
        const reqId = await resolveRequestIdForCase(targetDraftId);
        if (reqId) {
          const serverDraft = await getCalculationDraft(reqId, targetDraftId);
          if (serverDraft && Object.keys(serverDraft).length > 0) {
            draftData =
              serverDraft?.input && typeof serverDraft.input === "object"
                ? serverDraft.input
                : serverDraft?.payload && typeof serverDraft.payload === "object"
                  ? serverDraft.payload
                  : serverDraft?.data?.input && typeof serverDraft.data?.input === "object"
                    ? serverDraft.data.input
                    : serverDraft?.data && typeof serverDraft.data === "object"
                      ? serverDraft.data
                      : serverDraft;
            if (draftData && Object.keys(draftData).length > 0) {
              sessionStorage.setItem(
                `${projectType}_draft_data_${targetDraftId}`,
                JSON.stringify(draftData)
              );
            }
          }
        }
      } catch (fetchErr) {
        console.debug("[handleSessionTransitionAsync] Server draft fetch failed/empty:", fetchErr?.message);
      }
    }

    if (draftData) {
      deserializeWorkingSession(projectType, draftData); // Load target draft into working session
    }
    sessionStorage.setItem(`${projectType}_active_draft_id`, targetDraftId);
  } else if (!targetDraftId) {
    clearCalculationSession(projectType);
    clearActiveDraftId(projectType);
  }

  // Ensure current active condition.poleType always matches the case's poleKind
  if (targetDraftId) {
    try {
      const found = findRequestOfCase(targetDraftId);
      const casePoleKind = found?.case?.poleKind || found?.case?.pole_kind;
      if (casePoleKind) {
        const rawCond = sessionStorage.getItem(`${projectType}_condition`);
        if (rawCond) {
          const cond = JSON.parse(rawCond);
          if (cond.poleType !== casePoleKind) {
            cond.poleType = casePoleKind;
            if (casePoleKind === "standard") {
              cond.openingEnabled = true;
              cond.baseplateEnabled = true;
              sessionStorage.removeItem(`${projectType}_poles`);
              sessionStorage.removeItem(`${projectType}_poleConfig`);
              sessionStorage.removeItem(`${projectType}_directObjects`);
              sessionStorage.removeItem(`${projectType}_arms`);
              sessionStorage.removeItem(`${projectType}_overheadWires`);
              sessionStorage.removeItem(`${projectType}_results`);
              sessionStorage.removeItem(`${projectType}_standardTaperPoleKey`);
            } else {
              cond.openingEnabled = false;
              cond.baseplateEnabled = false;
              sessionStorage.removeItem(`${projectType}_standardTaperPoleKey`);
              sessionStorage.removeItem(`${projectType}_poleStandard`);
              sessionStorage.removeItem(`${projectType}_directObjects`);
              sessionStorage.removeItem(`${projectType}_overheadWires`);
              sessionStorage.removeItem(`${projectType}_results`);
              sessionStorage.removeItem(`${projectType}_openingType`);
              sessionStorage.removeItem(`${projectType}_boxType`);
              sessionStorage.removeItem(`${projectType}_baseplateType`);
              sessionStorage.removeItem(`${projectType}_fourRibType`);
            }
            sessionStorage.setItem(`${projectType}_condition`, JSON.stringify(cond));
            sessionStorage.setItem(
              `${projectType}_calculation_config`,
              JSON.stringify({
                pole: true,
                opening: Boolean(cond.openingEnabled),
                baseplate: Boolean(cond.baseplateEnabled),
                foundation: Boolean(cond.foundationEnabled),
              })
            );
          }
        }
      }
    } catch {
      // ignore
    }
  }
};

export const handleSessionTransition = (projectType, targetDraftId) => {
  handleSessionTransitionAsync(projectType, targetDraftId).catch((err) => {
    console.debug("[handleSessionTransition] Error during async transition:", err);
  });
};

export const clearActiveDraftId = (projectType) => {
  sessionStorage.removeItem(`${projectType}_active_draft_id`);
};

// ===============================================================================
// SMART PRESERVE LOGIC (HANDOFF & CHANGE DETECTION)
// ===============================================================================

export const saveCalculationSnapshot = (projectType) => {
  // Snapshot critical calculation data before moving to drawing
  const snapshot = {
    pole: sessionStorage.getItem(`${projectType}_results`),
    opening: sessionStorage.getItem(`${projectType}_calculatedOp`),
    baseplate: sessionStorage.getItem(`${projectType}_calculatedBaseplate`),
    foundation: sessionStorage.getItem(`${projectType}_calculatedFoundation`),
  };
  sessionStorage.setItem(`${projectType}_calc_snapshot`, JSON.stringify(snapshot));
};

export const checkSmartPreserveWarning = (projectType) => {
  // Only check if drawing has started
  const drawingStarted = sessionStorage.getItem(`${projectType}_drawing_started`) === "true";
  if (!drawingStarted) return false;

  const rawSnapshot = sessionStorage.getItem(`${projectType}_calc_snapshot`);
  if (!rawSnapshot) {
    // If drawing started but no snapshot exists, create one now to baseline
    saveCalculationSnapshot(projectType);
    return false;
  }

  const snapshot = JSON.parse(rawSnapshot);
  const current = {
    pole: sessionStorage.getItem(`${projectType}_results`),
    opening: sessionStorage.getItem(`${projectType}_calculatedOp`),
    baseplate: sessionStorage.getItem(`${projectType}_calculatedBaseplate`),
    foundation: sessionStorage.getItem(`${projectType}_calculatedFoundation`),
  };

  // Compare snapshot with current
  for (const key in snapshot) {
    if (snapshot[key] !== current[key]) {
      return true; // Calculation was modified
    }
  }

  return false;
};

export const clearSmartPreserveWarning = (projectType) => {
  // Re-baseline the snapshot so the warning clears
  saveCalculationSnapshot(projectType);
};
