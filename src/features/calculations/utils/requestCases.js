// Cases of a request: each case is one piece of work — a calculation or a
// drawing — done in its own draft (/requests/:type/:draftId). Cases are the
// only way into a draft: it opens on Project Setup, and leaving goes back to
// the case's request.
import { findRequestOfCase, updateRequest } from "../data/requestStore";
import { getDraftsIndex, resolveRequestIdForCase } from "./coreLogic";

export const DEFAULT_IDENTITY = {
  requestNo: "",
  receiptNo: "",
  companyName: "",
  responsibleDepartment: "",
  requestType: "",
  requestCategory: "",
  projectNo: "",
  requestedDueDate: "",
  projectName: "",
  checkedByName: "",
  approvedByName: "",
};
import { parseDocumentNo } from "./requestForm";
import {
  STANDARD_OPENING_TYPE,
  STANDARD_BOX_TYPE,
  STANDARD_BASEPLATE_TYPE,
  STANDARD_FOUR_RIB_TYPE,
} from "../constants/standardPoleDefaults";
import { markCaseReadyForCheck } from "../services/requestService";
import {
  resolveDesignStandardCode,
  canonicalDrawingType,
  resolveRegionCode,
} from "./requestPayloadMapper";

// Discipline of a case: its label and the draft workflow mode it opens in.
export const CASE_WORK_TYPES = {
  calc: { label: "Calculation", projectMode: "calculation" },
  drawing: { label: "Drawing", projectMode: "drawing" },
};

// The disciplines a new case can take: the ones ticked on the request.
// One → new cases take it automatically; both → the user picks.
export const caseWorkTypesFor = (workTypes) =>
  Object.keys(CASE_WORK_TYPES).filter((key) => workTypes[key]);

// "001", "002", … — continues after the highest one so far.
export const nextCaseNo = (cases) =>
  String(Math.max(0, ...cases.map((c) => Number(c.no))) + 1).padStart(3, "0");

// ─── Project Setup, filled in from the request ───────────────────────────────
// Project Setup's own option values for the request's choices. Reuse has no
// matching category, so it's left for the user to pick.
const SETUP_REQUEST_TYPE = { general: "General", special: "Special" };
const SETUP_CATEGORY = { new: "New", change: "Modification" };
// Project Setup fields per cover type. Responsible Department isn't filled:
// it's a master-data code, the cover only has free text.
const SETUP_FROM_COVER = {
  yp: (f) => ({
    requestNo: f.documentNo,
    projectNo: parseDocumentNo(f.documentNo).projectNo,
    requestedDueDate: f.dueDate,
    projectName: f.subject,
  }),
  ys: (f) => ({
    requestNo: f.requestNo,
    receiptNo: f.receptionNo,
    companyName: f.companyName,
    projectNo: f.projectNo,
    requestedDueDate: f.requestedDate,
    projectName: f.projectName,
  }),
};
const setupIdentityFrom = (request) => {
  const coverFn = SETUP_FROM_COVER[request.coverType];
  const coverFields = coverFn ? coverFn(request.fields || {}) : {};
  return {
    ...DEFAULT_IDENTITY,
    requestType: SETUP_REQUEST_TYPE[request.fields?.requestType] ?? "",
    requestCategory: SETUP_CATEGORY[request.fields?.classification] ?? "",
    ...coverFields,
  };
};

// A new case plus its draft: set to the case's discipline and with Project
// Setup filled in from the request, so it opens ready to work on.
export const createCase = (request, workType, options = {}) => {
  const id = options.id || `draft_${Date.now()}`;
  const workflow = {
    projectMode: CASE_WORK_TYPES[workType].projectMode,
    withReport: false,
  };
  const designConditions = request.designConditions || {};
  const poleKind = options.poleKind || (request.projectType === "lighting-project" ? "standard" : "custom");
  const isStandard = poleKind === "standard";
  const initialCondition = {
    designStandard:
      resolveDesignStandardCode(designConditions.standard) ||
      (request.projectType === "lighting-project" ? "jil" : "v60"),
    designWindSpeed: designConditions.windSpeed || "60",
    designAirDensity: designConditions.airDensity || "1.23",
    poleType: poleKind,
    openingEnabled: isStandard ? true : false,
    baseplateEnabled: isStandard ? true : false,
    foundationEnabled: false,
  };
  const initialDrawingGeneral = {
    drawingType:
      options.drawingType ||
      canonicalDrawingType(request.drawingConditions?.drawingType) ||
      "",
    region:
      resolveRegionCode(request.drawingConditions?.region) || "east_japan",
    drawingNumber: "",
    partNumber: "",
    openingDirection: "",
    lightingCompanyName: "",
    poleType: isStandard ? "Standard Pole" : "Custom Pole",
    additionalComponents: {
      opening: isStandard ? true : false,
      baseplate: isStandard ? true : false,
      foundation: false,
    },
    useCoupling: null,
  };

  // Draft data keeps each value as its raw stored (JSON) string.
  const draftData = {
    workflow: JSON.stringify(workflow),
    projectIdentity: JSON.stringify(setupIdentityFrom(request)),
    condition: JSON.stringify(initialCondition),
    drawing_general: JSON.stringify(initialDrawingGeneral),
    drawing_coupling_location: JSON.stringify(request.drawingConditions?.region || "east_japan"),
  };

  if (isStandard) {
    draftData.openingType = JSON.stringify(STANDARD_OPENING_TYPE);
    draftData.boxType = JSON.stringify(STANDARD_BOX_TYPE);
    draftData.baseplateType = JSON.stringify(STANDARD_BASEPLATE_TYPE);
    draftData.fourRibType = JSON.stringify(STANDARD_FOUR_RIB_TYPE);
  }

  sessionStorage.setItem(
    `${request.projectType}_draft_data_${id}`,
    JSON.stringify(draftData),
  );
  const nextNo = options.no || nextCaseNo(request.cases || []);
  const fallbackTitle =
    request.fields?.subject ||
    request.fields?.projectName ||
    `Case ${nextNo}`;

  const caseLabelVal = options.caseLabel || options.case_label || `Case ${nextNo}`;

  return {
    id,
    no: nextNo,
    caseLabel: caseLabelVal,
    case_label: caseLabelVal,
    title: options.title || fallbackTitle,
    poleKind: options.poleKind || "standard",
    drawingType:
      options.drawingType || (workType === "drawing" ? "Approval" : ""),
    workType,
    owner: options.owner || request.createdBy || "Unassigned",
    createdBy: options.createdBy || options.owner || request.createdBy || "Unassigned",
    status: options.status || "Not started",
    createdAt: options.createdAt || new Date().toISOString(),
    lastEdited: options.lastEdited || null,
  };
};

// When the case's draft was last saved, or null if it hasn't been opened
// and saved yet.
export const caseLastEdited = (projectType, caseId) =>
  getDraftsIndex(projectType).find((d) => d.id === caseId)?.lastEdited ?? null;

// ─── Leaving a draft ─────────────────────────────────────────────────────────
// Where to go when leaving a draft: its request, or the request list for a
// draft that isn't a case.
export const requestPathForDraft = (draftId) => {
  const found = draftId ? findRequestOfCase(draftId) : null;
  return found ? `/projects/detail/${found.request.id}` : "/projects";
};
// Same, for the draft open in this project type — read it before the
// session is cleared.
export const activeDraftRequestPath = (projectType) =>
  requestPathForDraft(sessionStorage.getItem(`${projectType}_active_draft_id`));

// Marks a case as submitted for checking in its parent request store and notifies API Gateway
export const submitCaseForCheck = async (draftId, user) => {
  if (!draftId) return;
  const found = findRequestOfCase(draftId);
  let requestId = found?.request?.id;

  if (!requestId) {
    requestId =
      sessionStorage.getItem(`case_request_id_${draftId}`) ||
      sessionStorage.getItem("active_request_id");
  }

  if (!requestId) {
    try {
      requestId = await resolveRequestIdForCase(draftId);
    } catch {}
  }

  const caseItem = found?.case;
  const workType =
    caseItem?.workType === "drawing" ? "drawing" : "calculation";

  if (requestId) {
    updateRequest(requestId, (r) => {
      const existingCases = r.cases || [];
      const updatedCases = existingCases.map((c) =>
        c.id === draftId
          ? {
              ...c,
              status: "Ready for check",
              lastEdited: new Date().toISOString(),
              lastEditedBy:
                user?.fullName || user?.name || "Drafter",
            }
          : c
      );
      const hasCase = updatedCases.some((c) => c.id === draftId);
      if (!hasCase && draftId) {
        updatedCases.push({
          id: draftId,
          no: sessionStorage.getItem(`case_no_${draftId}`) || "001",
          status: "Ready for check",
          workType,
          lastEdited: new Date().toISOString(),
          lastEditedBy: user?.fullName || user?.name || "Drafter",
        });
      }
      return {
        ...r,
        status: "ready_check",
        cases: updatedCases,
      };
    });
  }

  // Also update cached lists in sessionStorage for instant UI synchronization on My Projects / Database
  try {
    ["cached_server_requests", "cached_project_database_requests"].forEach(
      (key) => {
        const cached = sessionStorage.getItem(key);
        if (cached) {
          const list = JSON.parse(cached);
          if (Array.isArray(list)) {
            const updated = list.map((req) => {
              if (req.id === requestId) {
                const cases = (req.cases || []).map((c) =>
                  c.id === draftId ? { ...c, status: "Ready for check" } : c
                );
                return { ...req, status: "ready_check", cases };
              }
              return req;
            });
            sessionStorage.setItem(key, JSON.stringify(updated));
          }
        }
      }
    );
  } catch {}

  // Asynchronously notify backend API Gateway if request exists on server
  if (requestId) {
    try {
      await markCaseReadyForCheck(requestId, workType, draftId);
    } catch (err) {
      console.debug("[submitCaseForCheck] Gateway sync error:", err?.message);
    }
  }
};

// Transitions a case from "Not started" to "In progress" upon working on it or saving draft.
export const markCaseInProgress = (draftId, user) => {
  if (!draftId) return;
  const found = findRequestOfCase(draftId);
  if (!found) return;
  const { request, case: caseItem } = found;
  if (!caseItem) return;
  const currentStatus = caseItem.status || "Not started";
  if (currentStatus === "Not started") {
    updateRequest(request.id, (r) => ({
      ...r,
      cases: (r.cases || []).map((c) =>
        c.id === draftId
          ? {
              ...c,
              status: "In progress",
              lastEdited: new Date().toISOString(),
              lastEditedBy:
                user?.fullName ||
                user?.name ||
                c.lastEditedBy ||
                "Drafter",
            }
          : c
      ),
    }));
  }
};
