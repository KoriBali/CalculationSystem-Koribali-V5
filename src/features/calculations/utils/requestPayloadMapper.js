/**
 * Maps NewRequestForm state into the RequestCreate schema for POST /api/requests
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (val) => typeof val === "string" && UUID_REGEX.test(val.trim());

import {
  getCachedDesignStandards,
  getCachedRegions,
  getCachedPoleCategories,
  getCachedMaterials,
} from "../services/masterDataService";

// Dynamic resolver for poleCategoryId from backend master data (zero hardcoded UUIDs)
export const resolvePoleCategoryId = (typeOrId, categoriesList = null) => {
  if (!typeOrId) return null;
  if (isUuid(typeOrId)) return typeOrId.trim();
  const list =
    categoriesList && categoriesList.length > 0
      ? categoriesList
      : getCachedPoleCategories();
  if (!Array.isArray(list) || list.length === 0) return null;
  const key = String(typeOrId).toLowerCase().trim();
  const found = list.find((c) => {
    const name = String(c.name || "").toLowerCase().trim();
    return (
      c.id === typeOrId ||
      name === key ||
      (key.includes("light") && name.includes("light")) ||
      (key.includes("sign") && name.includes("sign")) ||
      ((key.includes("disaster") || key.includes("acemast")) &&
        (name.includes("acemast") || name.includes("disaster"))) ||
      ((key.includes("multi") || key.includes("multiple")) &&
        name.includes("multi"))
    );
  });
  return found?.id || null;
};

// Dynamic resolver for designStandardId from backend master data (zero hardcoded UUIDs)
export const resolveDesignStandardId = (std, standardsList = null, categoryId = null) => {
  if (!std) return null;
  if (isUuid(std)) return std.trim();
  const list = standardsList && standardsList.length > 0 ? standardsList : getCachedDesignStandards();
  if (!Array.isArray(list) || list.length === 0) return null;
  const key = String(std).toLowerCase().trim();

  const matchInList = (items) =>
    items.find((s) => {
      const name = String(s.name || "").toLowerCase().trim();
      const code = String(s.code || "").toLowerCase().trim();
      if (s.id === std || name === key || code === key) return true;

      // Handle New JIL vs Old Lighting Pole / Old JIL
      if (key === "new_jil" || key === "new jil" || key === "newjil") {
        return name.includes("new") && name.includes("jil");
      }
      if (
        key === "old_lighting_pole" ||
        key === "old lighting pole" ||
        key === "old_lighting" ||
        key === "lighting_pole" ||
        key === "old_jil" ||
        key === "old jil" ||
        key === "oldjil" ||
        key === "jil"
      ) {
        return (
          (name.includes("old") && (name.includes("lighting") || name.includes("pole") || name.includes("jil"))) ||
          code.includes("old") ||
          code.includes("lighting_pole") ||
          (name.includes("lighting") && name.includes("pole") && !name.includes("new")) ||
          (name.includes("jil") && !name.includes("new"))
        );
      }

      if (key === "act" || key.includes("act") || key.includes("law")) {
        return name.includes("act") || name.includes("law");
      }
      if (key === "tower" || key.includes("tower")) return name.includes("tower");
      if (key === "haiden" || key.includes("haiden")) return name.includes("haiden");
      if (key === "v60" || key.includes("v60")) return name.includes("v60");
      if (key === "signboard" || key.includes("sign")) return name.includes("sign");

      return false;
    });

  if (categoryId) {
    const categoryItems = list.filter(
      (s) => s.poleCategoryId === categoryId || !s.poleCategoryId
    );
    const catFound = matchInList(categoryItems);
    if (catFound) return catFound.id;
  }

  const found = matchInList(list);
  return found?.id || null;
};

// Resolves UUID or code to frontend standard code ('old_lighting_pole' | 'new_jil' | 'haiden' | 'v60' | 'act' | 'tower' | 'signboard')
// Dynamically matches against backend master data design standards list (ZERO hardcoded UUIDs)
export const resolveDesignStandardCode = (val, standardsList = null) => {
  if (!val) return "";
  const trimmed = String(val).trim();

  const list =
    standardsList && standardsList.length > 0
      ? standardsList
      : getCachedDesignStandards();
  const found = list.find(
    (s) => s.id === trimmed || s.code === trimmed || s.name === trimmed
  );
  if (found) {
    const name = String(found.name || "").toLowerCase();
    const code = String(found.code || "").toLowerCase();
    if (name.includes("new") && name.includes("jil")) return "new_jil";
    if (name.includes("old") && (name.includes("lighting") || name.includes("pole") || name.includes("jil"))) return "old_lighting_pole";
    if (code.includes("old_lighting_pole") || code.includes("old_lighting") || code.includes("old_jil")) return "old_lighting_pole";
    if (name.includes("lighting") && name.includes("pole") && !name.includes("new")) return "old_lighting_pole";
    if (name.includes("jil") || code.includes("jil")) return "old_lighting_pole";
    if (name.includes("haiden") || code.includes("haiden")) return "haiden";
    if (name.includes("v60") || code.includes("v60")) return "v60";
    if (name.includes("act") || code.includes("act")) return "act";
    if (name.includes("tower") || code.includes("tower")) return "tower";
    if (name.includes("sign") || code.includes("sign")) return "signboard";
    return found.code || found.name?.toLowerCase() || trimmed;
  }

  const key = trimmed.toLowerCase();
  if (key === "new_jil" || key === "new jil" || key === "newjil") return "new_jil";
  if (
    key === "old_lighting_pole" ||
    key === "old lighting pole" ||
    key === "old_lighting" ||
    key === "lighting_pole" ||
    key === "old_jil" ||
    key === "old jil" ||
    key === "oldjil" ||
    key === "jil"
  ) return "old_lighting_pole";
  if (key === "haiden" || key.includes("haiden")) return "haiden";
  if (key === "v60" || key.includes("v60")) return "v60";
  if (key === "act" || key.includes("act") || key.includes("law")) return "act";
  if (key === "tower" || key.includes("tower")) return "tower";
  if (key === "signboard" || key.includes("sign")) return "signboard";
  return "";
};

// Resolves UUID or code to human-readable standard label
export const resolveDesignStandardLabel = (val, projectType = null, standardsList = null) => {
  const code = resolveDesignStandardCode(val, standardsList);
  switch (code) {
    case "new_jil":
      return "New JIL";
    case "old_lighting_pole":
    case "old_jil":
    case "jil":
      return "Old Lighting Pole";
    case "haiden":
      return "Haiden";
    case "v60":
      return "V60";
    case "act":
      return "Standard Acts. (Law)";
    case "tower":
      return "Tower Standard";
    case "signboard":
      return "Signboard";
    default:
      return val || "—";
  }
};

// Maps DrawingType to frontend canonical option string ("APD (Approval Drawing)", etc.)
export const canonicalDrawingType = (val) => {
  if (!val) return "";
  const s = String(val).toLowerCase().trim();
  if (s.includes("approval") || s.includes("apd")) return "APD (Approval Drawing)";
  if (s.includes("manufacturer") || s.includes("mfd")) return "MFD (Manufacturer Drawing)";
  if (s.includes("order")) return "Order Drawing";
  if (s.includes("meeting")) return "Meeting Drawing";
  return val;
};

// Dynamic resolver for regionId from backend master data (zero hardcoded UUIDs)
export const resolveRegionId = (reg, regionsList = null) => {
  if (!reg) return null;
  if (isUuid(reg)) return reg.trim();
  const list = regionsList && regionsList.length > 0 ? regionsList : getCachedRegions();
  if (!Array.isArray(list) || list.length === 0) return null;
  const key = String(reg).toLowerCase().trim();
  const found = list.find((r) => {
    const code = String(r.code || "").toLowerCase().trim();
    const label = String(r.label || "").toLowerCase().trim();
    return (
      r.id === reg ||
      code === key ||
      label === key ||
      (key.includes("east") && (code.includes("east") || label.includes("east"))) ||
      (key.includes("west") && (code.includes("west") || label.includes("west")))
    );
  });
  return found?.id || null;
};

// Resolves UUID or code to frontend code (e.g. 'east_japan' | 'west_japan')
export const resolveRegionCode = (val, regionsList = null) => {
  if (!val) return "";
  const list = regionsList && regionsList.length > 0 ? regionsList : getCachedRegions();
  const found = list.find((r) => r.id === val || r.code === val);
  return found?.code || val;
};

// Maps DrawingType enum: 'approval' | 'manufacturer' | 'order' | 'meeting'
export const mapDrawingType = (val) => {
  if (!val) return null;
  const s = String(val).toLowerCase().trim();
  if (s.includes("approval") || s.includes("apd")) return "approval";
  if (s.includes("manufacturer") || s.includes("mfd")) return "manufacturer";
  if (s.includes("order")) return "order";
  if (s.includes("meeting")) return "meeting";
  return null;
};

// Maps FoundationType enum: 'square' | 'circle'
const mapFoundationType = (val) => {
  if (!val) return null;
  const s = String(val).toLowerCase().trim();
  if (s.includes("square")) return "square";
  if (s.includes("circle") || s.includes("round") || s.includes("caisson")) return "circle";
  return null;
};

const toPositiveNumber = (val) => {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return isNaN(n) || n <= 0 ? null : n;
};

const toPositiveInt = (val) => {
  if (val === null || val === undefined || val === "") return null;
  const n = parseInt(val, 10);
  return isNaN(n) || n <= 0 ? null : n;
};

export function buildRequestPayload({
  projectType = "lighting-project",
  coverType = "ys",
  fields = {},
  workTypes = { calc: true, drawing: true },
  notes = null,
  currentUser = null,
  poleCategoryId = null,
  categoriesList = null,
}) {
  const brandLine = coverType === "yp" ? "yp" : "ys";

  // 1. Determine designType ('calculation' | 'drawing' | 'drawing_calculation')
  let designType = "calculation";
  if (workTypes.calc && workTypes.drawing) {
    designType = "drawing_calculation";
  } else if (workTypes.drawing) {
    designType = "drawing";
  } else {
    designType = "calculation";
  }

  // 2. Request classification ('new' | 'change' | 'reuse_new')
  const validClassifications = ["new", "change", "reuse_new"];
  const requestClassification = validClassifications.includes(fields.classification)
    ? fields.classification
    : "new";

  // 3. Request type ('general' | 'special')
  const requestType = fields.requestType === "special" ? "special" : "general";

  // 4. Request No & PJ No
  const requestNo = String(
    fields.requestNo ||
    fields.documentNo ||
    fields.mgmtNo ||
    `REQ-${Date.now().toString().slice(-6)}`
  ).trim();

  const pjNo = String(
    fields.projectNo ||
    fields.pjNo ||
    `PJ-${Date.now().toString().slice(-6)}`
  ).trim();

  // 5. Subject / Project Name
  const subject = String(
    fields.subject ||
    fields.projectName ||
    "Standard Lighting Pole Project"
  ).trim();

  // 6. Dates (YYYY-MM-DD format)
  const todayStr = new Date().toISOString().slice(0, 10);
  const formatDate = (d) => {
    if (!d) return null;
    const clean = String(d).trim().replace(/\//g, "-");
    return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : null;
  };

  const requestDate =
    formatDate(fields.requestDate) ||
    todayStr;

  const defaultDue = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const dueDate =
    formatDate(fields.dueDate) ||
    formatDate(fields.requestedDate) ||
    formatDate(fields.deliveryDate) ||
    defaultDue;

  // 7. Requesting Department
  const requestingDepartmentName = String(
    fields.department ||
    fields.companyName ||
    currentUser?.department?.name ||
    currentUser?.departmentName ||
    "Head Office"
  ).trim();

  // 8. Notes: user note or null (never Indonesian)
  const finalNotes =
    notes && typeof notes === "string" && notes.trim()
      ? notes.trim()
      : null;

  // 9. Conditions
  const resolvedCategoryId =
    (isUuid(poleCategoryId) ? poleCategoryId.trim() : null) ||
    resolvePoleCategoryId(projectType, categoriesList);
  const resolvedStdCode = resolveDesignStandardCode(fields.standard);
  const conditions = {
    designStandardId: resolveDesignStandardId(fields.standard, null, resolvedCategoryId),
    windSpeed: fields.windSpeed ? Number(fields.windSpeed) : null,
    airDensity: fields.airDensity
      ? Number(fields.airDensity)
      : resolvedStdCode === "jil" || resolvedStdCode === "new_jil" || resolvedStdCode === "old_jil" || resolvedStdCode === "old_lighting_pole"
      ? 1.23
      : null,
  };

  // 10. Shared Details
  const cleanStr = (val, maxLen) => {
    if (val === null || val === undefined) return null;
    const s = String(val).trim();
    if (!s) return null;
    return maxLen ? s.slice(0, maxLen) : s;
  };

  const sharedDetails = {
    scheduledDeliveryDate: cleanStr(fields.deliveryDate, 100),
    deliveryQuantity: toPositiveInt(fields.deliveryQty || fields.quantityUnits),
    requesterPicName: cleanStr(fields.pic, 120),
    drawingType: mapDrawingType(fields.drawingType || fields.deliverType) || null,
    paperSize: cleanStr(fields.paperSize, 50),
    isCadDataRequested: Boolean(fields.deliverCad || fields.cadFormat),
    cadFormat: cleanStr(fields.cadFormat, 50),
  };

  // 11. YP Details (if brandLine === "yp")
  let ypDetails = null;
  if (brandLine === "yp") {
    ypDetails = {
      tailCode: cleanStr(fields.tailCode, 10),
      calcStrength: Boolean(fields.calcStrength),
      calcDesign: Boolean(fields.calcDesign),
      scopeMainMember: Boolean(fields.scopeMain),
      scopeJoint: Boolean(fields.scopeJoint),
      scopeFoundation: Boolean(fields.scopeFoundation),
      scopeOther: cleanStr(fields.scopeOther, 200),
      draftingTracing: Boolean(fields.draftTracing),
      draftingDesign: Boolean(fields.draftDesign),
      submissionDestination1: cleanStr(fields.submitTo1, 200),
      submissionDestination2: cleanStr(fields.submitTo2, 200),
      submissionDestination3: cleanStr(fields.submitTo3, 200),
      hasCompetitor: fields.hasCompetitor === "yes",
      designOrigin: ["development", "proposal", "existing", "customer_spec"].includes(fields.designOrigin)
        ? fields.designOrigin
        : null,
      scheduleFlexibility: cleanStr(fields.scheduleFlex, 200),
      paperFrame: cleanStr(fields.paperFrame, 100),
      finishedCopies: toPositiveInt(fields.finishedCopies),
      platingProviso: cleanStr(fields.platingProviso),
    };
  }

  // 12. YS Details (if brandLine === "ys")
  let ysDetails = null;
  if (brandLine === "ys") {
    ysDetails = {
      receiptNo: cleanStr(fields.receptionNo, 100),
      materialText: cleanStr(fields.material, 200),
      materialId: isUuid(fields.materialId) ? fields.materialId : null,
      foundationType: mapFoundationType(fields.foundation),
      foundationWidthX: toPositiveNumber(fields.foundationWidth),
      foundationWidthY: toPositiveNumber(fields.foundationLength),
      embedmentDepth: toPositiveNumber(fields.foundationDepth),
      designStandardText: cleanStr(fields.standard, 200),
      windSpeedText: cleanStr(fields.windSpeed, 100),
      openingHeight: cleanStr(fields.openingHeight, 100),
      concreteStrength: cleanStr(fields.concreteStrength, 200),
      openingDirectionNote: cleanStr(fields.openingDirection),
    };
  }

  // 13. Assignments: only include if assigneeUserId is a valid UUID
  const assignments = [];
  if (currentUser?.id && isUuid(String(currentUser.id))) {
    assignments.push({
      assigneeUserId: String(currentUser.id),
      workType:
        workTypes.calc && workTypes.drawing
          ? "calculation"
          : workTypes.drawing
            ? "drawing"
            : "calculation",
    });
  }

  // 14. Finish: map surfaceTreatment and coatingType into backend Finish schema
  const finish =
    fields.surfaceTreatment || fields.coatingType
      ? {
          treatmentOption: fields.coatingType ? "plating_painting" : "plating_only",
          platingType: "standard",
          platingSpec: cleanStr(fields.surfaceTreatment, 100),
          colorName: cleanStr(fields.coatingType, 100),
        }
      : null;

  return {
    brandLine,
    poleCategoryId:
      (isUuid(poleCategoryId) ? poleCategoryId.trim() : null) ||
      resolvePoleCategoryId(projectType, categoriesList),
    requestNo,
    pjNo,
    requestType,
    designType,
    requestClassification,
    subject,
    requestDate,
    dueDate,
    requestingDepartmentName,
    notes: finalNotes,
    sharedDetails,
    ypDetails,
    ysDetails,
    finish,
    assignments,
  };
}

/**
 * Maps technical API field paths to human-friendly UI form labels.
 */
const API_FIELD_LABEL_MAP = {
  // Shared / Request General
  "sharedDetails.deliveryQuantity": "Delivery Quantity (数量)",
  "sharedDetails.scheduledDeliveryDate": "Delivery Date (納期)",
  "sharedDetails.requesterPicName": "PIC Name (担当者)",
  "sharedDetails.drawingType": "Drawing Type (図面種類)",
  "sharedDetails.paperSize": "Paper Size",
  "sharedDetails.cadFormat": "CAD Format",
  "deliveryQuantity": "Delivery Quantity (数量)",
  "scheduledDeliveryDate": "Delivery Date (納期)",
  "requesterPicName": "PIC Name (担当者)",
  "drawingType": "Drawing Type (図面種類)",
  "requestNo": "Request No (管理番号)",
  "pjNo": "Project No (物件番号)",
  "subject": "Project Name (件名)",
  "projectName": "Project Name (件名)",
  "requestClassification": "Classification (区分)",
  "requestType": "Request Type",
  "requestDate": "Request Date",
  "dueDate": "Delivery Date (納期)",
  "requestingDepartmentName": "Department / Company",
  "notes": "Notes",

  // Conditions
  "conditions.windSpeed": "Wind Speed (風速)",
  "conditions.airDensity": "Air Density",
  "conditions.designStandardId": "Standard (規格)",
  "windSpeed": "Wind Speed (風速)",
  "designStandardId": "Standard (規格)",

  // YS Details
  "ysDetails.receiptNo": "Reception No (受付番号)",
  "ysDetails.materialText": "Material (材質)",
  "ysDetails.foundationType": "Foundation Shape (基礎形状)",
  "ysDetails.foundationWidthX": "Foundation Width (基礎幅)",
  "ysDetails.foundationWidthY": "Foundation Length (基礎長)",
  "ysDetails.embedmentDepth": "Foundation Depth (根入れ)",
  "ysDetails.designStandardText": "Standard (規格)",
  "ysDetails.concreteStrength": "Concrete Strength",
  "ysDetails.openingHeight": "Opening Height",
  "ysDetails.openingDirectionNote": "Opening Direction",
  "foundationType": "Foundation Shape (基礎形状)",
  "foundationWidthX": "Foundation Width (基礎幅)",
  "foundationWidthY": "Foundation Length (基礎長)",
  "embedmentDepth": "Foundation Depth (根入れ)",

  // YP Details
  "ypDetails.tailCode": "Tail Code",
  "ypDetails.finishedCopies": "Finished Copies",
  "ypDetails.paperFrame": "Paper Frame",
};

function cleanValidationMessage(msg) {
  if (!msg) return "is invalid";
  let s = String(msg).trim();

  // Handle specific backend compound validator messages:
  if (
    /sharedDetails\.regionId and sharedDetails\.drawingType are required/i.test(s) ||
    /drawingType are required when designType includes drawing/i.test(s)
  ) {
    return "Region and Drawing Type (図面種類) are required when Drawing is selected";
  }
  if (/drawingType.*required/i.test(s)) {
    return "Drawing Type (図面種類) is required when Drawing is selected";
  }
  if (/regionId.*required/i.test(s)) {
    return "Region is required for drawing requests";
  }

  // Replace common technical paths with user-friendly terms
  s = s
    .replace(/sharedDetails\.drawingType/g, "Drawing Type (図面種類)")
    .replace(/sharedDetails\.regionId/g, "Region")
    .replace(/sharedDetails\.deliveryQuantity/g, "Delivery Quantity (数量)")
    .replace(/conditions\.designStandardId/g, "Standard (規格)")
    .replace(/conditions\.windSpeed/g, "Wind Speed (風速)")
    .replace(/ysDetails\./g, "")
    .replace(/sharedDetails\./g, "")
    .replace(/when designType includes drawing/gi, "when Drawing is selected");

  if (/input should be a valid integer/i.test(s)) {
    return "must be a valid whole number";
  }
  if (/input should be a valid number/i.test(s)) {
    return "must be a valid number";
  }
  if (/input should be greater than 0/i.test(s)) {
    return "must be greater than 0";
  }
  if (/field required/i.test(s)) {
    return "is required";
  }
  if (/input should be a valid string/i.test(s)) {
    return "invalid text format";
  }
  return s.replace(/^Value error,\s*/i, "");
}

function getHumanFieldName(loc) {
  if (!Array.isArray(loc) || loc.length === 0) return "";
  const parts = loc.filter((p) => p !== "body" && p !== "__root__");
  if (parts.length === 0) return "";

  const fullPath = parts.join(".");
  if (API_FIELD_LABEL_MAP[fullPath]) return API_FIELD_LABEL_MAP[fullPath];

  const lastKey = parts[parts.length - 1];
  if (!lastKey) return "";
  if (API_FIELD_LABEL_MAP[lastKey]) return API_FIELD_LABEL_MAP[lastKey];

  return String(lastKey)
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Formats API errors (including FastAPI 422 arrays) into user-friendly messages without technical jargon.
 */
export function formatApiErrorMessage(err) {
  const detail = err?.response?.data?.detail;

  if (Array.isArray(detail) && detail.length > 0) {
    const errorItems = detail.map((d) => {
      const fieldName = getHumanFieldName(d.loc);
      const cleanMsg = cleanValidationMessage(d.msg);
      if (!fieldName) {
        return cleanMsg;
      }
      return `${fieldName}: ${cleanMsg}`;
    });

    if (errorItems.length === 1) {
      return errorItems[0];
    }

    return errorItems.slice(0, 3).join("; ");
  }

  if (typeof detail === "string") {
    return cleanValidationMessage(detail);
  }
  if (err?.response?.data?.message) {
    return cleanValidationMessage(err.response.data.message);
  }
  if (err?.message) {
    return err.message;
  }
  return "Failed to save request. Please try again.";
}

/**
 * Maps form values into schemas required for updating an existing request
 */
export function buildRequestUpdatePayload({
  projectType = "lighting-project",
  coverType = "ys",
  fields = {},
  workTypes = { calc: true, drawing: true },
  notes = null,
  currentUser = null,
  existingPoleCategoryId = null,
  categoriesList = null,
  skipConditionsUpdate = false,
  skipDrawingConditionsUpdate = false,
}) {
  const resolvedCategoryId =
    (isUuid(existingPoleCategoryId) ? existingPoleCategoryId.trim() : null) ||
    resolvePoleCategoryId(projectType, categoriesList);

  const full = buildRequestPayload({
    projectType,
    coverType,
    fields,
    workTypes,
    notes,
    currentUser,
    poleCategoryId: resolvedCategoryId,
    categoriesList,
  });

  const requestUpdate = {
    requestType: full.requestType,
    designType: full.designType,
    requestClassification: full.requestClassification,
    notes: full.notes,
  };

  if (full.requestNo && full.requestNo.trim()) {
    requestUpdate.requestNo = full.requestNo.trim();
  }
  if (full.pjNo && full.pjNo.trim()) {
    requestUpdate.pjNo = full.pjNo.trim();
  }
  if (full.subject && full.subject.trim()) {
    requestUpdate.subject = full.subject.trim();
  }
  requestUpdate.requestDate = full.requestDate || null;
  requestUpdate.dueDate = full.dueDate || null;
  if (full.requestingDepartmentName && full.requestingDepartmentName.trim()) {
    requestUpdate.requestingDepartmentName = full.requestingDepartmentName.trim();
  }

  // Only include poleCategoryId if it is a valid UUID
  if (isUuid(resolvedCategoryId)) {
    requestUpdate.poleCategoryId = resolvedCategoryId;
  }

  return {
    requestUpdate,
    sharedDetails: full.sharedDetails,
    ysDetails: full.ysDetails,
    ypDetails: full.ypDetails,
    finish: full.finish || {
      treatmentOption: null,
      platingType: null,
      platingSpec: null,
      colorName: null,
    },
    conditions: null,
    skipDrawingConditionsUpdate: true,
    coverType,
  };
}

/**
 * Maps direct objects from frontend state to backend DirectObjectInput schema:
 * - name: string [1, 255]
 * - objectKind: "omni" | "directional"
 * - frontAreaM2: number
 * - sideAreaM2: number | null
 * - fixedAngleDeg: number | null
 * - massPerUnitKg: number
 * - elevationM: number (converted from mm if > 10)
 * - baseWindCoefficient: number
 * - quantity: integer
 */
export const mapCalculationDirectObjects = (rawList, isOldJil = false) => {
  if (!Array.isArray(rawList) || rawList.length === 0) return [];
  return rawList
    .filter(
      (d) =>
        d &&
        (d.name ||
          d.weight != null ||
          d.frontArea != null ||
          d.zHeight != null ||
          d.elevationM != null),
    )
    .map((d, idx) => {
      const rawH = Number(d.zHeight ?? d.elevationM ?? 0);
      const elevationM = rawH > 10 ? rawH / 1000 : rawH;

      const kind = isOldJil
        ? "omni"
        : (d.objectKind || d.type) === "directional"
          ? "directional"
          : "omni";

      return {
        name: String(d.name || `Object ${idx + 1}`).trim(),
        objectKind: kind,
        frontAreaM2: Number(d.frontArea ?? d.frontAreaM2 ?? 0),
        sideAreaM2: isOldJil
          ? null
          : d.sideArea != null && d.sideArea !== ""
            ? Number(d.sideArea)
            : d.sideAreaM2 != null && d.sideAreaM2 !== ""
              ? Number(d.sideAreaM2)
              : null,
        fixedAngleDeg: isOldJil
          ? null
          : d.fixAngle != null && d.fixAngle !== ""
            ? Number(d.fixAngle)
            : d.fixedAngleDeg != null && d.fixedAngleDeg !== ""
              ? Number(d.fixedAngleDeg)
              : null,
        massPerUnitKg: Number(d.weight ?? d.massPerUnitKg ?? 0),
        elevationM,
        baseWindCoefficient: Number(d.nnC ?? d.baseWindCoefficient ?? 1.0),
        quantity: Math.max(1, Math.round(Number(d.quantity || 1))),
      };
    });
};

/**
 * Maps overhead wires from frontend state to backend OverheadWireInput schema:
 * - name: string [1, 255]
 * - massPerLengthKgM: number
 * - diameterMm: number
 * - elevationM: number (converted from mm if > 10)
 * - spanLengthM: number (converted from mm if > 10)
 * - sagRatioPercent: number
 * - baseWindCoefficient: number
 * - fixedAngleDeg: number | null
 * - verticalAngleDeg: number | null
 */
export const mapCalculationOverheadWires = (rawList) => {
  if (!Array.isArray(rawList) || rawList.length === 0) return [];
  return rawList
    .filter((w) => w && (w.name || w.weight != null || w.diameter != null))
    .map((w, idx) => {
      const rawH = Number(w.zHeight ?? w.elevationM ?? 0);
      const elevationM = rawH > 10 ? rawH / 1000 : rawH;

      const rawSpan = Number(w.span ?? w.spanLengthM ?? 0);
      const spanLengthM = rawSpan > 10 ? rawSpan / 1000 : rawSpan;

      return {
        name: String(w.name || `Overhead Wire ${idx + 1}`).trim(),
        massPerLengthKgM: Number(w.weight ?? w.massPerLengthKgM ?? 0),
        diameterMm: Number(w.diameter ?? w.diameterMm ?? 0),
        elevationM,
        spanLengthM,
        sagRatioPercent: Number(w.saggingRatio ?? w.sagRatioPercent ?? 0),
        baseWindCoefficient: Number(w.nnC ?? w.baseWindCoefficient ?? 1.0),
        fixedAngleDeg:
          w.fixAngle != null && w.fixAngle !== ""
            ? Number(w.fixAngle)
            : w.fixedAngleDeg != null && w.fixedAngleDeg !== ""
              ? Number(w.fixedAngleDeg)
              : null,
        verticalAngleDeg:
          w.verticalAngle != null && w.verticalAngle !== ""
            ? Number(w.verticalAngle)
            : w.verticalAngleDeg != null && w.verticalAngleDeg !== ""
              ? Number(w.verticalAngleDeg)
              : null,
      };
    });
};

// Dynamic resolver for materialId from backend master data
export const resolveMaterialId = (val, materialsList = null) => {
  if (!val) return null;
  if (isUuid(val)) return val.trim();
  const list =
    materialsList && materialsList.length > 0
      ? materialsList
      : getCachedMaterials();
  if (!Array.isArray(list) || list.length === 0) return null;
  const key = String(val).toLowerCase().trim();
  const found = list.find((m) => {
    const name = String(m.name || "").toLowerCase().trim();
    const code = String(m.code || "").toLowerCase().trim();
    return m.id === val || name === key || code === key || (key.includes("stk") && name.includes("stk"));
  });
  return found?.id || list[0]?.id || null;
};

/**
 * Maps arms and arm objects from frontend state to backend ArmInput schema:
 * ArmInput:
 * - name: string [1, 255]
 * - materialId: string (UUID resolved from master data)
 * - diameterMm: number
 * - thicknessMm: number
 * - totalLengthM: number (converted from mm if > 10)
 * - exposedLengthM: number (converted from mm if > 10)
 * - installationHeightM: number (converted from mm if > 10)
 * - fixedAngleDeg: number (default 0)
 * - objects: array<ArmObjectInput>
 *
 * ArmObjectInput:
 * - name: string [1, 255]
 * - objectKind: "omni" | "directional"
 * - frontAreaM2: number
 * - sideAreaM2: number | null
 * - massPerUnitKg: number
 * - horizontalLoadDistanceM: number (converted from mm if > 10)
 * - baseWindCoefficient: number
 * - quantity: integer
 */
export const mapCalculationArms = (rawList, materialsList = null, isOldJil = false) => {
  if (!Array.isArray(rawList) || rawList.length === 0) return [];
  return rawList
    .filter((a) => a && (a.name || a.diameter != null || a.length != null))
    .map((a, idx) => {
      const rawTotalL = Number(a.length ?? a.totalLengthM ?? 0);
      const totalLengthM = rawTotalL > 10 ? rawTotalL / 1000 : rawTotalL;

      const rawExpL = Number(a.expLength ?? a.exposedLengthM ?? 0);
      const exposedLengthM = rawExpL > 10 ? rawExpL / 1000 : rawExpL;

      const rawH = Number(a.zHeight ?? a.installationHeightM ?? 0);
      const installationHeightM = rawH > 10 ? rawH / 1000 : rawH;

      const rawObjects = Array.isArray(a.objects)
        ? a.objects
        : Array.isArray(a.armObjects)
          ? a.armObjects
          : [];

      const mappedObjects = rawObjects
        .filter((ao) => ao && (ao.name || ao.frontArea != null || ao.weight != null))
        .map((ao, aoIdx) => {
          const rawKind =
            (ao.objectKind || ao.type) === "directional" ? "directional" : "omni";
          const kind = isOldJil ? "omni" : rawKind;
          let rawHD =
            ao.hDistance != null && ao.hDistance !== ""
              ? Number(ao.hDistance)
              : ao.horizontalLoadDistanceM != null && ao.horizontalLoadDistanceM !== ""
                ? Number(ao.horizontalLoadDistanceM)
                : null;

          if (rawHD == null) {
            const aoZ = Number(ao.zHeight || 0);
            const armZ = Number(a.zHeight || 0);
            // In standard pole specs (e.g. specStandardPole.json), the arm object's 180 mm
            // is stored under zHeight but represents the hDistance (load distance along the arm),
            // because the true vertical zHeight of the object is the arm's installation height.
            if (aoZ > 0 && Math.abs(aoZ - armZ) > 10) {
              rawHD = aoZ;
            } else {
              rawHD = Number(a.expLength ?? a.length ?? 0);
            }
          }

          const horizontalLoadDistanceM =
            rawHD > 10 ? rawHD / 1000 : rawHD > 0 ? rawHD : totalLengthM || 0.1;

          return {
            name: String(ao.name || `Arm Object ${aoIdx + 1}`).trim(),
            objectKind: kind,
            frontAreaM2: Number(ao.frontArea ?? ao.frontAreaM2 ?? 0),
            sideAreaM2:
              isOldJil
                ? null
                : kind === "directional" && (ao.sideArea != null || ao.sideAreaM2 != null)
                  ? Number(ao.sideArea ?? ao.sideAreaM2)
                  : null,
            massPerUnitKg: Number(ao.weight ?? ao.massPerUnitKg ?? 0),
            horizontalLoadDistanceM,
            baseWindCoefficient: Number(ao.nnC ?? ao.baseWindCoefficient ?? 1.0),
            quantity: Math.max(1, Math.round(Number(ao.quantity || 1))),
          };
        });

      const resolvedMatId = resolveMaterialId(
        a.materialId || a.material,
        materialsList,
      );

      return {
        name: String(a.name || `Arm ${idx + 1}`).trim(),
        materialId: resolvedMatId || null,
        diameterMm: Number(a.diameter ?? a.diameterMm ?? 0),
        thicknessMm: Number(a.thickness ?? a.thicknessMm ?? 0),
        totalLengthM,
        exposedLengthM,
        installationHeightM,
        fixedAngleDeg:
          a.fixAngle != null && a.fixAngle !== ""
            ? Number(a.fixAngle)
            : a.fixedAngleDeg != null && a.fixedAngleDeg !== ""
              ? Number(a.fixedAngleDeg)
              : 0,
        objects: mappedObjects,
      };
    });
};
