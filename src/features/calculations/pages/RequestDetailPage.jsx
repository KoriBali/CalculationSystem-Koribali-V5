// Request Detail — where a request lands after the New Request form, and
// where its work is organised: the request at a glance, who works on it,
// its cases (each opens a calculation or drawing draft) and its files.
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { ArrowLeft, SearchX, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import InitialAssignment from "../components/requests/InitialAssignment";
import { RequestCases } from "../components/requests/detail/RequestCases";
import { RequestFiles } from "../components/requests/detail/RequestFiles";
import { RequestSummary } from "../components/requests/detail/RequestSummary";
import { DesignConditionsSection } from "../components/requests/detail/DesignConditionsSection";
import { DrawingConditionsSection } from "../components/requests/detail/DrawingConditionsSection";
import { ToastModal } from "../components/modals/ToastModal";
import { ActionLoadingModal } from "../components/modals/ActionLoadingModal";
import {
  SectionCard,
  SectionTitle,
} from "../components/requests/form/FormPrimitives";
import { projectTypeLabel } from "../constants/projectTypes";
import {
  COVER_TYPE_OPTIONS,
  REQUEST_TYPE_OPTIONS,
} from "../constants/requestFormOptions";
import { REQUEST_HEADLINE, requestNoOf } from "../constants/requestSummary";
import {
  fileRecord,
  forgetFileBlob,
  mapItemStatusToCaseStatus,
  saveRequest,
} from "../data/requestStore";
import { useRequestRecord } from "../hooks/useRequestRecord";
import { createCase, nextCaseNo } from "../utils/requestCases";
import {
  deleteCalculationCase,
  deleteDrawingCase,
  getRequestById,
  defineCalculationConditions,
  updateCalculationConditions,
  defineDrawingConditions,
  updateDrawingConditions,
  createCalculationCase,
  createDrawingCase,
  updateCalculationCase,
  updateDrawingCase,
  fetchAllProjectCases,
  extractCaseItems,
  addRequestAssignment,
  releaseRequestAssignment,
  getRequestAssignments,
  getCalculationDraft,
  transferCaseOwnership,
} from "../services/requestService";
import { getUsers, getAssignableUsers } from "../../admin/services/userService";
import { deserializeWorkingSession } from "../utils/coreLogic";
import { getUser, isGuestUser } from "../../../utils/auth";
import {
  resolveDesignStandardId,
  resolveDesignStandardCode,
  resolveDesignStandardLabel,
  resolveRegionId,
  resolveRegionCode,
  canonicalDrawingType,
  mapDrawingType,
  isUuid,
} from "../utils/requestPayloadMapper";
import {
  getMasterDesignStandards,
  getMasterRegions,
} from "../services/masterDataService";
import {
  STANDARD_OPENING_TYPE,
  STANDARD_BOX_TYPE,
  STANDARD_BASEPLATE_TYPE,
  STANDARD_FOUR_RIB_TYPE,
} from "../constants/standardPoleDefaults";

const getAssigneeUserId = (a) =>
  a?.assigneeUserId ||
  a?.assignee_user_id ||
  a?.assignee?.id ||
  a?.user?.id ||
  a?.userId ||
  a?.user_id ||
  a?.assigneeId ||
  a?.assignee_id;

const getAssignmentId = (a) =>
  a?.id ||
  a?.assignmentId ||
  a?.assignment_id ||
  a?._id;

const isAssignmentActive = (a) => {
  if (!a) return false;
  if (
    a.isReleased === true ||
    a.is_released === true ||
    a.released === true
  ) {
    return false;
  }
  if (
    a.releasedAt != null ||
    a.released_at != null ||
    a.released_date != null
  ) {
    return false;
  }
  const st = String(
    a.status ||
      a.assignment_status ||
      a.assignmentStatus ||
      a.state ||
      "",
  ).toLowerCase();
  if (
    st === "released" ||
    st === "inactive" ||
    st === "cancelled" ||
    st === "revoked" ||
    st === "closed" ||
    st === "removed" ||
    st === "deleted"
  ) {
    return false;
  }
  if (
    a.isActive === false ||
    a.is_active === false ||
    a.active === false
  ) {
    return false;
  }
  return true;
};

const BACK_BUTTON =
  "self-start flex shrink-0 items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap text-white px-3 py-2 sm:px-4 rounded-lg hp:rounded-md text-xs sm:text-sm font-medium border border-white/20 hover:bg-white/10 active:bg-white/15 transition";

const labelOf = (options, value, key = "value") =>
  options.find((o) => o[key] === value)?.label;

function Chip({ children }) {
  return (
    <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-white/10 ring-1 ring-inset ring-white/15 text-[11px] sm:text-xs font-medium text-white/90">
      {children}
    </span>
  );
}

function NotFound({ onBack }) {
  return (
    <div className="w-full max-w-[1440px] mx-auto px-2 py-16 flex flex-col items-center text-center">
      <div className="p-3 rounded-xl bg-white border border-slate-200 text-slate-400">
        <SearchX className="w-6 h-6" />
      </div>
      <p className="mt-4 text-base font-semibold text-slate-800">
        Request not found
      </p>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        The requested project could not be found or you may not have permission
        to view it.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-5 h-9 px-4 rounded-lg text-sm font-medium bg-[#0d3b66] text-white hover:bg-[#0b3157]"
      >
        Back to My Projects
      </button>
    </div>
  );
}

function DetailLoadingSkeleton({ onBack }) {
  return (
    <div className="flex flex-col h-full min-h-screen relative bg-slate-50">
      <Helmet>
        <title>Loading Project... - KORI BALI</title>
      </Helmet>

      <div className="flex-1 rounded-t-2xl hp:rounded-t-xl bg-gray-50">
        {/* ── Top Header Skeleton: Gradient blue card matching page header ── */}
        <div className="w-full max-w-[1440px] mx-auto px-2">
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#0d3b66] via-[#114674] to-[#1a5a92] shadow-sm px-3 py-3.5 sm:px-4 sm:py-4 md:px-6 2xl:px-8 flex flex-col gap-4">
            {/* Top row: Back button & Status badge */}
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={onBack} className={BACK_BUTTON}>
                <ArrowLeft className="w-4 h-4 shrink-0" />
                Back to My Projects
              </button>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-[13px] font-medium shadow-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-300" />
                <span className="tracking-wide">
                  Loading project details...
                </span>
              </div>
            </div>

            {/* Request Number & Title placeholders */}
            <div className="min-w-0">
              <div className="h-3 w-24 bg-white/25 rounded-md animate-pulse" />
              <div className="mt-1.5 h-6 sm:h-7 lg:h-8 w-56 sm:w-80 bg-white/35 rounded-lg animate-pulse" />
              <div className="mt-2 h-4 w-72 max-w-full bg-white/20 rounded-md animate-pulse" />

              {/* Chips row */}
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="h-6 w-20 bg-white/20 rounded-full animate-pulse" />
                <div className="h-6 w-32 bg-white/20 rounded-full animate-pulse" />
                <div className="h-6 w-24 bg-white/20 rounded-full animate-pulse" />
                <div className="h-6 w-20 bg-white/20 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Content Skeletons: matching exact container and spacing ── */}
        <div className="w-full max-w-[1440px] mx-auto pt-6 pb-24 sm:pb-8 px-2 space-y-4 md:space-y-6">
          {/* Section: Request Summary Skeleton */}
          <div>
            <div className="mb-4 flex items-center gap-2 animate-pulse">
              <div className="w-1 h-4 md:h-5 bg-slate-300 rounded-full" />
              <div className="h-4 w-32 md:w-36 bg-slate-200 rounded" />
            </div>
            <div className="bg-white px-4 md:px-5 py-5 rounded-xl hp:rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={`sum-skel-${idx}`}
                    className="px-3.5 py-2.5 rounded-lg border border-gray-200/80 bg-gray-50/70 flex flex-col justify-between h-[70px] animate-pulse"
                  >
                    <div className="h-3 w-20 bg-slate-200/80 rounded" />
                    <div
                      className="h-4 bg-slate-300/80 rounded"
                      style={{ width: `${55 + (idx % 4) * 12}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Design Conditions Skeleton */}
          <div>
            <div className="mb-4 flex items-center gap-2 animate-pulse">
              <div className="w-1 h-4 md:h-5 bg-slate-300 rounded-full" />
              <div className="h-4 w-56 sm:w-72 bg-slate-200 rounded" />
            </div>
            <div className="bg-white px-4 md:px-5 py-5 rounded-xl hp:rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                {[80, 120, 105].map((labelWidth, idx) => (
                  <div
                    key={`cond-skel-${idx}`}
                    className="space-y-2 animate-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="h-3 bg-slate-200 rounded"
                        style={{ width: `${labelWidth}px` }}
                      />
                    </div>
                    <div className="h-10 w-full bg-slate-50 border border-slate-200 rounded-lg flex items-center px-3">
                      <div className="h-3.5 bg-slate-200 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Cases Table Skeleton */}
          <div>
            <div className="mb-4 flex items-center gap-2 animate-pulse">
              <div className="w-1 h-4 md:h-5 bg-slate-300 rounded-full" />
              <div className="h-4 w-48 sm:w-56 bg-slate-200 rounded" />
            </div>
            <div className="bg-white rounded-xl hp:rounded-lg border border-gray-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
                <div className="h-9 w-52 sm:w-64 bg-slate-100 rounded-lg border border-slate-200/70 animate-pulse" />
                <div className="h-9 w-32 bg-slate-200/90 rounded-lg animate-pulse" />
              </div>
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={`case-skel-${idx}`}
                    className="p-4 flex items-center justify-between gap-4 animate-pulse"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 shrink-0 flex items-center justify-center">
                        <div className="w-4 h-4 rounded bg-slate-200" />
                      </div>
                      <div className="space-y-1.5 flex-1 max-w-sm">
                        <div className="h-4 w-3/4 bg-slate-200/90 rounded" />
                        <div className="h-3 w-1/2 bg-slate-100 rounded" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="h-6 w-20 rounded-full bg-slate-100" />
                      <div className="h-8 w-24 rounded-lg bg-slate-200/80" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const cleanCoverStandard = (val) => {
  if (!val) return "";
  if (isUuid(val)) {
    const label = resolveDesignStandardLabel(val);
    if (label && label !== "—" && !isUuid(label)) return label;
    return "";
  }
  const s = String(val).trim().toLowerCase();
  if (
    s === "new_jil" ||
    s === "old_lighting_pole" ||
    s === "old_lighting" ||
    s === "lighting_pole" ||
    s === "old_jil" ||
    s === "haiden" ||
    s === "v60" ||
    s === "act" ||
    s === "tower" ||
    s === "signboard"
  ) {
    const label = resolveDesignStandardLabel(val);
    if (label && label !== "—" && !isUuid(label)) return label;
    return "";
  }
  return String(val).trim();
};

const normalizeServerCase = (
  c,
  index,
  defaultWorkType = "calc",
  userMap = null,
  currentUser = null,
) => {
  const rawWorkType =
    c.workType || c.work_type || (c.drawingType ? "drawing" : defaultWorkType);
  const workType = rawWorkType === "drawing" ? "drawing" : "calc";
  const caseNo =
    c.caseNo || c.case_no || c.no || String(index + 1).padStart(3, "0");
  const caseLabel = c.caseLabel || c.case_label || `Case ${caseNo}`;
  const title = c.title || caseLabel;
  const poleKind = c.poleKind || c.pole_kind || "standard";

  const ownerUserId =
    c.ownerUserId || c.owner_user_id || c.assigneeUserId || c.assignee_user_id;
  const creatorUserId =
    c.created_by_user_id || c.creator_user_id || c.createdByUserId;

  const currentUserName =
    currentUser?.fullName || currentUser?.name || currentUser?.username || "";
  const currentUserId = currentUser?.id ? String(currentUser.id) : "";

  const resolvedOwner =
    c.ownerName ||
    c.owner?.fullName ||
    c.owner?.name ||
    (ownerUserId && userMap?.get(String(ownerUserId))) ||
    (ownerUserId && currentUserId && String(ownerUserId) === currentUserId
      ? currentUserName
      : null) ||
    c.assignedTo ||
    c.owner ||
    "Unassigned";

  const resolvedCreatedBy =
    c.createdByName ||
    c.creator?.fullName ||
    c.creator?.name ||
    (creatorUserId && userMap?.get(String(creatorUserId))) ||
    (creatorUserId && currentUserId && String(creatorUserId) === currentUserId
      ? currentUserName
      : null) ||
    c.createdBy ||
    (resolvedOwner !== "Unassigned" ? resolvedOwner : "Unassigned");

  return {
    id: c.id,
    no: caseNo,
    caseLabel,
    case_label: caseLabel,
    title,
    poleKind,
    drawingType:
      c.drawingType ||
      c.drawing_type ||
      (workType === "drawing" ? "Approval" : ""),
    workType,
    owner: resolvedOwner,
    ownerUserId: ownerUserId ? String(ownerUserId) : null,
    createdBy: resolvedCreatedBy,
    checkedBy:
      c.checkedByName ||
      c.checker?.fullName ||
      c.checker?.name ||
      c.checkedBy ||
      null,
    status: mapItemStatusToCaseStatus(c.status || c.state, index),
    hasReport: Boolean(
      c.hasReport ||
      c.has_report ||
      c.reportSnapshot ||
      c.report_snapshot ||
      (Array.isArray(c.runs) && c.runs.length > 0) ||
      c.runCount > 0 ||
      c.run_count > 0 ||
      c.latestRunId ||
      c.latest_run_id
    ),
    draftData: c.draftData || c.draft_data || c.payload || null,
    reportSnapshot: c.reportSnapshot || c.report_snapshot || null,
    createdAt: c.createdAt || c.created_at || new Date().toISOString(),
    lastEdited: c.updatedAt || c.updated_at || null,
  };
};

const resolveWorkTypes = (data = {}, existing = null) => {
  // Prioritize explicit workTypes if specified
  if (
    data?.workTypes &&
    (data.workTypes.calc !== undefined || data.workTypes.drawing !== undefined)
  ) {
    return {
      calc: Boolean(data.workTypes.calc),
      drawing: Boolean(data.workTypes.drawing),
    };
  }

  const dt = (
    data?.designType ||
    data?.design_type ||
    data?.workType ||
    data?.work_type ||
    ""
  ).toLowerCase();

  if (
    dt === "drawing_calculation" ||
    dt === "calculation_drawing" ||
    dt === "calc_drawing" ||
    dt === "both"
  ) {
    return { calc: true, drawing: true };
  }
  if (dt === "drawing") {
    return { calc: false, drawing: true };
  }
  if (dt === "calculation" || dt === "calc") {
    return { calc: true, drawing: false };
  }

  if (
    existing?.workTypes &&
    (existing.workTypes.calc !== undefined ||
      existing.workTypes.drawing !== undefined)
  ) {
    return {
      calc: Boolean(existing.workTypes.calc),
      drawing: Boolean(existing.workTypes.drawing),
    };
  }

  if (
    existing &&
    (existing.calc !== undefined || existing.drawing !== undefined)
  ) {
    return {
      calc: Boolean(existing.calc),
      drawing: Boolean(existing.drawing),
    };
  }

  return { calc: true, drawing: false };
};

function SyncBadge({ label = "Syncing..." }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="inline-flex items-center gap-1.5 ml-2.5 px-2.5 py-0.5 rounded-full text-[11px] font-normal text-slate-500 bg-slate-100 border border-slate-200"
    >
      <Loader2 className="w-3 h-3 animate-spin text-[#3399cc]" />
      <span>{label}</span>
    </motion.span>
  );
}

export default function RequestDetailPage() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const [request, update] = useRequestRecord(requestId);
  const [loading, setLoading] = useState(!request);
  const [isSyncing, setIsSyncing] = useState(
    () => Boolean(isUuid(requestId) && !isGuestUser())
  );
  const [isLoadingCases, setIsLoadingCases] = useState(
    () => Boolean(isUuid(requestId) && !isGuestUser())
  );
  const [openingCase, setOpeningCase] = useState(null);
  const [toastModal, setToastModal] = useState(null);
  const [isEditingConditions, setIsEditingConditions] = useState(false);
  const designConditionsRef = useRef(null);
  const [isEditingDrawingConditions, setIsEditingDrawingConditions] =
    useState(false);
  const drawingConditionsRef = useRef(null);
  const isAddingCaseRef = useRef(false);
  const [assignableWorkers, setAssignableWorkers] = useState([]);
  const [designStandards, setDesignStandards] = useState([]);
  const [regionsList, setRegionsList] = useState([]);

  useEffect(() => {
    let isMounted = true;
    setIsSyncing(Boolean(isUuid(requestId) && !isGuestUser()));
    setIsLoadingCases(Boolean(isUuid(requestId) && !isGuestUser()));

    // Load master data, users, and request details in parallel simultaneously (no waterfall delay)
    Promise.all([
      getMasterDesignStandards().catch(() => []),
      getMasterRegions().catch(() => []),
      getUsers().catch(() => []),
      getAssignableUsers().catch(() => []),
      !isGuestUser() && isUuid(requestId)
        ? getRequestById(requestId).catch((err) => {
            console.warn(
              "[RequestDetailPage] getRequestById fallback:",
              err,
            );
            return null;
          })
        : Promise.resolve(null),
      !isGuestUser() && isUuid(requestId)
        ? fetchAllProjectCases(requestId).catch(() => [])
        : Promise.resolve([]),
      !isGuestUser() && isUuid(requestId)
        ? getRequestAssignments(requestId).catch(() => null)
        : Promise.resolve(null),
    ]).then(async ([standards, regions, usersRes, assignableRes, serverData, serverCases, serverAssignments]) => {
      if (!isMounted) return;

      const realStandards = Array.isArray(standards)
        ? standards
        : standards?.data || [];
      const realRegions = Array.isArray(regions)
        ? regions
        : regions?.data || [];
      setDesignStandards(realStandards);
      setRegionsList(realRegions);

      const userMap = new Map();
      const currentUser = getUser() || {};
      if (currentUser?.id) {
        userMap.set(
          String(currentUser.id),
          currentUser.fullName || currentUser.name || currentUser.username,
        );
      }

      // Add users from getUsers() (superadmin/admin) AND getAssignableUsers() (all department members like Andi & Rina)
      const rawAssignable = Array.isArray(assignableRes)
        ? assignableRes
        : assignableRes?.items || assignableRes?.data || [];
      const rawUsers = Array.isArray(usersRes)
        ? usersRes
        : usersRes?.items || usersRes?.data || [];
      const allUsers = [...rawUsers, ...rawAssignable];

      allUsers.forEach((u) => {
        if (u?.id) {
          const name = u.fullName || u.name || u.username;
          if (name) {
            userMap.set(String(u.id), name);
          }
        }
      });

      // Also add users found in serverAssignments to userMap
      const assignmentList = Array.isArray(serverAssignments)
        ? serverAssignments
        : serverAssignments?.items || serverAssignments?.data || [];
      assignmentList.forEach((a) => {
        const uId = a.assigneeUserId || a.assignee?.id || a.user?.id;
        const name = a.assignee?.fullName || a.assignee?.name || a.name;
        if (uId && name) {
          userMap.set(String(uId), name);
        }
      });

      // Prepare assignable workers list from backend GET /api/assignable-users
      const sourceWorkers = rawAssignable.length > 0 ? rawAssignable : allUsers;
      const formattedWorkers = sourceWorkers
        .filter((u) => u && u.id)
        .map((u) => ({
          id: String(u.id),
          name: u.fullName || u.name || u.username,
          department:
            u.department?.name ||
            u.departmentName ||
            u.department ||
            "Engineering Dept.",
          role: u.role || "",
        }))
        .filter((w) => {
          const n = (w.name || "").toLowerCase();
          return !n.includes("rifa") && !n.includes("bintarjo") && !n.includes("agus");
        });

      if (isMounted) {
        setAssignableWorkers(formattedWorkers);
      }

      if (serverData && isMounted) {
        try {
            const brand = (
              serverData.brandMark ||
              serverData.brand ||
              serverData.brandLine ||
              ""
            ).toLowerCase();
            const coverType = brand === "yp" ? "yp" : "ys";
            const projectType =
              serverData.projectType ||
              (serverData.poleCategory?.name
                ? serverData.poleCategory.name.includes("acemast") ||
                  serverData.poleCategory.name.includes("disaster")
                  ? "disaster-prevention-project"
                  : serverData.poleCategory.name.includes("sign")
                    ? "signboard-project"
                    : serverData.poleCategory.name.includes("multi")
                      ? "multi-purpose-project"
                      : "lighting-project"
                : null) ||
              request?.projectType ||
              "lighting-project";

            const serverCalcCond =
              serverData.calculationConditions ||
              serverData.calculation_conditions ||
              null;
            const serverDrawingCond =
              serverData.drawingConditions ||
              serverData.drawing_conditions ||
              null;

            const rawStandard =
              serverCalcCond?.designStandardId ||
              serverCalcCond?.standard ||
              "";
            const resolvedStandard =
              resolveDesignStandardCode(rawStandard, standards) || "";

            const rawDrawingType = serverDrawingCond?.drawingType || "";
            const resolvedDrawingType =
              canonicalDrawingType(rawDrawingType) || "";

            const rawRegion =
              serverDrawingCond?.regionId || serverDrawingCond?.region || "";
            const resolvedRegion = resolveRegionCode(rawRegion, regions) || "";

            const sharedDetails =
              serverData.sharedDetails || serverData.shared_details || {};
            const ysDetails =
              serverData.ysDetails || serverData.ys_details || {};
            const ypDetails =
              serverData.ypDetails || serverData.yp_details || {};

            const createdByUserId =
              serverData.created_by_user_id ||
              serverData.createdByUserId ||
              serverData.created_by ||
              serverData.creator?.id ||
              null;

            const isCreatedByCurrentUser = Boolean(
              createdByUserId &&
              currentUser?.id &&
              String(createdByUserId) === String(currentUser.id),
            );

            const createdByName =
              serverData.createdByName ||
              serverData.creator?.fullName ||
              serverData.creator?.name ||
              (createdByUserId && userMap.get(String(createdByUserId))) ||
              request?.createdByName ||
              request?.createdBy ||
              (isCreatedByCurrentUser
                ? currentUser?.fullName ||
                  currentUser?.name ||
                  currentUser?.username
                : "") ||
              "";

            const picName =
              sharedDetails.requesterPicName ||
              serverData.requesterPicName ||
              serverData.picName ||
              "";

            const companyName =
              serverData.requestingDepartmentName ||
              serverData.companyName ||
              "";

            const serverCaseList = [
              ...extractCaseItems(serverCases),
              ...extractCaseItems(serverData?.cases),
              ...extractCaseItems(serverData?.calculationCases),
              ...extractCaseItems(serverData?.calculation_cases),
              ...extractCaseItems(serverData?.drawingCases),
              ...extractCaseItems(serverData?.drawing_cases),
            ];

            const seenCaseKeys = new Set();
            const dedupedCases = [];
            for (const c of serverCaseList) {
              const k = c.id || c.caseNo || c.case_no || c.no;
              if (k && !seenCaseKeys.has(k)) {
                seenCaseKeys.add(k);
                dedupedCases.push(c);
              }
            }

            const normalizedCases = dedupedCases.map((c, idx) =>
              normalizeServerCase(c, idx, "calc", userMap, currentUser),
            );

            const cleanCreatedByName =
              createdByName === "Bintarjo Agus Priyadi" ||
              createdByName === "Muhammad Rifa Alfadli"
                ? currentUser.fullName || currentUser.name || "Drafter"
                : createdByName;

            const creatorMember = {
              id:
                createdByUserId ||
                (isCreatedByCurrentUser ? currentUser.id : "u-creator"),
              name:
                cleanCreatedByName ||
                (isCreatedByCurrentUser
                  ? currentUser.fullName || currentUser.name || "You"
                  : "Unknown"),
              department:
                serverData.requestingDepartmentName || "Lighting Dept.",
              isCreator: true,
            };

            // Real assigned members: from serverAssignments / serverData.assignments (if any) or user-assigned in r?.members
            // Note: picName is the requester/client contact person (担当), NOT a project worker.
            const rawAssignments = Array.isArray(serverAssignments)
              ? serverAssignments
              : Array.isArray(serverAssignments?.items)
                ? serverAssignments.items
                : Array.isArray(serverAssignments?.data)
                  ? serverAssignments.data
                  : Array.isArray(serverData?.assignments)
                    ? serverData.assignments
                    : Array.isArray(serverData?.assignments?.items)
                      ? serverData.assignments.items
                      : serverAssignments !== null && typeof serverAssignments === "object"
                        ? []
                        : null;

            const assignedMembers = (rawAssignments || [])
              .filter((a) => {
                if (!isAssignmentActive(a)) return false;
                const uId = getAssigneeUserId(a);
                return uId && String(uId) !== String(creatorMember.id);
              })
              .map((a) => {
                const uId = String(getAssigneeUserId(a) || a.id);
                const aId = getAssignmentId(a);
                return {
                  id: uId,
                  assignmentId: aId,
                  name:
                    userMap.get(uId) ||
                    a.assignee?.fullName ||
                    a.assignee?.name ||
                    a.name ||
                    "Assigned Member",
                  department:
                    a.department ||
                    a.assignee?.department?.name ||
                    "Engineering Dept.",
                  isCreator: false,
                };
              });

            const members = [creatorMember, ...assignedMembers];

            update((r) => {
              const workTypes = resolveWorkTypes(serverData, r?.workTypes || r);
              const merged = {
                ...(r || {}),
                ...serverData,
                id: serverData.id,
                requestNo: serverData.requestNo,
                pjNo: serverData.pjNo,
                subject: serverData.subject,
                coverType,
                projectType,
                workTypes,
                members:
                  rawAssignments !== null
                    ? members
                    : (r?.members || []).filter(
                        (m) =>
                          m.isCreator ||
                          (!String(m.id).startsWith("u-") &&
                            m.name !== "Assigned Member"),
                      ).length > 0
                      ? (r?.members || []).filter(
                          (m) =>
                            m.isCreator ||
                            (!String(m.id).startsWith("u-") &&
                              m.name !== "Assigned Member"),
                        )
                      : members,
                companyName,
                createdByName,
                createdBy: createdByName,
                created_by_user_id: createdByUserId,
                picName,
                requesterPicName: picName,
                note: serverData.notes || serverData.note || r?.note || "",
                cases:
                  normalizedCases.length > 0 ? normalizedCases : r?.cases || [],
                fields: {
                  ...(r?.fields || {}),
                  ...(serverData.fields || {}),
                  // Top-level request identifiers
                  projectNo:
                    serverData.pjNo || serverData.fields?.projectNo || r?.fields?.projectNo || "",
                  projectName:
                    serverData.subject ||
                    serverData.fields?.projectName ||
                    sharedDetails.subject ||
                    r?.fields?.projectName ||
                    "",
                  subject:
                    serverData.subject || serverData.fields?.subject || r?.fields?.subject || "",
                  requestNo:
                    serverData.requestNo || serverData.fields?.requestNo || r?.fields?.requestNo || "",
                  documentNo:
                    serverData.requestNo || serverData.fields?.documentNo || r?.fields?.documentNo || "",
                  companyName:
                    companyName || serverData.fields?.companyName || r?.fields?.companyName || "",
                  department:
                    companyName || serverData.fields?.department || r?.fields?.department || "",
                  classification:
                    serverData.requestClassification ||
                    serverData.request_classification ||
                    sharedDetails.classification ||
                    ysDetails.classification ||
                    serverData.fields?.classification ||
                    r?.fields?.classification ||
                    "new",
                  requestClassification:
                    serverData.requestClassification ||
                    serverData.request_classification ||
                    serverData.fields?.requestClassification ||
                    r?.fields?.requestClassification ||
                    "new",
                  requestDate:
                    serverData.requestDate ||
                    serverData.request_date ||
                    sharedDetails.requestDate ||
                    serverData.fields?.requestDate ||
                    r?.fields?.requestDate ||
                    "",
                  requestedDate:
                    serverData.dueDate ||
                    serverData.due_date ||
                    ysDetails.requestedDate ||
                    serverData.fields?.requestedDate ||
                    r?.fields?.requestedDate ||
                    "",
                  dueDate:
                    serverData.dueDate ||
                    serverData.due_date ||
                    ysDetails.requestedDate ||
                    serverData.fields?.dueDate ||
                    r?.fields?.dueDate ||
                    "",
                  requestType:
                    serverData.requestType ||
                    serverData.request_type ||
                    ysDetails.requestType ||
                    sharedDetails.requestType ||
                    serverData.fields?.requestType ||
                    r?.fields?.requestType ||
                    "general",
                  designType:
                    serverData.designType ||
                    serverData.design_type ||
                    serverData.fields?.designType ||
                    r?.fields?.designType ||
                    "calculation",

                  // Shared details
                  pic: picName || sharedDetails.requesterPicName || serverData.fields?.pic || "",
                  deliveryDate:
                    sharedDetails.scheduledDeliveryDate ||
                    serverData.fields?.deliveryDate ||
                    "",
                  deliveryQty:
                    sharedDetails.deliveryQuantity != null
                      ? String(sharedDetails.deliveryQuantity)
                      : (serverData.fields?.deliveryQty != null
                        ? String(serverData.fields.deliveryQty)
                        : ""),
                  paperSize:
                    sharedDetails.paperSize ||
                    serverData.fields?.paperSize ||
                    "",
                  cadFormat:
                    sharedDetails.cadFormat ||
                    serverData.fields?.cadFormat ||
                    "",
                  deliverCad:
                    sharedDetails.isCadDataRequested ??
                    serverData.fields?.deliverCad ??
                    false,

                  // Cover conditions: strictly from cover fields, never from calculation conditions table
                  standard:
                    cleanCoverStandard(ysDetails.designStandardText || ysDetails.design_standard_text) ||
                    cleanCoverStandard(ypDetails.designStandardText || ypDetails.design_standard_text) ||
                    cleanCoverStandard(serverData.fields?.standard) ||
                    "",
                  windSpeed:
                    (ysDetails.windSpeedText != null && ysDetails.windSpeedText !== "")
                      ? String(ysDetails.windSpeedText)
                      : (ysDetails.wind_speed_text != null && ysDetails.wind_speed_text !== "")
                        ? String(ysDetails.wind_speed_text)
                        : (ypDetails.windSpeedText != null && ypDetails.windSpeedText !== "")
                          ? String(ypDetails.windSpeedText)
                          : (ypDetails.wind_speed_text != null && ypDetails.wind_speed_text !== "")
                            ? String(ypDetails.wind_speed_text)
                            : (serverData.fields?.windSpeed != null && serverData.fields?.windSpeed !== "")
                              ? String(serverData.fields.windSpeed)
                              : "",
                  drawingType:
                    canonicalDrawingType(sharedDetails.drawingType || sharedDetails.drawing_type) ||
                    canonicalDrawingType(serverData.fields?.drawingType) ||
                    "",

                  // YS specific details
                  ...(coverType === "ys"
                    ? {
                        ...ysDetails,
                        receptionNo:
                          ysDetails.receiptNo ||
                          serverData.fields?.receptionNo ||
                          "",
                        foundation:
                          ysDetails.foundationType ||
                          serverData.fields?.foundation ||
                          "",
                        foundationWidth:
                          ysDetails.foundationWidthX != null
                            ? String(ysDetails.foundationWidthX)
                            : serverData.fields?.foundationWidth ||
                              "",
                        foundationLength:
                          ysDetails.foundationWidthY != null
                            ? String(ysDetails.foundationWidthY)
                            : serverData.fields?.foundationLength ||
                              "",
                        foundationDepth:
                          ysDetails.embedmentDepth != null
                            ? String(ysDetails.embedmentDepth)
                            : serverData.fields?.foundationDepth ||
                              "",
                        openingHeight:
                          ysDetails.openingHeight ||
                          serverData.fields?.openingHeight ||
                          "",
                        openingDirection:
                          ysDetails.openingDirectionNote ||
                          serverData.fields?.openingDirection ||
                          "",
                        concreteStrength:
                          ysDetails.concreteStrength ||
                          serverData.fields?.concreteStrength ||
                          "",
                        material:
                          ysDetails.materialText ||
                          serverData.fields?.material ||
                          "",
                        surfaceTreatment:
                          serverData.finish?.platingSpec ||
                          serverData.finish?.plating_spec ||
                          serverData.finish?.surfaceTreatment ||
                          serverData.finish?.surface_treatment ||
                          serverData.fields?.surfaceTreatment ||
                          r?.fields?.surfaceTreatment ||
                          "",
                        coatingType:
                          serverData.finish?.colorName ||
                          serverData.finish?.color_name ||
                          serverData.finish?.coatingType ||
                          serverData.finish?.coating_type ||
                          serverData.fields?.coatingType ||
                          r?.fields?.coatingType ||
                          "",
                      }
                    : {
                        ...ypDetails,
                        surfaceTreatment:
                          serverData.finish?.platingSpec ||
                          serverData.finish?.plating_spec ||
                          serverData.finish?.surfaceTreatment ||
                          serverData.finish?.surface_treatment ||
                          serverData.fields?.surfaceTreatment ||
                          r?.fields?.surfaceTreatment ||
                          "",
                        coatingType:
                          serverData.finish?.colorName ||
                          serverData.finish?.color_name ||
                          serverData.finish?.coatingType ||
                          serverData.finish?.coating_type ||
                          serverData.fields?.coatingType ||
                          r?.fields?.coatingType ||
                          "",
                        tailCode:
                          ypDetails.tailCode ||
                          serverData.fields?.tailCode ||
                          r?.fields?.tailCode ||
                          "",
                        calcStrength:
                          ypDetails.calcStrength ??
                          serverData.fields?.calcStrength ??
                          false,
                        calcDesign:
                          ypDetails.calcDesign ??
                          serverData.fields?.calcDesign ??
                          false,
                        scopeMain:
                          ypDetails.scopeMainMember ??
                          serverData.fields?.scopeMain ??
                          false,
                        scopeJoint:
                          ypDetails.scopeJoint ??
                          serverData.fields?.scopeJoint ??
                          false,
                        scopeFoundation:
                          ypDetails.scopeFoundation ??
                          serverData.fields?.scopeFoundation ??
                          false,
                        scopeOther:
                          ypDetails.scopeOther ||
                          serverData.fields?.scopeOther ||
                          "",
                        scopeOtherOn: Boolean(
                          ypDetails.scopeOther ||
                          serverData.fields?.scopeOther
                        ),
                        draftTracing:
                          ypDetails.draftingTracing ??
                          serverData.fields?.draftTracing ??
                          false,
                        draftDesign:
                          ypDetails.draftingDesign ??
                          serverData.fields?.draftDesign ??
                          false,
                        submitTo1:
                          ypDetails.submissionDestination1 ||
                          serverData.fields?.submitTo1 ||
                          "",
                        submitTo2:
                          ypDetails.submissionDestination2 ||
                          serverData.fields?.submitTo2 ||
                          "",
                        submitTo3:
                          ypDetails.submissionDestination3 ||
                          serverData.fields?.submitTo3 ||
                          "",
                        hasCompetitor:
                          ypDetails.hasCompetitor != null
                            ? ypDetails.hasCompetitor
                              ? "yes"
                              : "no"
                            : serverData.fields?.hasCompetitor ||
                              "no",
                        designOrigin:
                          ypDetails.designOrigin ||
                          serverData.fields?.designOrigin ||
                          "",
                        scheduleFlex:
                          ypDetails.scheduleFlexibility ||
                          serverData.fields?.scheduleFlex ||
                          "",
                        paperFrame:
                          ypDetails.paperFrame ||
                          serverData.fields?.paperFrame ||
                          "",
                        finishedCopies:
                          ypDetails.finishedCopies != null
                            ? String(ypDetails.finishedCopies)
                            : serverData.fields?.finishedCopies ||
                              "",
                        platingProviso:
                          ypDetails.platingProviso ||
                          serverData.fields?.platingProviso ||
                          "",
                      }),
                },
                designConditions: (serverCalcCond && (serverCalcCond.designStandardId || serverCalcCond.standard || serverCalcCond.windSpeed != null || serverCalcCond.wind_speed != null))
                  ? {
                      standard:
                        resolvedStandard || r?.designConditions?.standard || "",
                      windSpeed:
                        serverCalcCond.windSpeed != null
                          ? String(serverCalcCond.windSpeed)
                          : serverCalcCond.wind_speed != null
                            ? String(serverCalcCond.wind_speed)
                            : r?.designConditions?.windSpeed ||
                              "",
                      airDensity:
                        serverCalcCond.airDensity != null
                          ? String(serverCalcCond.airDensity)
                          : serverCalcCond.air_density != null
                            ? String(serverCalcCond.air_density)
                            : r?.designConditions?.airDensity || "1.23",
                      isSaved: true,
                      isSavedOnServer: true,
                    }
                  : r?.designConditions?.isSaved
                    ? r.designConditions
                    : {
                        standard: r?.designConditions?.standard || "",
                        windSpeed: r?.designConditions?.windSpeed || r?.fields?.windSpeed || "",
                        airDensity: r?.designConditions?.airDensity || "",
                        isSaved: false,
                      },
                drawingConditions: (serverDrawingCond && (serverDrawingCond.drawingType || serverDrawingCond.drawing_type || serverDrawingCond.regionId || serverDrawingCond.region))
                  ? {
                      drawingType:
                        resolvedDrawingType ||
                        r?.drawingConditions?.drawingType ||
                        "",
                      region:
                        resolvedRegion || r?.drawingConditions?.region || "",
                      isSaved: true,
                      isSavedOnServer: true,
                    }
                  : r?.drawingConditions?.isSaved
                    ? r.drawingConditions
                    : {
                        drawingType: r?.drawingConditions?.drawingType || r?.fields?.drawingType || "",
                        region: r?.drawingConditions?.region || resolvedRegion || "",
                        isSaved: false,
                      },
                finish:
                  serverData.finish ||
                  serverData.finish_details ||
                  serverData.finishDetails ||
                  r?.finish ||
                  null,
              };
              saveRequest(merged);
              return merged;
            });
          } catch (err) {
            console.warn("[RequestDetailPage] Error fetching data:", err);
          }
        }

      if (isMounted) {
        setLoading(false);
        setIsLoadingCases(false);
        setIsSyncing(false);
      }
    }).catch(() => {
      if (isMounted) {
        setLoading(false);
        setIsLoadingCases(false);
        setIsSyncing(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [requestId]);

  const showToast = () => {};

  const handleBeforeAddCase = (targetWorkType) => {
    // Permission check: only creator or assigned member can add cases
    const creatorMem = (request?.members || []).find((m) => m.isCreator);
    const crId =
      creatorMem?.id ||
      request?.created_by_user_id ||
      request?.created_by ||
      request?.createdByUserId;
    const crName =
      creatorMem?.name ||
      request?.createdBy ||
      request?.createdByName ||
      request?.fields?.createdBy ||
      "";
    const cUser = getUser() || {};
    const curUId = cUser.id ? String(cUser.id) : "";
    const curUName = (
      cUser.name ||
      cUser.fullName ||
      cUser.username ||
      ""
    ).toLowerCase();
    const curUUsername = (cUser.username || "").toLowerCase();

    const isCr = Boolean(
      (crId && curUId && String(crId) === curUId) ||
      (crName && curUName && crName.toLowerCase() === curUName) ||
      (crName && curUUsername && crName.toLowerCase() === curUUsername) ||
      (crName &&
        curUName &&
        crName !== "Unknown" &&
        crName.toLowerCase().includes(curUName)),
    );

    const isAssigned = (request?.members || []).some((m) => {
      const mId = m.id ? String(m.id) : "";
      const mUserId = m.userId ? String(m.userId) : "";
      const mName = (m.name || "").toLowerCase();
      const mUsername = (m.username || "").toLowerCase();
      return (
        (curUId && mId && mId === curUId) ||
        (curUId && mUserId && mUserId === curUId) ||
        (curUName && mName && mName === curUName) ||
        (curUUsername && mName && mName === curUUsername) ||
        (curUUsername && mUsername && mUsername === curUUsername)
      );
    });

    if (!isCr && !isAssigned) {
      setToastModal({
        title: "Action Not Permitted",
        message:
          "Only the request creator and assigned team members can add cases to this project.",
        type: "danger",
      });
      return false;
    }

    if (targetWorkType === "drawing") {
      const isDrawingUnsaved =
        !request?.drawingConditions?.isSaved ||
        isEditingDrawingConditions ||
        drawingConditionsRef.current?.isEditing;

      if (isDrawingUnsaved) {
        const msg =
          (drawingConditionsRef.current &&
            drawingConditionsRef.current.triggerValidation()?.firstMsg) ||
          "Please save Design Conditions for Drawing Cases first before adding drawing cases.";
        setToastModal({
          title: "Drawing Conditions Required",
          message: msg,
          type: "warning",
        });
        const section = document.getElementById("drawing-conditions-section");
        if (section) {
          section.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return false;
      }
    } else {
      const isUnsaved =
        !request?.designConditions?.isSaved ||
        isEditingConditions ||
        designConditionsRef.current?.isEditing;

      if (isUnsaved) {
        const msg =
          (designConditionsRef.current &&
            designConditionsRef.current.triggerValidation()?.firstMsg) ||
          "Please save Design Conditions for Calculation Cases first before adding calculation cases.";
        setToastModal({
          title: "Design Conditions Required",
          message: msg,
          type: "warning",
        });
        const section = document.getElementById("design-conditions-section");
        if (section) {
          section.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return false;
      }
    }
    return true;
  };

  if (loading && !request) {
    return <DetailLoadingSkeleton onBack={() => navigate("/projects")} />;
  }

  if (!request) return <NotFound onBack={() => navigate("/projects")} />;

  const headline = REQUEST_HEADLINE[request.coverType];
  const currentUser = getUser() || {};
  const currentUserName =
    currentUser.name || currentUser.fullName || currentUser.username || "";
  const currentUserId = currentUser.id ? String(currentUser.id) : "";
  const me =
    currentUserName ||
    currentUser?.fullName ||
    currentUser?.name ||
    "Drafter";
  const userRole = (currentUser.role || "").toLowerCase();

  // Admin Department check (admin, superadmin, admin_department, admin_departement)
  const isAdminDepartment =
    userRole === "admin" ||
    userRole === "superadmin" ||
    userRole === "admin_department" ||
    userRole === "admin_departement";

  // Creator check: user who created the project
  const creatorMember = (request.members || []).find((m) => m.isCreator);
  const creatorId =
    creatorMember?.id ||
    request.created_by_user_id ||
    request.created_by ||
    request.createdByUserId ||
    request.creator?.id ||
    request.creatorId;
  const creatorName =
    creatorMember?.name ||
    request.createdBy ||
    request.createdByName ||
    request.creator?.fullName ||
    request.creator?.name ||
    request.fields?.createdBy ||
    "";

  const isCreator = Boolean(
    (creatorId && currentUserId && String(creatorId) === currentUserId) ||
    (creatorName &&
      currentUserName &&
      creatorName.toLowerCase() === currentUserName.toLowerCase()) ||
    (creatorName &&
      currentUser.username &&
      creatorName.toLowerCase() === currentUser.username.toLowerCase()) ||
    (creatorName &&
      creatorName.toLowerCase() !== "unknown" &&
      (creatorName.toLowerCase().includes(currentUserName.toLowerCase()) ||
        currentUserName.toLowerCase().includes(creatorName.toLowerCase()))),
  );

  // Only project creator or department admin can edit the project
  const canEditProject = isCreator || isAdminDepartment;

  // Member check: user assigned to the project members list
  const isAssignedMember =
    Boolean(currentUserName || currentUserId) &&
    (request.members || []).some((m) => {
      const mId = m.id ? String(m.id) : "";
      const mUserId = m.userId ? String(m.userId) : "";
      const mName = (m.name || "").toLowerCase();
      const mUsername = (m.username || "").toLowerCase();
      const uName = (currentUserName || "").toLowerCase();
      const uUsername = (currentUser.username || "").toLowerCase();
      const uFullName = (currentUser.fullName || "").toLowerCase();

      return (
        (currentUserId && mId && mId === currentUserId) ||
        (currentUserId && mUserId && mUserId === currentUserId) ||
        (uName && mName && mName === uName) ||
        (uUsername && mName && mName === uUsername) ||
        (uFullName && mName && mName === uFullName) ||
        (uUsername && mUsername && mUsername === uUsername)
      );
    });

  // Can contribute: creator, admin department, or assigned member
  const canContribute = isCreator || isAdminDepartment || isAssignedMember;

  // Can add case: ONLY creator or assigned member (admin department CANNOT add case unless assigned)
  const canAddCase = isCreator || isAssignedMember;

  // Add Case handler
  const handleAddCase = async (workType, details = {}) => {
    if (isAddingCaseRef.current) {
      console.warn(
        "[handleAddCase] Prevented duplicate execution while already adding a case",
      );
      return null;
    }
    if (!canAddCase) {
      setToastModal({
        title: "Action Not Permitted",
        message:
          "Only the request creator and assigned team members can add cases to this project.",
        type: "danger",
      });
      return null;
    }
    isAddingCaseRef.current = true;
    try {
      const isServerReq = !isGuestUser() && isUuid(requestId);
      const nextNo = nextCaseNo(request?.cases || []);
      const titleVal = details.title || `Case ${nextNo}`;
      const poleKindVal = (details.poleKind || "standard").toLowerCase();

      let serverCase = null;
      if (isServerReq) {
        try {
          if (workType === "drawing") {
            const payload = {
              poleKind: poleKindVal,
              title: titleVal,
              caseLabel: details.caseLabel || titleVal,
              drawingType:
                mapDrawingType(
                  details.drawingType ||
                    request?.drawingConditions?.drawingType,
                ) || "approval",
            };
            serverCase = await createDrawingCase(requestId, payload);
          } else {
            const payload = {
              poleKind: poleKindVal,
              title: titleVal,
              caseLabel: details.caseLabel || titleVal,
            };
            serverCase = await createCalculationCase(requestId, payload);
          }
        } catch (err) {
          console.warn(
            "[handleAddCase] Failed to create case on server, falling back to local:",
            err?.message,
          );
        }
      }

      let createdId = serverCase?.id || null;
      update((r) => {
        const newCase = createCase(r, workType, {
          ...details,
          id: serverCase?.id || undefined,
          no: serverCase?.caseNo || serverCase?.case_no || nextNo,
          caseLabel:
            serverCase?.caseLabel ||
            serverCase?.case_label ||
            details.caseLabel ||
            titleVal,
          owner: details.owner || me,
          createdBy: me,
        });
        createdId = newCase.id;
        return {
          ...r,
          cases: [...(r.cases || []), newCase],
        };
      });
      return createdId;
    } finally {
      isAddingCaseRef.current = false;
    }
  };

  // Helper to ensure changing between standard and custom starts with completely fresh/empty inputs
  const resetDraftForPoleKindSwitch = (draftObj, newPoleKind, projectType) => {
    if (!draftObj) return;
    const isCustom = newPoleKind === "custom";

    // Common keys to clear when switching pole types
    delete draftObj.results;
    delete draftObj.reportSnapshot;
    delete draftObj.hasReport;
    delete draftObj.calculatedOp;
    delete draftObj.calculatedBaseplate;
    delete draftObj.calculatedFoundation;
    delete draftObj.directObjects;
    delete draftObj.overheadWires;
    delete draftObj.arms;
    delete draftObj.armObjects;
    sessionStorage.removeItem(`${projectType}_standardTaperPoleKey`);

    const curCond = draftObj.condition ? JSON.parse(draftObj.condition) : {};
    curCond.poleType = newPoleKind;

    if (isCustom) {
      // Switched from standard to custom: wipe all standard specifications
      delete draftObj.poleStandard;
      delete draftObj.taperPoleStandard;
      delete draftObj.straightPoleStandard;
      delete draftObj.openingType;
      delete draftObj.boxType;
      delete draftObj.baseplateType;
      delete draftObj.fourRibType;
      curCond.openingEnabled = false;
      curCond.baseplateEnabled = false;
      curCond.foundationEnabled = false;
    } else {
      // Switched from custom to standard: wipe all custom pole specifications and re-init standard templates
      delete draftObj.poles;
      delete draftObj.poleConfig;
      curCond.openingEnabled = true;
      curCond.baseplateEnabled = true;
      curCond.foundationEnabled = false;
      draftObj.openingType = JSON.stringify(STANDARD_OPENING_TYPE);
      draftObj.boxType = JSON.stringify(STANDARD_BOX_TYPE);
      draftObj.baseplateType = JSON.stringify(STANDARD_BASEPLATE_TYPE);
      draftObj.fourRibType = JSON.stringify(STANDARD_FOUR_RIB_TYPE);
    }

    if (draftObj.drawing_general) {
      try {
        const dg = JSON.parse(draftObj.drawing_general);
        dg.poleType = isCustom ? "Custom Pole" : "Standard Pole";
        dg.additionalComponents = {
          opening: !isCustom,
          baseplate: !isCustom,
          foundation: false,
        };
        draftObj.drawing_general = JSON.stringify(dg);
      } catch {}
    }

    draftObj.condition = JSON.stringify(curCond);
    draftObj.calculation_config = JSON.stringify({
      pole: true,
      opening: !!curCond.openingEnabled,
      baseplate: !!curCond.baseplateEnabled,
      foundation: !!curCond.foundationEnabled,
    });
  };

  // Update Case handler
  const handleUpdateCase = async (caseId, updates) => {
    const existingCase = (request.cases || []).find((c) => c.id === caseId);
    const poleKindChanged = Boolean(
      updates.poleKind &&
      existingCase &&
      existingCase.poleKind !== updates.poleKind,
    );

    update((r) => ({
      ...r,
      cases: (r.cases || []).map((c) =>
        c.id === caseId
          ? {
              ...c,
              ...updates,
              lastEdited: updates.lastEdited || new Date().toISOString(),
              lastEditedBy: updates.lastEditedBy || me,
            }
          : c,
      ),
    }));

    if (!isGuestUser() && isUuid(requestId)) {
      try {
        const payload = {};
        if (updates.title) payload.title = updates.title;
        if (updates.caseLabel || updates.case_label)
          payload.caseLabel = updates.caseLabel || updates.case_label;
        if (updates.poleKind) payload.poleKind = updates.poleKind.toLowerCase();
        if (existingCase?.workType === "drawing") {
          if (updates.drawingType)
            payload.drawingType = mapDrawingType(updates.drawingType);
          await updateDrawingCase(requestId, caseId, payload);
        } else {
          await updateCalculationCase(requestId, caseId, payload);
        }
      } catch (err) {
        console.debug(
          "[handleUpdateCase] Gateway update call skipped/failed:",
          err?.message,
        );
      }
    }

    // If poleKind or title is updated, sync directly into existing draft payload in sessionStorage
    if (
      updates.poleKind ||
      updates.title ||
      updates.caseLabel ||
      updates.case_label
    ) {
      try {
        const draftKey = `${request.projectType}_draft_data_${caseId}`;
        const rawDraft = sessionStorage.getItem(draftKey);
        if (rawDraft) {
          const draftObj = JSON.parse(rawDraft);
          if (poleKindChanged) {
            resetDraftForPoleKindSwitch(
              draftObj,
              updates.poleKind,
              request.projectType,
            );
          } else if (updates.poleKind) {
            const curCond = draftObj.condition
              ? JSON.parse(draftObj.condition)
              : {};
            curCond.poleType = updates.poleKind;
            draftObj.condition = JSON.stringify(curCond);
            draftObj.calculation_config = JSON.stringify({
              pole: true,
              opening: !!curCond.openingEnabled,
              baseplate: !!curCond.baseplateEnabled,
              foundation: !!curCond.foundationEnabled,
            });
          }
          sessionStorage.setItem(draftKey, JSON.stringify(draftObj));

          // If this case is currently the active working session, also sync the active session
          const activeDraftId = sessionStorage.getItem(
            `${request.projectType}_active_draft_id`,
          );
          if (activeDraftId === caseId) {
            deserializeWorkingSession(request.projectType, draftObj);
          }
        }
      } catch (err) {
        console.error("Failed to sync case updates to draft storage:", err);
      }
    }
  };

  // Delete Case handler
  const handleDeleteCase = async (caseId) => {
    const targetCase = (request.cases || []).find((c) => c.id === caseId);

    update((r) => ({
      ...r,
      cases: (r.cases || []).filter((c) => c.id !== caseId),
    }));

    try {
      if (targetCase?.workType === "drawing") {
        await deleteDrawingCase(request.id, caseId);
      } else {
        await deleteCalculationCase(request.id, caseId);
      }
    } catch (err) {
      console.debug(
        "[handleDeleteCase] Gateway delete call skipped/failed:",
        err?.message,
      );
    }
  };

  // Transfer Case Ownership handler
  const handleTransferCase = async (caseItem, selectedMember) => {
    if (!caseItem || !selectedMember) return;
    const newOwnerId = selectedMember?.id || selectedMember?.userId;
    const newOwnerName =
      selectedMember?.name || selectedMember?.fullName || "team member";

    // Optimistic Update
    update((r) => ({
      ...r,
      cases: (r.cases || []).map((c) =>
        c.id === caseItem.id
          ? {
              ...c,
              owner: newOwnerName,
              ownerUserId: newOwnerId,
              lastEdited: new Date().toISOString(),
              lastEditedBy: currentUser?.fullName || currentUser?.name || "You",
            }
          : c,
      ),
    }));

    if (
      !isGuestUser() &&
      isUuid(requestId) &&
      isUuid(caseItem.id) &&
      isUuid(newOwnerId)
    ) {
      try {
        const apiWorkType =
          caseItem.workType === "drawing" ? "drawing" : "calculation";
        await transferCaseOwnership(
          requestId,
          apiWorkType,
          caseItem.id,
          newOwnerId,
        );
        setToastModal({
          title: "Ownership Transferred",
          message: `Case ownership transferred to ${newOwnerName} successfully.`,
          type: "success",
        });
      } catch (err) {
        console.error("[handleTransferCase] Backend transfer failed:", err);
        const errMsg =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Failed to transfer case ownership on server.";
        setToastModal({
          title: "Transfer Failed",
          message: typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg),
          type: "danger",
        });
        // Rollback / re-fetch authoritative cases from server
        try {
          const freshCases = await fetchAllProjectCases(requestId);
          const freshList = extractCaseItems(freshCases);
          if (freshList.length > 0) {
            update((r) => ({
              ...r,
              cases: freshList.map((c, idx) =>
                normalizeServerCase(c, idx, "calc", null, currentUser),
              ),
            }));
          }
        } catch (fetchErr) {
          console.warn("[handleTransferCase] Re-fetch cases failed:", fetchErr);
        }
      }
    } else {
      setToastModal({
        title: "Ownership Transferred",
        message: `Case ownership transferred to ${newOwnerName} successfully.`,
        type: "success",
      });
    }
  };

  // Open Case draft
  const handleOpenCase = async (c) => {
    if (c.workType === "drawing") {
      const isDrawingUnsaved =
        !request.drawingConditions?.isSaved ||
        isEditingDrawingConditions ||
        drawingConditionsRef.current?.isEditing;

      if (isDrawingUnsaved) {
        setToastModal({
          title: "Drawing Conditions Required",
          message:
            "Please save Design Conditions for Drawing Cases first before opening drawing cases.",
          type: "warning",
        });
        const section = document.getElementById("drawing-conditions-section");
        if (section) {
          section.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }
    } else {
      const isUnsaved =
        !request.designConditions?.isSaved ||
        isEditingConditions ||
        designConditionsRef.current?.isEditing;

      if (isUnsaved) {
        setToastModal({
          title: "Design Conditions Required",
          message:
            "Please save Design Conditions first before opening calculation cases.",
          type: "warning",
        });
        const section = document.getElementById("design-conditions-section");
        if (section) {
          section.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }
    }
    setOpeningCase(c);
    try {
      sessionStorage.setItem("projectType", request.projectType);
    const isOwner = Boolean(
      (c.owner && me && c.owner.toLowerCase() === me.toLowerCase()) ||
      (currentUser?.username &&
        c.owner &&
        c.owner.toLowerCase() === currentUser.username.toLowerCase()),
    );
    const isLockedStatus =
      c.status === "Ready for check" ||
      c.status === "ready_check" ||
      c.status === "Checked" ||
      c.status === "Ready to submit" ||
      c.status === "ready_submit" ||
      c.status === "Submitted" ||
      c.status === "submitted" ||
      c.status === "Cleared" ||
      c.status === "cleared";

    if (isOwner && !isLockedStatus) {
      sessionStorage.removeItem("case_read_only");
      if (c.status === "Not started" || !c.status) {
        handleUpdateCase(c.id, {
          status: "In progress",
          lastEdited: new Date().toISOString(),
          lastEditedBy: me,
        });
      }
    } else {
      sessionStorage.setItem("case_read_only", "true");
    }

    // Ensure draft data in sessionStorage contains designConditions and poleType
    const draftKey = `${request.projectType}_draft_data_${c.id}`;
    let rawDraft = sessionStorage.getItem(draftKey);
    let draftObj = null;
    if (rawDraft) {
      try {
        draftObj = JSON.parse(rawDraft);
      } catch {
        draftObj = null;
      }
    }

    if (!draftObj && c.workType !== "drawing") {
      try {
        const serverDraft = await getCalculationDraft(request.id, c.id);
        if (serverDraft && Object.keys(serverDraft).length > 0) {
          const payload =
            serverDraft?.draftData && typeof serverDraft.draftData === "object"
              ? { ...serverDraft, ...serverDraft.draftData }
              : serverDraft?.payload && typeof serverDraft.payload === "object"
                ? { ...serverDraft, ...serverDraft.payload }
                : serverDraft?.input && typeof serverDraft.input === "object"
                  ? { ...serverDraft, ...serverDraft.input }
                  : serverDraft?.data && typeof serverDraft.data === "object" && !Array.isArray(serverDraft.data)
                    ? { ...serverDraft, ...serverDraft.data }
                    : serverDraft;
          if (payload && Object.keys(payload).length > 0) {
            draftObj = payload;
            rawDraft = JSON.stringify(payload);
            sessionStorage.setItem(draftKey, rawDraft);
          }
        }
      } catch (err) {
        console.debug("[handleOpenCase] getCalculationDraft fallback:", err?.message);
      }
    }
    const designConditions = request.designConditions || {};
    const poleKind =
      c.poleKind ||
      c.pole_kind ||
      (request.projectType === "lighting-project" ? "standard" : "custom");
    const isStandard = poleKind === "standard";

    let activeDraft = draftObj;
    if (!draftObj) {
      const initialCondition = {
        designStandard: designConditions.standard || "jil",
        designWindSpeed: designConditions.windSpeed || "60",
        designAirDensity: designConditions.airDensity || "1.23",
        poleType: poleKind,
        openingEnabled: isStandard ? true : false,
        baseplateEnabled: isStandard ? true : false,
        foundationEnabled: false,
      };
      const initialDrawingGeneral = {
        drawingType:
          request.drawingConditions?.drawingType ||
          c.drawingType ||
          (c.workType === "drawing" ? "Approval" : ""),
        region: request.drawingConditions?.region || "east_japan",
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
      const draftPayload = {
        workflow: JSON.stringify({
          projectMode: c.workType === "drawing" ? "drawing" : "calculation",
          withReport: false,
        }),
        projectIdentity: JSON.stringify({
          projectName: request.fields?.projectName || "",
          subject: request.fields?.subject || "",
        }),
        condition: JSON.stringify(initialCondition),
        drawing_general: JSON.stringify(initialDrawingGeneral),
        drawing_coupling_location: JSON.stringify(
          request.drawingConditions?.region || "east_japan",
        ),
      };
      if (isStandard) {
        draftPayload.openingType = JSON.stringify(STANDARD_OPENING_TYPE);
        draftPayload.boxType = JSON.stringify(STANDARD_BOX_TYPE);
        draftPayload.baseplateType = JSON.stringify(STANDARD_BASEPLATE_TYPE);
        draftPayload.fourRibType = JSON.stringify(STANDARD_FOUR_RIB_TYPE);
      }
      sessionStorage.setItem(draftKey, JSON.stringify(draftPayload));
      activeDraft = draftPayload;
    } else {
      try {
        const curCond =
          draftObj.condition
            ? typeof draftObj.condition === "string"
              ? JSON.parse(draftObj.condition)
              : draftObj.condition
            : {};
        const stdCode = resolveDesignStandardCode(designConditions.standard);
        if (stdCode && !curCond.designStandard) {
          curCond.designStandard = stdCode;
        } else {
          curCond.designStandard = curCond.designStandard || "jil";
        }
        if (designConditions.windSpeed && !curCond.designWindSpeed) {
          curCond.designWindSpeed = String(designConditions.windSpeed);
        }
        if (designConditions.airDensity && !curCond.designAirDensity) {
          curCond.designAirDensity = String(designConditions.airDensity);
        }
        const prevPoleType = curCond.poleType;
        if (prevPoleType && prevPoleType !== poleKind) {
          resetDraftForPoleKindSwitch(draftObj, poleKind, request.projectType);
        } else {
          curCond.poleType = poleKind;
          if (curCond.poleType === "standard") {
            curCond.openingEnabled = true;
            curCond.baseplateEnabled = true;
            if (!draftObj.openingType) {
              draftObj.openingType = JSON.stringify(STANDARD_OPENING_TYPE);
            }
            if (!draftObj.boxType) {
              draftObj.boxType = JSON.stringify(STANDARD_BOX_TYPE);
            }
            if (!draftObj.baseplateType) {
              draftObj.baseplateType = JSON.stringify(STANDARD_BASEPLATE_TYPE);
            }
            if (!draftObj.fourRibType) {
              draftObj.fourRibType = JSON.stringify(STANDARD_FOUR_RIB_TYPE);
            }
          }
          if (draftObj.drawing_general) {
            try {
              const dg =
                typeof draftObj.drawing_general === "string"
                  ? JSON.parse(draftObj.drawing_general)
                  : draftObj.drawing_general;
              dg.poleType = isStandard ? "Standard Pole" : "Custom Pole";
              if (request.drawingConditions?.drawingType) {
                dg.drawingType = request.drawingConditions.drawingType;
              } else if (!dg.drawingType && c.drawingType) {
                dg.drawingType = c.drawingType;
              }
              if (request.drawingConditions?.region) {
                dg.region = request.drawingConditions.region;
                draftObj.drawing_coupling_location = JSON.stringify(
                  request.drawingConditions.region,
                );
              }
              draftObj.drawing_general = JSON.stringify(dg);
            } catch {}
          }
          draftObj.condition = JSON.stringify(curCond);
          draftObj.calculation_config = JSON.stringify({
            pole: true,
            opening: !!curCond.openingEnabled,
            baseplate: !!curCond.baseplateEnabled,
            foundation: !!curCond.foundationEnabled,
          });
        }

        // Cleanse incomplete reports: if calculation steps haven't all finished or cover report info is missing
        const hasPole = Boolean(draftObj.results);
        const hasOp = !curCond.openingEnabled || Boolean(draftObj.calculatedOp);
        const hasBp =
          !curCond.baseplateEnabled || Boolean(draftObj.calculatedBaseplate);
        const hasFd =
          !curCond.foundationEnabled || Boolean(draftObj.calculatedFoundation);
        let rawCover = null;
        try {
          rawCover = draftObj.cover
            ? typeof draftObj.cover === "string"
              ? JSON.parse(draftObj.cover)
              : draftObj.cover
            : null;
        } catch {
          rawCover = null;
        }
        const hasCoverInfo = Boolean(
          rawCover &&
          (rawCover.reportNumber?.trim() ||
            rawCover.calculationNumber?.trim()) &&
          rawCover.author?.trim() &&
          (rawCover.responsibleDepartment?.trim() ||
            rawCover.region?.trim() ||
            rawCover.managementCode?.trim() ||
            true)
        );

        const isAlreadyCompletedCase =
          c.status === "Ready for check" ||
          c.status === "ready_check" ||
          c.status === "Checked" ||
          c.status === "Ready to submit" ||
          c.status === "Submitted" ||
          c.status === "Cleared";

        if (!isAlreadyCompletedCase && (!hasPole || !hasOp || !hasBp || !hasFd || !hasCoverInfo)) {
          delete draftObj.reportSnapshot;
          delete draftObj.hasReport;
        }

        draftObj.condition = JSON.stringify(curCond);
        sessionStorage.setItem(draftKey, JSON.stringify(draftObj));
        activeDraft = draftObj;
      } catch {
        // ignore
      }
    }

    deserializeWorkingSession(request.projectType, activeDraft);
    sessionStorage.setItem(`${request.projectType}_active_draft_id`, c.id);
    sessionStorage.setItem(`case_request_id_${c.id}`, request.id);
    sessionStorage.setItem("active_request_id", request.id);
    sessionStorage.setItem(`case_no_${c.id}`, c.no || "");
    sessionStorage.setItem("active_case_no", c.no || "");
    const cleanPj = (
      request.pjNo ||
      request.fields?.projectNo ||
      request.projectNo ||
      ""
    ).trim();
    if (cleanPj) sessionStorage.setItem("active_request_pj_no", cleanPj);
    const cleanProjName = (
      request.fields?.projectName ||
      request.subject ||
      request.fields?.subject ||
      ""
    ).trim();
    if (cleanProjName)
      sessionStorage.setItem("active_request_project_name", cleanProjName);

    const targetPath =
      c.workType === "drawing"
        ? `/projects/${request.projectType}/${c.id}/drawing/drawing-setup`
        : `/projects/${request.projectType}/${c.id}/initial`;
    navigate(targetPath);
  } finally {
    setOpeningCase(null);
  }
};

  const handleViewCaseReport = async (c) => {
    sessionStorage.setItem("projectType", request.projectType);
    sessionStorage.setItem(`${request.projectType}_active_draft_id`, c.id);
    sessionStorage.setItem(`case_request_id_${c.id}`, request.id);
    sessionStorage.setItem("active_request_id", request.id);
    sessionStorage.setItem(`case_no_${c.id}`, c.no || "");
    sessionStorage.setItem("active_case_no", c.no || "");
    const cleanPj = (
      request.pjNo ||
      request.fields?.projectNo ||
      request.projectNo ||
      ""
    ).trim();
    if (cleanPj) sessionStorage.setItem("active_request_pj_no", cleanPj);
    const cleanProjName = (
      request.fields?.projectName ||
      request.subject ||
      request.fields?.subject ||
      ""
    ).trim();
    if (cleanProjName)
      sessionStorage.setItem("active_request_project_name", cleanProjName);
    const draftKey = `${request.projectType}_draft_data_${c.id}`;
    let rawDraft = sessionStorage.getItem(draftKey);
    let draftObj = null;
    try {
      draftObj = rawDraft ? JSON.parse(rawDraft) : null;
    } catch {
      draftObj = null;
    }

    if ((!draftObj || !draftObj.reportSnapshot) && c.workType !== "drawing") {
      try {
        const serverDraft = await getCalculationDraft(request.id, c.id);
        if (serverDraft && Object.keys(serverDraft).length > 0) {
          const payload =
            serverDraft?.draftData && typeof serverDraft.draftData === "object"
              ? { ...serverDraft, ...serverDraft.draftData }
              : serverDraft?.payload && typeof serverDraft.payload === "object"
                ? { ...serverDraft, ...serverDraft.payload }
                : serverDraft?.input && typeof serverDraft.input === "object"
                  ? { ...serverDraft, ...serverDraft.input }
                  : serverDraft?.data && typeof serverDraft.data === "object" && !Array.isArray(serverDraft.data)
                    ? { ...serverDraft, ...serverDraft.data }
                    : serverDraft;
          if (payload && Object.keys(payload).length > 0) {
            draftObj = { ...(draftObj || {}), ...payload };
            rawDraft = JSON.stringify(draftObj);
            sessionStorage.setItem(draftKey, rawDraft);
          }
        }
      } catch (err) {
        console.debug("[handleViewCaseReport] getCalculationDraft fallback:", err?.message);
      }
    }
    if (draftObj) {
      try {
        const stdCode = resolveDesignStandardCode(
          request.designConditions?.standard,
        );
        if (stdCode) {
          let curCond = {};
          try {
            curCond = draftObj.condition
              ? typeof draftObj.condition === "string"
                ? JSON.parse(draftObj.condition)
                : draftObj.condition
              : {};
          } catch {
            curCond = {};
          }
          curCond.designStandard = stdCode;
          if (request.designConditions?.windSpeed)
            curCond.designWindSpeed = request.designConditions.windSpeed;
          if (request.designConditions?.airDensity)
            curCond.designAirDensity = request.designConditions.airDensity;
          draftObj.condition = JSON.stringify(curCond);

          if (draftObj.reportSnapshot) {
            try {
              const snap =
                typeof draftObj.reportSnapshot === "string"
                  ? JSON.parse(draftObj.reportSnapshot)
                  : draftObj.reportSnapshot;
              if (snap) {
                if (!snap.condition) snap.condition = {};
                snap.condition.designStandard = stdCode;
                if (request.designConditions?.windSpeed)
                  snap.condition.designWindSpeed =
                    request.designConditions.windSpeed;
                if (request.designConditions?.airDensity)
                  snap.condition.designAirDensity =
                    request.designConditions.airDensity;
                draftObj.reportSnapshot = JSON.stringify(snap);
                sessionStorage.setItem(
                  `${request.projectType}_reportSnapshot`,
                  JSON.stringify(snap),
                );
              }
            } catch {}
          }
          sessionStorage.setItem(draftKey, JSON.stringify(draftObj));
        }

        if (draftObj.reportSnapshot) {
          sessionStorage.setItem(
            `${request.projectType}_reportSnapshot`,
            typeof draftObj.reportSnapshot === "string"
              ? draftObj.reportSnapshot
              : JSON.stringify(draftObj.reportSnapshot)
          );
          sessionStorage.setItem(`${request.projectType}_hasReport`, "true");
        }
        deserializeWorkingSession(request.projectType, draftObj);
      } catch (err) {
        console.error("Failed to deserialize draft for report:", err);
      }
    }
    navigate(`/projects/${request.projectType}/${c.id}/report`);
  };

  // Save Design Conditions handler
  const handleSaveDesignConditions = async (conditions) => {
    update((r) => {
      const stdCode = resolveDesignStandardCode(conditions.standard);
      // Synchronize all existing case drafts in this request with the new design conditions
      (r.cases || []).forEach((c) => {
        try {
          const draftKey = `${r.projectType}_draft_data_${c.id}`;
          const raw = sessionStorage.getItem(draftKey);
          if (raw) {
            const draftObj = JSON.parse(raw);
            let curCond = {};
            try {
              curCond = draftObj.condition
                ? typeof draftObj.condition === "string"
                  ? JSON.parse(draftObj.condition)
                  : draftObj.condition
                : {};
            } catch {
              curCond = {};
            }
            if (stdCode) curCond.designStandard = stdCode;
            if (conditions.windSpeed)
              curCond.designWindSpeed = conditions.windSpeed;
            if (conditions.airDensity)
              curCond.designAirDensity = conditions.airDensity;
            draftObj.condition = JSON.stringify(curCond);

            if (draftObj.reportSnapshot) {
              try {
                const snap =
                  typeof draftObj.reportSnapshot === "string"
                    ? JSON.parse(draftObj.reportSnapshot)
                    : draftObj.reportSnapshot;
                if (snap) {
                  if (!snap.condition) snap.condition = {};
                  if (stdCode) snap.condition.designStandard = stdCode;
                  if (conditions.windSpeed)
                    snap.condition.designWindSpeed = conditions.windSpeed;
                  if (conditions.airDensity)
                    snap.condition.designAirDensity = conditions.airDensity;
                  draftObj.reportSnapshot = JSON.stringify(snap);
                }
              } catch {}
            }
            sessionStorage.setItem(draftKey, JSON.stringify(draftObj));
          }
        } catch (e) {
          console.warn(
            "Failed to sync case draft with updated design conditions:",
            e,
          );
        }
      });

      // Also sync current active working session in sessionStorage if it belongs to this project
      try {
        const rawCond = sessionStorage.getItem(`${r.projectType}_condition`);
        if (rawCond) {
          const condObj = JSON.parse(rawCond);
          if (stdCode) condObj.designStandard = stdCode;
          if (conditions.windSpeed)
            condObj.designWindSpeed = conditions.windSpeed;
          if (conditions.airDensity)
            condObj.designAirDensity = conditions.airDensity;
          sessionStorage.setItem(
            `${r.projectType}_condition`,
            JSON.stringify(condObj),
          );
        }
        const rawSnap = sessionStorage.getItem(
          `${r.projectType}_reportSnapshot`,
        );
        if (rawSnap) {
          const snapObj = JSON.parse(rawSnap);
          if (!snapObj.condition) snapObj.condition = {};
          if (stdCode) snapObj.condition.designStandard = stdCode;
          if (conditions.windSpeed)
            snapObj.condition.designWindSpeed = conditions.windSpeed;
          if (conditions.airDensity)
            snapObj.condition.designAirDensity = conditions.airDensity;
          sessionStorage.setItem(
            `${r.projectType}_reportSnapshot`,
            JSON.stringify(snapObj),
          );
        }
      } catch (e) {
        console.warn(
          "Failed to sync active session storage with updated design conditions:",
          e,
        );
      }

      return {
        ...r,
        isNewProject: false,
        workTypes: resolveWorkTypes(r, r?.workTypes),
        designConditions: {
          ...conditions,
          isSaved: true,
        },
      };
    });

    if (!isGuestUser() && isUuid(requestId)) {
      try {
        let currentStandards = designStandards;
        if (!Array.isArray(currentStandards) || currentStandards.length === 0) {
          currentStandards = await getMasterDesignStandards();
          setDesignStandards(currentStandards);
        }
        const stdId = resolveDesignStandardId(
          conditions.standard,
          currentStandards,
          request?.poleCategoryId,
        );
        if (!stdId) {
          throw new Error(
            "Unable to resolve design standard ID for: " + conditions.standard,
          );
        }
        const numWind =
          conditions.windSpeed != null && String(conditions.windSpeed).trim() !== ""
            ? Number(conditions.windSpeed)
            : null;
        const validWind =
          numWind != null && !isNaN(numWind) && numWind > 0 ? numWind : null;

        const numAir =
          conditions.airDensity != null && String(conditions.airDensity).trim() !== ""
            ? Number(conditions.airDensity)
            : 1.23;
        const validAir =
          numAir != null && !isNaN(numAir) && numAir > 0 ? numAir : 1.23;

        const payload = {
          designStandardId: String(stdId).trim(),
          windSpeed: validWind,
          airDensity: validAir,
        };

        let apiSaved = false;
        const getErrText = (err) => {
          const d =
            err?.response?.data?.detail ||
            err?.response?.data?.message ||
            err?.message ||
            "";
          if (typeof d === "string") return d;
          if (Array.isArray(d))
            return d.map((x) => x?.msg || JSON.stringify(x)).join("; ");
          if (typeof d === "object") return JSON.stringify(d);
          return String(d || "");
        };

        const isNotDef = (err) => {
          const detail = getErrText(err);
          const st = err?.response?.status;
          return (
            st === 404 ||
            st === 400 ||
            /have not been defined|not defined|use POST|not found|doesn't exist/i.test(
              detail,
            )
          );
        };
        const isAlreadyDef = (err) => {
          const detail = getErrText(err);
          const st = err?.response?.status;
          return (
            st === 409 ||
            st === 400 ||
            /already defined|already exists|already created|use PATCH/i.test(
              detail,
            )
          );
        };

        if (request?.designConditions?.isSavedOnServer) {
          try {
            await updateCalculationConditions(requestId, payload);
            apiSaved = true;
          } catch (patchErr) {
            if (isNotDef(patchErr)) {
              await defineCalculationConditions(requestId, payload);
              apiSaved = true;
            } else {
              throw patchErr;
            }
          }
        }

        if (!apiSaved) {
          try {
            await defineCalculationConditions(requestId, payload);
            apiSaved = true;
          } catch (postErr) {
            if (isAlreadyDef(postErr)) {
              await updateCalculationConditions(requestId, payload);
              apiSaved = true;
            } else {
              throw postErr;
            }
          }
        }

        update((r) => ({
          ...r,
          workTypes: resolveWorkTypes(r, r?.workTypes),
          designConditions: {
            ...(r.designConditions || {}),
            ...conditions,
            isSaved: true,
            isSavedOnServer: true,
          },
        }));
      } catch (err) {
        console.error("Failed to save calculation conditions to API:", err);
        setToastModal({
          title: "Save Conditions Failed",
          message:
            err.response?.data?.detail ||
            err.message ||
            "Failed to save calculation conditions to server.",
          type: "danger",
        });
        throw err;
      }
    }
  };

  // Save Drawing Conditions handler
  const handleSaveDrawingConditions = async (conditions) => {
    update((r) => ({
      ...r,
      isNewProject: false,
      workTypes: resolveWorkTypes(r, r?.workTypes),
      drawingConditions: {
        ...conditions,
        isSaved: true,
      },
      // r.fields is intentionally NOT overwritten to preserve the original Cover Information reference
    }));

    if (!isGuestUser() && isUuid(requestId)) {
      try {
        let currentRegions = regionsList;
        if (!Array.isArray(currentRegions) || currentRegions.length === 0) {
          currentRegions = await getMasterRegions();
          setRegionsList(currentRegions);
        }
        const resolvedRegId = resolveRegionId(conditions.region, currentRegions);
        if (!resolvedRegId) {
          throw new Error("Unable to resolve region ID for: " + conditions.region);
        }
        const mappedDrawing = mapDrawingType(conditions.drawingType) || "approval";

        const payload = {
          regionId: String(resolvedRegId).trim(),
          drawingType: mappedDrawing,
        };

        let apiSaved = false;
        const getErrText = (err) => {
          const d =
            err?.response?.data?.detail ||
            err?.response?.data?.message ||
            err?.message ||
            "";
          if (typeof d === "string") return d;
          if (Array.isArray(d))
            return d.map((x) => x?.msg || JSON.stringify(x)).join("; ");
          if (typeof d === "object") return JSON.stringify(d);
          return String(d || "");
        };

        const isNotDef = (err) => {
          const detail = getErrText(err);
          const st = err?.response?.status;
          return (
            st === 404 ||
            st === 400 ||
            /have not been defined|not defined|use POST|not found|doesn't exist/i.test(
              detail,
            )
          );
        };
        const isAlreadyDef = (err) => {
          const detail = getErrText(err);
          const st = err?.response?.status;
          return (
            st === 409 ||
            st === 400 ||
            /already defined|already exists|already created|use PATCH/i.test(
              detail,
            )
          );
        };

        if (request?.drawingConditions?.isSavedOnServer) {
          try {
            await updateDrawingConditions(requestId, payload);
            apiSaved = true;
          } catch (patchErr) {
            if (isNotDef(patchErr)) {
              await defineDrawingConditions(requestId, payload);
              apiSaved = true;
            } else {
              throw patchErr;
            }
          }
        }

        if (!apiSaved) {
          try {
            await defineDrawingConditions(requestId, payload);
            apiSaved = true;
          } catch (postErr) {
            if (isAlreadyDef(postErr)) {
              await updateDrawingConditions(requestId, payload);
              apiSaved = true;
            } else {
              throw postErr;
            }
          }
        }

        update((r) => ({
          ...r,
          workTypes: resolveWorkTypes(r, r?.workTypes),
          drawingConditions: {
            ...(r.drawingConditions || {}),
            isSavedOnServer: true,
          },
        }));
      } catch (err) {
        console.error("Failed to save drawing conditions to API:", err);
        setToastModal({
          title: "Save Conditions Failed",
          message:
            err.response?.data?.detail ||
            err.message ||
            "Failed to save drawing conditions to server.",
          type: "danger",
        });
        throw err;
      }
    }
  };

  const uploadFiles = (tabKey, files, meta = {}) =>
    update((r) => ({
      ...r,
      files: {
        ...r.files,
        [tabKey]: [
          ...(r.files[tabKey] ?? []),
          ...files.map((f) => fileRecord(f, me, meta)),
        ],
      },
    }));

  const removeFile = (tabKey, file) => {
    forgetFileBlob(file.id);
    update((r) => ({
      ...r,
      files: {
        ...r.files,
        [tabKey]: r.files[tabKey].filter((f) => f.id !== file.id),
      },
    }));
  };

  const resolvedWorkTypes = resolveWorkTypes(request, request?.workTypes);
  const hasCalc = Boolean(resolvedWorkTypes.calc);
  const hasDrawing = Boolean(resolvedWorkTypes.drawing);
  const requestNo = requestNoOf(request);

  const chips = [
    request.coverType !== "yp" &&
      labelOf(COVER_TYPE_OPTIONS, request.coverType, "id"),
    projectTypeLabel(request.projectType),
    [hasCalc && "Calculation", hasDrawing && "Drawing"]
      .filter(Boolean)
      .join(" & "),
    labelOf(
      REQUEST_TYPE_OPTIONS,
      request.fields?.requestType ||
        request.requestType ||
        request.request_type,
    ),
  ].filter(Boolean);

  const handleAssignMembersChange = async (updatedMembers) => {
    const previousMembers = request?.members || [];

    // Optimistic Update: Langsung update state lokal seketika agar item muncul & beranimasi tanpa lag
    update((r) => ({ ...r, members: updatedMembers }));

    // Guest or local dummy request: langsung selesai
    if (isGuestUser() || !isUuid(requestId)) {
      showToast("Assignment updated successfully.");
      return;
    }
    const previousMemberIds = new Set(previousMembers.map((m) => String(m.id)));
    const updatedMemberIds = new Set(updatedMembers.map((m) => String(m.id)));

    const newlyAdded = updatedMembers.filter(
      (m) => !m.isCreator && !previousMemberIds.has(String(m.id)),
    );
    const removed = previousMembers.filter(
      (m) => !m.isCreator && !updatedMemberIds.has(String(m.id)),
    );

    try {
      // 1. Process Newly Added Members on Server
      for (const m of newlyAdded) {
        if (!isUuid(m.id)) {
          console.warn("[handleAssignMembersChange] Skipped non-UUID worker:", m.id);
          continue;
        }
        const wt =
          request?.workTypes?.drawing && !request?.workTypes?.calc
            ? "drawing"
            : "calculation";
        const res = await addRequestAssignment(requestId, {
          assigneeUserId: m.id,
          workType: wt,
        });
        const createdAssignmentId = getAssignmentId(res || {});
        if (createdAssignmentId) {
          m.assignmentId = createdAssignmentId;
        }
      }

      // 2. Process Removed Members on Server
      if (removed.length > 0) {
        let serverList = [];
        try {
          const raw = await getRequestAssignments(requestId);
          serverList = Array.isArray(raw) ? raw : raw?.items || raw?.data || [];
        } catch (fetchErr) {
          console.warn(
            "[handleAssignMembersChange] Failed to fetch server assignments for removal:",
            fetchErr,
          );
        }

        for (const m of removed) {
          let aId = m.assignmentId;
          // If assignmentId is missing or equals user id, find the real assignmentId from serverList
          if (!aId || String(aId) === String(m.id)) {
            const found = serverList.find((a) => {
              const uId = getAssigneeUserId(a);
              const itemId = getAssignmentId(a);
              const nameMatch =
                m.name &&
                (a.assignee?.fullName === m.name ||
                  a.assignee?.name === m.name ||
                  a.name === m.name);
              return (
                (uId && String(uId) === String(m.id)) ||
                (itemId && String(itemId) === String(m.id)) ||
                nameMatch
              );
            });
            if (found) {
              aId = getAssignmentId(found);
              m.assignmentId = aId;
            }
          }

          if (aId) {
            try {
              await releaseRequestAssignment(requestId, aId);
            } catch (relErr) {
              const st = relErr?.response?.status;
              const detail = String(
                relErr?.response?.data?.detail ||
                  relErr?.response?.data?.message ||
                  relErr?.message ||
                  "",
              );
              const isAlreadyReleased =
                st === 404 ||
                /already released|not found|does not exist|is released/i.test(
                  detail,
                );

              if (!isAlreadyReleased) {
                console.warn(
                  "[handleAssignMembersChange] Failed to release assignment on server:",
                  relErr?.response?.data || relErr?.message,
                );
                throw relErr;
              }
            }
          } else {
            console.warn(
              "[handleAssignMembersChange] Could not resolve assignmentId for member (already released or untracked):",
              m,
            );
          }
        }
      }

      // 3. Re-fetch fresh assignments directly from Backend to ensure authoritative state
      const removedUserIds = new Set(removed.map((m) => String(m.id)));
      const removedAssignmentIds = new Set(
        removed
          .map((m) => String(m.assignmentId || ""))
          .filter(Boolean),
      );

      let syncedMembers = updatedMembers;
      try {
        const freshRaw = await getRequestAssignments(requestId);
        const freshList = Array.isArray(freshRaw)
          ? freshRaw
          : freshRaw?.items || freshRaw?.data || [];

        const creator = previousMembers.find((m) => m.isCreator) || {
          id: currentUser?.id || "u-creator",
          name: currentUser?.fullName || currentUser?.name || "You",
          department: "Lighting Dept.",
          isCreator: true,
        };

        syncedMembers = [
          creator,
          ...freshList
            .filter((a) => {
              if (!isAssignmentActive(a)) return false;
              const uId = getAssigneeUserId(a);
              const aId = getAssignmentId(a);
              // Ignore creator
              if (uId && String(uId) === String(creator.id)) return false;
              // Ignore members that were explicitly removed in this call!
              if (uId && removedUserIds.has(String(uId))) return false;
              if (aId && removedAssignmentIds.has(String(aId))) return false;
              if (a.id && removedUserIds.has(String(a.id))) return false;
              return true;
            })
            .map((a) => {
              const uId = String(getAssigneeUserId(a) || a.id);
              const aId = getAssignmentId(a);
              const existing = updatedMembers.find(
                (x) => String(x.id) === uId || String(x.id) === String(aId),
              );
              return {
                id: uId,
                assignmentId: aId,
                name:
                  existing?.name ||
                  a.assignee?.fullName ||
                  a.assignee?.name ||
                  a.name ||
                  "Assigned Member",
                department:
                  existing?.department ||
                  a.department ||
                  a.assignee?.department?.name ||
                  "Engineering Dept.",
                isCreator: false,
              };
            }),
        ];
      } catch (freshErr) {
        console.warn("[handleAssignMembersChange] Re-fetch assignments failed:", freshErr);
      }

      update((r) => ({ ...r, members: syncedMembers }));
      showToast("Assignment updated successfully.");
    } catch (err) {
      console.error("[handleAssignMembersChange] Assignment operation failed:", err);
      // Rollback to previous members if backend rejects the assignment
      update((r) => ({ ...r, members: previousMembers }));
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update member assignment.";
      setToastModal({
        title: "Assignment Failed",
        message: typeof detail === "string" ? detail : JSON.stringify(detail),
        type: "danger",
      });
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen relative">
      <Helmet>
        <title>{requestNo || "Project"} - KORI BALI</title>
      </Helmet>

      <div className="flex-1 rounded-t-2xl hp:rounded-t-xl bg-gray-50">
        {/* ── Header: same blue card and width as the New Request form ── */}
        <div className="w-full max-w-[1440px] mx-auto px-2">
          <div className="rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#0d3b66] to-[#1a5a92] shadow-sm px-3 py-3 sm:px-4 sm:py-4 md:px-6 2xl:px-8 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate("/projects")}
                className={BACK_BUTTON}
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                Back to My Projects
              </button>
              <AnimatePresence>
                {isSyncing && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-white/90 bg-white/10 border border-white/20 backdrop-blur-xs"
                  >
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-300" />
                    <span>Syncing project data...</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-white/60">Request No.</p>
              <h1 className="mt-0.5 text-lg sm:text-xl lg:text-2xl font-semibold text-white break-words">
                {requestNo || request.requestNo || "—"}
              </h1>
              {(request.fields?.[headline.title] ||
                request.subject ||
                request.projectName) && (
                <p className="mt-1 text-sm sm:text-base text-white/80 break-words">
                  {request.fields?.[headline.title] ||
                    request.subject ||
                    request.projectName}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <Chip key={chip}>{chip}</Chip>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-[1440px] mx-auto pt-6 pb-24 sm:pb-8 px-2 space-y-4 md:space-y-6">
          {/* ── Section: Request Summary ── */}
          <div>
            <SectionTitle>
              <span>Project Details</span>
              <AnimatePresence>
                {isSyncing && <SyncBadge label="Syncing details..." />}
              </AnimatePresence>
            </SectionTitle>
            <SectionCard>
              <RequestSummary
                request={request}
                onEdit={
                  canEditProject
                    ? () => navigate(`/projects/edit/${request.id}`)
                    : null
                }
              />
            </SectionCard>
          </div>

          {/* ── Section 1: Design Conditions for Calculation Cases ── */}
          <AnimatePresence mode="wait">
            {hasCalc && (
              <motion.div
                key="design-conditions-calc-section"
                id="design-conditions-section"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              >
                <SectionTitle>
                  <span>Design Conditions for Calculation Cases</span>
                  <AnimatePresence>
                    {isSyncing && <SyncBadge label="Syncing conditions..." />}
                  </AnimatePresence>
                </SectionTitle>
                <SectionCard>
                  <DesignConditionsSection
                    ref={designConditionsRef}
                    request={request}
                    canEdit={canContribute}
                    onSave={handleSaveDesignConditions}
                    onToast={showToast}
                    onShowToastModal={(msg) => setToastModal({ message: msg })}
                    onEditModeChange={setIsEditingConditions}
                  />
                </SectionCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Section 2: Design Conditions for Drawing Cases ── */}
          <AnimatePresence mode="wait">
            {hasDrawing && (
              <motion.div
                key="design-conditions-drawing-section"
                id="drawing-conditions-section"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              >
                <SectionTitle>
                  <span>Design Conditions for Drawing Cases</span>
                  <AnimatePresence>
                    {isSyncing && <SyncBadge label="Syncing conditions..." />}
                  </AnimatePresence>
                </SectionTitle>
                <SectionCard>
                  <DrawingConditionsSection
                    ref={drawingConditionsRef}
                    request={request}
                    canEdit={canContribute}
                    onSave={handleSaveDrawingConditions}
                    onToast={showToast}
                    onShowToastModal={(msg) => setToastModal({ message: msg })}
                    onEditModeChange={setIsEditingDrawingConditions}
                  />
                </SectionCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Section: Assignment ── */}
          <div>
            <SectionTitle>
              <span>Assignment</span>
              <AnimatePresence>
                {isSyncing && <SyncBadge label="Syncing members..." />}
              </AnimatePresence>
            </SectionTitle>
            <SectionCard>
              <InitialAssignment
                members={request.members || []}
                canManageMembers={canEditProject}
                onChange={handleAssignMembersChange}
                workers={assignableWorkers}
              />
            </SectionCard>
          </div>

          {/* ── Section 2: Cases ── */}
          <div>
            <SectionTitle>
              <span>Cases</span>
              <AnimatePresence>
                {(isSyncing || isLoadingCases) && (
                  <SyncBadge label="Syncing latest cases..." />
                )}
              </AnimatePresence>
            </SectionTitle>
            <SectionCard>
              <RequestCases
                request={request}
                canContribute={canContribute}
                canAddCase={canAddCase}
                onAddCase={handleAddCase}
                onUpdateCase={handleUpdateCase}
                onTransferCase={handleTransferCase}
                onDeleteCase={handleDeleteCase}
                onOpenCase={handleOpenCase}
                onViewReport={handleViewCaseReport}
                onToast={showToast}
                onShowToastModal={(msg) => setToastModal({ message: msg })}
                onBeforeAddCase={handleBeforeAddCase}
              />
            </SectionCard>
          </div>

          {/* ── Section: References Related to This Project ── */}
          <div>
            <SectionTitle>
              <span>References Related to This Project</span>
              <AnimatePresence>
                {isSyncing && <SyncBadge label="Syncing files..." />}
              </AnimatePresence>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-normal text-slate-500 bg-slate-100 border border-slate-200 ml-2">
                Under Development
              </span>
            </SectionTitle>
            <SectionCard>
              <RequestFiles
                files={request.files || {}}
                cases={request.cases || []}
                request={request}
                onUpload={uploadFiles}
                onRemove={removeFile}
              />
            </SectionCard>
          </div>
        </div>
      </div>

      {/* Toast Modal (Warning Alert Popup like in Gambar 2) */}
      <ToastModal toast={toastModal} onClose={() => setToastModal(null)} />

      {/* Loading Modal when opening a case and fetching draft from server */}
      <ActionLoadingModal
        open={Boolean(openingCase)}
        title="Opening Case..."
        subtitle="Loading case details and calculation draft, please wait..."
      />
    </div>
  );
}
