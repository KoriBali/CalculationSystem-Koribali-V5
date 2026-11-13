import api from "../../../config/api";

/**
 * Service to communicate with Requests, Cases, and Checking Queue endpoints on the API Gateway
 */

// ─── PROJECTS CRUD ─────────────────────────────────────────────────────────────

export const getProjects = async (params = {}) => {
  const { data } = await api.get("/api/projects", { params });
  return data?.data || data;
};

export const getProjectById = async (projectId) => {
  const { data } = await api.get(`/api/projects/${projectId}`);
  return data?.data || data;
};

export const createProject = async (payload) => {
  const { data } = await api.post("/api/projects", payload);
  return data?.data || data;
};

// ─── REQUESTS CRUD ─────────────────────────────────────────────────────────────

export const getRequests = async (params = {}) => {
  const { data } = await api.get("/api/requests", { params });
  return data?.data || data;
};

export const getRequestById = async (requestId) => {
  const { data } = await api.get(`/api/requests/${requestId}`);
  return data?.data || data;
};

export const createRequest = async (payload) => {
  const { data } = await api.post("/api/requests", payload);
  return data?.data || data;
};

export const updateRequest = async (requestId, payload) => {
  const { data } = await api.patch(`/api/requests/${requestId}`, payload);
  return data?.data || data;
};

export const updateRequestSharedDetails = async (requestId, payload) => {
  const { data } = await api.patch(
    `/api/requests/${requestId}/shared-details`,
    payload
  );
  return data?.data || data;
};

export const updateRequestYsDetails = async (requestId, payload) => {
  const { data } = await api.patch(
    `/api/requests/${requestId}/ys-details`,
    payload
  );
  return data?.data || data;
};

export const updateRequestYpDetails = async (requestId, payload) => {
  const { data } = await api.patch(
    `/api/requests/${requestId}/yp-details`,
    payload
  );
  return data?.data || data;
};

export const updateRequestFinish = async (requestId, payload) => {
  const { data } = await api.patch(
    `/api/requests/${requestId}/finish`,
    payload
  );
  return data?.data || data;
};

const cleanPatchPayload = (obj) => {
  if (!obj || typeof obj !== "object") return null;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    // In PATCH requests, empty string or null explicitly clears the field in the backend DB.
    out[k] = v === "" ? null : v;
  }
  return Object.keys(out).length > 0 ? out : null;
};

/**
 * Updates full request data across top-level, shared-details, and brand-specific (YS/YP) endpoints
 */
export const updateFullRequest = async (
  requestId,
  {
    requestUpdate,
    sharedDetails,
    ysDetails,
    ypDetails,
    finish,
    conditions,
    coverType,
    skipDrawingConditionsUpdate = false,
  }
) => {
  const results = {};

  // 1. Update top-level request properties (requestNo, pjNo, subject, etc.)
  const cleanReq = cleanPatchPayload(requestUpdate);
  if (cleanReq && Object.keys(cleanReq).length > 0) {
    results.request = await updateRequest(requestId, cleanReq);
  }

  // 2. Update shared details (delivery date, qty, pic, drawing type, cad)
  const cleanShared = cleanPatchPayload(sharedDetails);
  if (cleanShared && Object.keys(cleanShared).length > 0) {
    try {
      results.sharedDetails = await updateRequestSharedDetails(
        requestId,
        cleanShared
      );
    } catch (sErr) {
      console.warn(
        "[updateFullRequest] Shared details update skipped/failed:",
        sErr?.response?.data || sErr?.message
      );
    }
  }

  // 3. Update brand-specific details
  if (coverType === "ys" && ysDetails) {
    const cleanYs = cleanPatchPayload(ysDetails);
    if (cleanYs && Object.keys(cleanYs).length > 0) {
      try {
        results.ysDetails = await updateRequestYsDetails(requestId, cleanYs);
      } catch (ysErr) {
        console.warn(
          "[updateFullRequest] YS details update skipped/failed:",
          ysErr?.response?.data || ysErr?.message
        );
      }
    }
  } else if (coverType === "yp" && ypDetails) {
    const cleanYp = cleanPatchPayload(ypDetails);
    if (cleanYp && Object.keys(cleanYp).length > 0) {
      try {
        results.ypDetails = await updateRequestYpDetails(requestId, cleanYp);
      } catch (ypErr) {
        console.warn(
          "[updateFullRequest] YP details update skipped/failed:",
          ypErr?.response?.data || ypErr?.message
        );
      }
    }
  }

  // 4. Update Finish (Surface Treatment & Coating)
  if (finish && typeof finish === "object") {
    const cleanFinish = cleanPatchPayload(finish);
    if (cleanFinish && Object.keys(cleanFinish).length > 0) {
      try {
        results.finish = await updateRequestFinish(requestId, cleanFinish);
      } catch (fErr) {
        console.warn(
          "[updateFullRequest] Finish update skipped/failed:",
          fErr?.response?.data || fErr?.message
        );
      }
    }
  }

  // 4. Update Calculation Conditions in the Database
  if (conditions && (conditions.designStandardId || conditions.windSpeed != null)) {
    const calcPayload = {
      ...(conditions.designStandardId ? { designStandardId: conditions.designStandardId } : {}),
      ...(conditions.windSpeed != null ? { windSpeed: Number(conditions.windSpeed) } : {}),
      airDensity: conditions.airDensity ? Number(conditions.airDensity) : 1.23,
    };
    try {
      results.conditions = await updateCalculationConditions(requestId, calcPayload);
    } catch (patchErr) {
      console.warn(
        "[updateFullRequest] Calculation conditions PATCH failed, trying POST define:",
        patchErr?.message
      );
      try {
        if (calcPayload.designStandardId) {
          results.conditions = await defineCalculationConditions(requestId, calcPayload);
        }
      } catch (postErr) {
        console.warn(
          "[updateFullRequest] Calculation conditions POST define skipped/failed:",
          postErr?.message
        );
      }
    }
  }

  // 5. Update Drawing Conditions in the Database (if drawingType is present and not skipped)
  if (!skipDrawingConditionsUpdate && sharedDetails?.drawingType) {
    try {
      results.drawingConditions = await updateDrawingConditions(requestId, {
        drawingType: sharedDetails.drawingType,
      });
    } catch (dErr) {
      console.warn(
        "[updateFullRequest] Drawing conditions update skipped/failed:",
        dErr?.message
      );
    }
  }

  return results;
};

export const deleteRequest = async (requestId) => {
  const { data } = await api.delete(`/api/requests/${requestId}`);
  return data?.data || data;
};

/**
 * Validates request number duplication across all requests (YP / YS)
 */
export const checkRequestNo = async ({ requestNo, brandMark, excludeRequestId }) => {
  const { data } = await api.get("/api/requests/request-no-check", {
    params: { requestNo, brandMark, excludeRequestId },
  });
  return data?.data || data;
};

// ─── CHECKING QUEUE ────────────────────────────────────────────────────────────

/**
 * Fetches the queue of cases awaiting checker review
 */
export const getCheckQueue = async (params = {}) => {
  const { data } = await api.get("/api/check-queue", { params });
  return data?.data || data;
};

// ─── CASES (CALCULATION & DRAWING) ─────────────────────────────────────────────

export const getAllCases = async (requestId) => {
  const { data } = await api.get(`/api/requests/${requestId}/cases`);
  return data?.data || data;
};

export const extractCaseItems = (res, defaultWorkType = "calc") => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.cases)) return res.cases;

  const calc =
    (Array.isArray(res?.calculationCases) && res.calculationCases) ||
    (Array.isArray(res?.calculation_cases) && res.calculation_cases) ||
    (Array.isArray(res?.data?.calculationCases) && res.data.calculationCases) ||
    (Array.isArray(res?.data?.calculation_cases) && res.data.calculation_cases) ||
    [];

  const draw =
    (Array.isArray(res?.drawingCases) && res.drawingCases) ||
    (Array.isArray(res?.drawing_cases) && res.drawing_cases) ||
    (Array.isArray(res?.data?.drawingCases) && res.data.drawingCases) ||
    (Array.isArray(res?.data?.drawing_cases) && res.data.drawing_cases) ||
    [];

  if (calc.length > 0 || draw.length > 0) {
    return [
      ...calc.map((c) => ({ ...c, workType: c.workType || c.work_type || "calc" })),
      ...draw.map((c) => ({ ...c, workType: c.workType || c.work_type || "drawing" })),
    ];
  }

  return [];
};

export const fetchAllProjectCases = async (requestId) => {
  try {
    const res = await getAllCases(requestId);
    const items = extractCaseItems(res);
    if (items.length > 0) return items;
  } catch (err) {
    console.debug("[fetchAllProjectCases] getAllCases fallback to separate calls:", err?.message);
  }

  try {
    const [calcRes, drawRes] = await Promise.all([
      getCalculationCases(requestId).catch(() => []),
      getDrawingCases(requestId).catch(() => []),
    ]);
    const calcItems = extractCaseItems(calcRes, "calc").map((c) => ({
      ...c,
      workType: c.workType || c.work_type || "calc",
    }));
    const drawItems = extractCaseItems(drawRes, "drawing").map((c) => ({
      ...c,
      workType: c.workType || c.work_type || "drawing",
    }));
    return [...calcItems, ...drawItems];
  } catch {
    return [];
  }
};

export const getCalculationCases = async (requestId) => {
  const { data } = await api.get(`/api/requests/${requestId}/calculation-cases`);
  return data?.data || data;
};

export const createCalculationCase = async (requestId, payload) => {
  const { data } = await api.post(`/api/requests/${requestId}/calculation-cases`, payload);
  return data?.data || data;
};

export const getCalculationCaseById = async (requestId, caseId) => {
  const { data } = await api.get(`/api/requests/${requestId}/calculation-cases/${caseId}`);
  return data?.data || data;
};

export const updateCalculationCase = async (requestId, caseId, payload) => {
  const { data } = await api.patch(`/api/requests/${requestId}/calculation-cases/${caseId}`, payload);
  return data?.data || data;
};

export const deleteCalculationCase = async (requestId, caseId) => {
  const { data } = await api.delete(`/api/requests/${requestId}/calculation-cases/${caseId}`);
  return data?.data || data;
};

export const getDrawingCases = async (requestId) => {
  const { data } = await api.get(`/api/requests/${requestId}/drawing-cases`);
  return data?.data || data;
};

export const createDrawingCase = async (requestId, payload) => {
  const { data } = await api.post(`/api/requests/${requestId}/drawing-cases`, payload);
  return data?.data || data;
};

export const getDrawingCaseById = async (requestId, caseId) => {
  const { data } = await api.get(`/api/requests/${requestId}/drawing-cases/${caseId}`);
  return data?.data || data;
};

export const updateDrawingCase = async (requestId, caseId, payload) => {
  const { data } = await api.patch(`/api/requests/${requestId}/drawing-cases/${caseId}`, payload);
  return data?.data || data;
};

export const deleteDrawingCase = async (requestId, caseId) => {
  const { data } = await api.delete(`/api/requests/${requestId}/drawing-cases/${caseId}`);
  return data?.data || data;
};

// ─── CASE WORKFLOW ACTIONS ─────────────────────────────────────────────────────

export const markCaseReadyForCheck = async (requestId, workType, caseId) => {
  const normWorkType =
    workType === "drawing" ? "drawing" : "calculation";
  const caseType =
    normWorkType === "drawing" ? "drawing-cases" : "calculation-cases";

  const candidates = [
    // 1. Direct case endpoint: POST /api/requests/{id}/cases/{workType}/{caseId}/ready-for-check
    {
      method: "post",
      url: `/api/requests/${requestId}/cases/${normWorkType}/${caseId}/ready-for-check`,
    },
    // 2. Specific resource endpoint: POST /api/requests/{id}/calculation-cases/{caseId}/ready-for-check
    {
      method: "post",
      url: `/api/requests/${requestId}/${caseType}/${caseId}/ready-for-check`,
    },
    // 3. Flat case endpoint: POST /api/requests/{id}/cases/{caseId}/ready-for-check
    {
      method: "post",
      url: `/api/requests/${requestId}/cases/${caseId}/ready-for-check`,
    },
    // 4. Update case status via PATCH
    {
      method: "patch",
      url: `/api/requests/${requestId}/${caseType}/${caseId}`,
      data: { status: "ready_for_check" },
    },
    {
      method: "patch",
      url: `/api/requests/${requestId}/${caseType}/${caseId}`,
      data: { status: "ready_check" },
    },
  ];

  let resultData = null;
  let success = false;

  for (const c of candidates) {
    try {
      if (c.method === "post") {
        const { data } = await api.post(c.url, c.data || {});
        resultData = data?.data || data;
        success = true;
        break;
      } else if (c.method === "patch") {
        const { data } = await api.patch(c.url, c.data || {});
        resultData = data?.data || data;
        success = true;
        break;
      }
    } catch (err) {
      // If 404 or 405 (endpoint variation), continue to try next candidate
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        continue;
      }
      // If server returned 400 with detail, attempt next format
      continue;
    }
  }

  // Also transition parent request status to ready_check if applicable
  try {
    await api.patch(`/api/requests/${requestId}`, {
      status: "ready_check",
    });
  } catch {}

  return resultData || { success: true };
};

export const checkCase = async (requestId, workType, caseId, { checkResult, note }) => {
  const { data } = await api.post(
    `/api/requests/${requestId}/cases/${workType}/${caseId}/check`,
    { checkResult, note }
  );
  return data?.data || data;
};

export const transferCaseOwnership = async (requestId, workType, caseId, newOwnerUserId) => {
  const { data } = await api.post(
    `/api/requests/${requestId}/cases/${workType}/${caseId}/transfer-ownership`,
    { newOwnerUserId }
  );
  return data?.data || data;
};

// ─── CALCULATION CONDITIONS ───────────────────────────────────────────────────

/**
 * Define Calculation Conditions for a request (POST /api/requests/{request_id}/calculation-conditions)
 * Payload: { designStandardId: string, windSpeed: number | null, airDensity: number }
 */
export const defineCalculationConditions = async (requestId, payload) => {
  const { data } = await api.post(
    `/api/requests/${requestId}/calculation-conditions`,
    payload
  );
  return data?.data || data;
};

/**
 * Update Calculation Conditions for a request (PATCH /api/requests/{request_id}/calculation-conditions)
 * Payload: { designStandardId?: string | null, windSpeed?: number | null, airDensity?: number | null }
 */
export const updateCalculationConditions = async (requestId, payload) => {
  const { data } = await api.patch(
    `/api/requests/${requestId}/calculation-conditions`,
    payload
  );
  return data?.data || data;
};

// ─── DRAWING CONDITIONS ───────────────────────────────────────────────────────

/**
 * Define Drawing Conditions for a request (POST /api/requests/{request_id}/drawing-conditions)
 * Payload: { regionId: string, drawingType: 'approval' | 'manufacturer' | 'order' | 'meeting' }
 */
export const defineDrawingConditions = async (requestId, payload) => {
  const { data } = await api.post(
    `/api/requests/${requestId}/drawing-conditions`,
    payload
  );
  return data?.data || data;
};

/**
 * Update Drawing Conditions for a request (PATCH /api/requests/{request_id}/drawing-conditions)
 * Payload: { regionId?: string | null, drawingType?: string | null }
 */
export const updateDrawingConditions = async (requestId, payload) => {
  const { data } = await api.patch(
    `/api/requests/${requestId}/drawing-conditions`,
    payload
  );
  return data?.data || data;
};

// ─── MASTER DATA ──────────────────────────────────────────────────────────────

export const getMasterRegions = async () => {
  const { data } = await api.get("/api/master/regions");
  const items = Array.isArray(data) ? data : data?.data || data?.items || [];
  try {
    sessionStorage.setItem("masterRegions", JSON.stringify({ data: items, cachedAt: Date.now() }));
  } catch { }
  return items;
};

export const getMasterDesignStandards = async () => {
  const { data } = await api.get("/api/master/design-standards");
  const items = Array.isArray(data) ? data : data?.data || data?.items || [];
  try {
    sessionStorage.setItem("masterDesignStandards", JSON.stringify({ data: items, cachedAt: Date.now() }));
  } catch { }
  return items;
};

export const getMasterPoleCategories = async () => {
  const { data } = await api.get("/api/master/pole-categories");
  const items = Array.isArray(data) ? data : data?.data || data?.items || [];
  try {
    sessionStorage.setItem("masterPoleCategories", JSON.stringify({ data: items, cachedAt: Date.now() }));
  } catch { }
  return items;
};

// ─── REQUEST ASSIGNMENTS ──────────────────────────────────────────────────────

export const getRequestAssignments = async (requestId) => {
  const { data } = await api.get(`/api/requests/${requestId}/assignments`);
  return data?.data || data;
};

export const addRequestAssignment = async (requestId, payload) => {
  const { data } = await api.post(`/api/requests/${requestId}/assignments`, payload);
  return data?.data || data;
};

export const releaseRequestAssignment = async (requestId, assignmentId) => {
  const { data } = await api.post(`/api/requests/${requestId}/assignments/${assignmentId}/release`);
  return data?.data || data;
};

// ─── CALCULATION RUNS & SIMULATION (BAB 5.5 - 5.7) ────────────────────────────

/**
 * Execute calculation simulation without saving run (POST CASE_PATH/calculate)
 * Body: { poleStandardHeightId: string, directObjects: [...] }
 * Response: { status: 'ok' | 'ng', display: { status, displayDirection, positions } }
 */
export const calculateCase = async (requestId, caseId, payload) => {
  const { data } = await api.post(
    `/api/requests/${requestId}/calculation-cases/${caseId}/calculate`,
    payload
  );
  return data?.data || data;
};

/**
 * Execute standalone pole calculation for Project Tools (POST /api/project-tools/calculation/pole/calculate)
 * Body: { conditions: PoleToolConditions, input: PoleToolInput }
 */
export const calculateProjectToolsPole = async (payload) => {
  const { data } = await api.post(
    "/api/project-tools/calculation/pole/calculate",
    payload
  );
  return data?.data || data;
};

/**
 * Preview standalone pole report for Project Tools (POST /api/project-tools/calculation/pole/report)
 */
export const previewProjectToolsReport = async (payload) => {
  const { data } = await api.post(
    "/api/project-tools/calculation/pole/report",
    payload
  );
  return data?.data || data;
};

/**
 * Save inputs and record official calculation run (POST CASE_PATH/runs)
 * Response:
 * - 201: { case, run: { id, status, display, ... }, runNotCreated: null }
 * - 200: { case, run: null, runNotCreated: { reason, message } }
 */
export const createCaseRun = async (requestId, caseId, payload) => {
  const { data } = await api.post(
    `/api/requests/${requestId}/calculation-cases/${caseId}/runs`,
    payload
  );
  return data?.data || data;
};

/**
 * Get list of runs for a calculation case (GET CASE_PATH/runs)
 */
export const getCaseRuns = async (requestId, caseId) => {
  const { data } = await api.get(
    `/api/requests/${requestId}/calculation-cases/${caseId}/runs`
  );
  return data?.data || data;
};

/**
 * Get single run detail with snapshots (GET CASE_PATH/runs/{runId})
 */
export const getCaseRun = async (requestId, caseId, runId) => {
  const { data } = await api.get(
    `/api/requests/${requestId}/calculation-cases/${caseId}/runs/${runId}`
  );
  return data?.data || data;
};

/**
 * Get full Calculation Report payload for a run (GET CASE_PATH/runs/{runId}/report)
 * Response: CalculationReport (template: 'old_jil', geometry, sections, foundation, overall)
 */
export const getCaseRunReport = async (requestId, caseId, runId) => {
  const { data } = await api.get(
    `/api/requests/${requestId}/calculation-cases/${caseId}/runs/${runId}/report`
  );
  return data?.data || data;
};

// ─── CALCULATION DRAFT & CASE REPORT ──────────────────────────────────────────

/**
 * Get saved calculation draft for a case from database (GET CASE_PATH/calculation-draft)
 */
export const getCalculationDraft = async (requestId, caseId) => {
  const { data } = await api.get(
    `/api/requests/${requestId}/calculation-cases/${caseId}/calculation-draft`
  );
  const root = data?.data || data;
  if (!root || typeof root !== "object") return root;

  const innerPayload =
    root.draftData && typeof root.draftData === "object"
      ? root.draftData
      : root.payload && typeof root.payload === "object"
        ? root.payload
        : null;

  const innerInput =
    root.input && typeof root.input === "object" ? root.input : null;

  return {
    ...root,
    ...(innerInput || {}),
    ...(innerPayload || {}),
  };
};

/**
 * Save calculation draft for a case to database (PUT CASE_PATH/calculation-draft)
 */
export const saveCalculationDraft = async (requestId, caseId, payload) => {
  const { data } = await api.put(
    `/api/requests/${requestId}/calculation-cases/${caseId}/calculation-draft`,
    payload
  );
  return data?.data || data;
};

/**
 * Delete calculation draft for a case from database (DELETE CASE_PATH/calculation-draft)
 */
export const deleteCalculationDraft = async (requestId, caseId) => {
  const { data } = await api.delete(
    `/api/requests/${requestId}/calculation-cases/${caseId}/calculation-draft`
  );
  return data?.data || data;
};

/**
 * Get calculation report directly for a case (GET CASE_PATH/report)
 */
export const getCaseReport = async (requestId, caseId) => {
  const { data } = await api.get(
    `/api/requests/${requestId}/calculation-cases/${caseId}/report`
  );
  return data?.data || data;
};

// ─── MASTER POLE STANDARDS & GEOMETRY (BAB 5.5) ───────────────────────────────

/**
 * Load master pole standards with pole heights (GET /api/master/pole-standards)
 */
export const getMasterPoleStandards = async (category = "lighting", type = "taper") => {
  const { data } = await api.get("/api/master/pole-standards", {
    params: { category, type },
  });
  const items = Array.isArray(data) ? data : data?.data || data?.items || [];
  return items;
};

/**
 * Load master geometry specs for a pole height (GET /api/master/pole-standard-heights/{heightId}/geometry)
 * Response: PoleGeometry { stepPoles, directObjects, groundPosition, glElevationM, height, isCalculable }
 */
export const getMasterPoleStandardHeightGeometry = async (heightId) => {
  const { data } = await api.get(
    `/api/master/pole-standard-heights/${heightId}/geometry`
  );
  return data?.data || data;
};

// ─── REPORT HEADER (COVER INFORMATION) ───────────────────────────────────────

/**
 * Normalizes report header response into frontend cover object
 */
export const normalizeReportHeaderResponse = (data) => {
  if (!data) return null;
  const d = data.data || data;
  return {
    reportNumber:
      d.reportNumber || d.report_number || d.calculationNumber || d.calculation_number || "",
    calculationNumber:
      d.calculationNumber || d.calculation_number || d.reportNumber || d.report_number || "",
    title1: d.title1 || d.title_1 || d.projectName || d.project_name || "",
    projectName: d.projectName || d.project_name || d.title1 || d.title_1 || "",
    title2:
      d.title2 !== undefined
        ? d.title2
        : d.title_2 !== undefined
          ? d.title_2
          : d.coverTopText || d.cover_top_text || "",
    coverTopText:
      d.coverTopText !== undefined
        ? d.coverTopText
        : d.cover_top_text !== undefined
          ? d.cover_top_text
          : d.title2 || d.title_2 || "",
    title3:
      d.title3 !== undefined
        ? d.title3
        : d.title_3 !== undefined
          ? d.title_3
          : d.coverBottomText || d.cover_bottom_text || "",
    coverBottomText:
      d.coverBottomText !== undefined
        ? d.coverBottomText
        : d.cover_bottom_text !== undefined
          ? d.cover_bottom_text
          : d.title3 || d.title_3 || "",
    region: d.region || d.regionCode || d.region_code || "",
    author: d.author || d.authorCode || d.author_code || "",
    responsibleDepartment:
      d.responsibleDepartment ||
      d.responsible_department ||
      d.department ||
      d.departmentCode ||
      d.department_code ||
      "",
    date: d.date || d.reportDate || d.report_date || "",
    managementCode: d.managementCode || d.management_code || "",
  };
};

/**
 * Builds payload for saving report header to backend API
 * Sends both camelCase and snake_case properties to ensure backend schema compatibility
 */
export const buildReportHeaderPayload = (cover) => {
  if (!cover) return {};
  const calcNum = cover.calculationNumber || cover.reportNumber || "";
  const projName = cover.projectName || cover.title1 || "";
  const topText =
    cover.coverTopText !== undefined ? cover.coverTopText : cover.title2 || "";
  const bottomText =
    cover.coverBottomText !== undefined ? cover.coverBottomText : cover.title3 || "";
  const region = cover.region || "";
  const author = cover.author || "";
  const dept = cover.responsibleDepartment || "";
  const date = cover.date || "";
  const mgmtCode =
    cover.managementCode || [region, author, dept].filter(Boolean).join(" - ");

  return {
    calculationNumber: calcNum,
    calculation_number: calcNum,
    reportNumber: calcNum,
    report_number: calcNum,
    projectName: projName,
    project_name: projName,
    title1: projName,
    title_1: projName,
    title2: topText,
    title_2: topText,
    coverTopText: topText,
    cover_top_text: topText,
    title3: bottomText,
    title_3: bottomText,
    coverBottomText: bottomText,
    cover_bottom_text: bottomText,
    region,
    region_code: region,
    author,
    author_code: author,
    responsibleDepartment: dept,
    responsible_department: dept,
    department: dept,
    date,
    reportDate: date,
    report_date: date,
    managementCode: mgmtCode,
    management_code: mgmtCode,
  };
};

/**
 * Retrieve report header from backend with resilient candidate paths
 */
export const getReportHeader = async (requestId, caseId) => {
  const candidates = [];
  if (requestId && caseId) {
    candidates.push(`/api/requests/${requestId}/calculation-cases/${caseId}/report-header`);
  }
  if (caseId) {
    candidates.push(`/api/calculation-cases/${caseId}/report-header`);
  }
  if (requestId) {
    candidates.push(`/api/requests/${requestId}/report-header`);
  }
  if (requestId && caseId) {
    candidates.push(`/api/requests/${requestId}/calculation-cases/${caseId}/report-headers`);
  }
  if (requestId) {
    candidates.push(`/api/requests/${requestId}/report-headers`);
  }

  for (const url of candidates) {
    try {
      const { data } = await api.get(url);
      if (data) return data?.data || data;
    } catch (err) {
      if (err?.response?.status === 404) continue;
      continue;
    }
  }
  return null;
};

/**
 * Save report header to backend with resilient candidate paths and HTTP methods (PUT/POST/PATCH)
 */
export const saveReportHeader = async (requestId, caseId, payload) => {
  const candidateUrls = [];
  if (requestId && caseId) {
    candidateUrls.push(`/api/requests/${requestId}/calculation-cases/${caseId}/report-header`);
  }
  if (caseId) {
    candidateUrls.push(`/api/calculation-cases/${caseId}/report-header`);
  }
  if (requestId) {
    candidateUrls.push(`/api/requests/${requestId}/report-header`);
  }
  if (requestId && caseId) {
    candidateUrls.push(`/api/requests/${requestId}/calculation-cases/${caseId}/report-headers`);
  }
  if (requestId) {
    candidateUrls.push(`/api/requests/${requestId}/report-headers`);
  }

  for (const url of candidateUrls) {
    for (const method of ["put", "post", "patch"]) {
      try {
        const { data } = await api[method](url, payload);
        if (data) return data?.data || data;
      } catch (err) {
        if (err?.response?.status === 405) continue;
        if (err?.response?.status === 404) break;
      }
    }
  }
  return null;
};
