import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
// eslint-disable-next-line no-unused-vars -- used as <motion.*> in JSX
import { motion } from "framer-motion";
import { Plus, Inbox, SearchX, Eye, Trash2, Loader2 } from "lucide-react";
import RequestFilterBar from "../components/requests/RequestFilterBar";
import RequestPagination from "../components/requests/RequestPagination";
import RequestStatusChip from "../components/requests/RequestStatusChip";
import RequestStatusGuide from "../components/requests/RequestStatusGuide";
import ConfirmDeleteRequestModal from "../components/modals/ConfirmDeleteRequestModal";
import { ToastModal } from "../components/modals/ToastModal";
import {
  deleteRequest as deleteRequestApi,
  getRequests,
  getRequestById,
  getRequestAssignments,
} from "../services/requestService";
import {
  deleteRequest as deleteRequestLocal,
  getAllRequests,
} from "../data/requestStore";
import { getUser, isGuestUser, getAccessToken } from "../../../utils/auth";
import { getUsers } from "../../admin/services/userService";
import api from "../../../config/api";
import { MOCK_REQUESTS, LINES } from "../data/mockRequests";
import {
  REQUEST_TABS,
  statusesForTab,
  DISCIPLINES,
  CLASSIFICATIONS,
  REQUEST_TYPES,
  SORT_OPTIONS,
  requestTab,
  describeRequest,
  sortRequests,
  describeDue,
  describeClosed,
  formatDate,
  timeAgo,
} from "../utils/requestStatus";
import {
  EMPTY_DATE_RANGE,
  matchesDateRange,
  isRangeActive,
} from "../utils/requestDateFilters";
import {
  SEARCH_FIELDS,
  matchesField,
  matchesQuickSearch,
} from "../utils/requestSearch";

// Coloured left edge (on the frozen No. cell) for urgent rows. Follows the
// Due column's tone so red/amber mean the same thing everywhere in the row,
// and stays visible while the table scrolls sideways. Rework statuses are
// already shown by the Status chip, so they don't get an edge of their own.
const ROW_ACCENT = {
  overdue: "shadow-[inset_3px_0_0_0_#ef4444]",
  soon: "shadow-[inset_3px_0_0_0_#f59e0b]",
};

// Edge class for a row, or undefined when it has none (not urgent, or done).
const rowAccent = (r) =>
  ROW_ACCENT[describeDue(r, { closed: r.tab === "done" }).tone];

// No. + Project are frozen on the left while the table scrolls sideways.
// No. has a fixed width so Project knows where to stick; a hairline on
// Project's right edge marks where the frozen part ends.
const NO_COL = "w-[72px] min-w-[72px] max-w-[72px] py-4 pl-6 pr-3";
const STICKY_NO = "sticky left-0 z-10";
const STICKY_PROJECT =
  "sticky left-[72px] z-10 shadow-[inset_-1px_0_0_0_#e2e8f0]";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const getAssigneeUserId = (a) =>
  a?.assigneeUserId ||
  a?.assignee_user_id ||
  a?.assignee?.id ||
  a?.user?.id ||
  a?.userId ||
  a?.user_id ||
  a?.assigneeId ||
  a?.assignee_id;

const isAssignmentActive = (a) => {
  if (!a) return false;
  if (
    a.isReleased === true ||
    a.is_released === true ||
    a.released === true ||
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
    [
      "released",
      "inactive",
      "cancelled",
      "revoked",
      "closed",
      "removed",
      "deleted",
    ].includes(st)
  ) {
    return false;
  }
  return true;
};

const isUserAdminDept = (user) => {
  if (!user) return false;
  const role = String(user.role || "").toLowerCase();
  return (
    role === "admin_department" ||
    role === "superadmin" ||
    role === "admin"
  );
};

const isUserCreator = (r, user) => {
  if (!r || !user) return false;
  const uId = user.id ? String(user.id) : "";
  const uFullName = (user.fullName || "").toLowerCase().trim();
  const uName = (user.name || "").toLowerCase().trim();
  const uUsername = (user.username || "").toLowerCase().trim();

  const creatorId = String(
    r.created_by_user_id ||
      r.createdByUserId ||
      r.created_by ||
      r.creator?.id ||
      r.creatorId ||
      "",
  );
  if (uId && creatorId && uId === creatorId) return true;

  const creatorName = (
    r.createdByName ||
    r.createdBy ||
    r.creator?.fullName ||
    r.creator?.name ||
    ""
  ).toLowerCase().trim();

  if (uFullName && creatorName && uFullName === creatorName) return true;
  if (uName && creatorName && uName === creatorName) return true;
  if (uUsername && creatorName && uUsername === creatorName) return true;

  return false;
};

const isUserAssignedMember = (r, user) => {
  if (!r || !user) return false;
  const uId = user.id ? String(user.id) : "";
  const uFullName = (user.fullName || "").toLowerCase().trim();
  const uName = (user.name || "").toLowerCase().trim();
  const uUsername = (user.username || "").toLowerCase().trim();

  // 1. Check server assignments & request assignments
  const rawAssignments = [
    ...(Array.isArray(r.serverAssignments) ? r.serverAssignments : []),
    ...(Array.isArray(r.assignments) ? r.assignments : []),
    ...(Array.isArray(r.assignments?.items) ? r.assignments.items : []),
  ];

  for (const a of rawAssignments) {
    if (!isAssignmentActive(a)) continue;
    const aUserId = String(getAssigneeUserId(a) || "");
    if (uId && aUserId && uId === aUserId) return true;

    const aName = (
      a.assignee?.fullName ||
      a.assignee?.name ||
      a.name ||
      ""
    ).toLowerCase().trim();
    if (uFullName && aName && uFullName === aName) return true;
    if (uName && aName && uName === aName) return true;

    const aUsername = (
      a.assignee?.username ||
      a.username ||
      ""
    ).toLowerCase().trim();
    if (uUsername && aUsername && uUsername === aUsername) return true;
  }

  // 2. Check members array (if stored in local or request object)
  if (Array.isArray(r.members)) {
    for (const m of r.members) {
      if (m.isCreator) continue;
      const mId = m.id ? String(m.id) : "";
      const mUserId =
        m.userId || m.assigneeUserId ? String(m.userId || m.assigneeUserId) : "";
      if (uId && mId && uId === mId) return true;
      if (uId && mUserId && uId === mUserId) return true;

      const mName = (m.name || m.fullName || "").toLowerCase().trim();
      if (uFullName && mName && uFullName === mName) return true;
      if (uName && mName && uName === mName) return true;
    }
  }

  return false;
};

// A request can be deleted only if it has not yet reached submitted, cleared, or cancelled stage,
// AND the user is either the Creator of the request or an Admin (Admin Department / Superadmin).
const canDeleteRequest = (r, user) => {
  if (!r) return false;
  const s = String(r.status || r.view?.statusKey || "").toLowerCase();
  if (
    ["diajukan", "submitted", "clear", "cleared", "cancel", "cancelled"].includes(
      s,
    )
  ) {
    return false;
  }
  if (r.tab === "done") {
    return false;
  }
  if (isGuestUser()) return true;

  // Only Creator or Admin Department / Superadmin can delete
  if (isUserAdminDept(user)) return true;
  return isUserCreator(r, user);
};

// Determine which tab a request belongs to from the current user's perspective:
// - "mine" (My tasks): Projects created by user OR where user is assigned as an active member.
// - "waiting": User's projects that are currently waiting on review/checker/Japan.
// - "done": User's finished/closed projects.
// - "other": Projects created by others where user is NOT assigned as a member (only visible in "All").
const determineRequestTab = (r, user) => {
  const workflowTab = requestTab(r); // "mine", "waiting", or "done"

  // Guest user: all requests in local store are the guest's tasks
  if (isGuestUser()) {
    return workflowTab;
  }

  // Admin department or superadmin: can see all requests in their workflow tab
  if (isUserAdminDept(user)) {
    return workflowTab;
  }

  // Drafter or Drafter Checker:
  // Only consider this "mine" or "waiting" if user is creator or assigned member
  const isMineOrAssigned =
    isUserCreator(r, user) || isUserAssignedMember(r, user);

  if (isMineOrAssigned) {
    return workflowTab;
  }

  // Not creator and not assigned:
  // Does not belong in "mine" or "waiting" tabs. It will only be visible in "All".
  return "other";
};

// Row hover tint (light navy). Solid hex rather than an opacity class so the
// frozen Project cell — which needs an opaque background — matches exactly.
const ROW_HOVER = "hover:bg-[#f2f7fd]";
const STICKY_ROW_HOVER = "group-hover:bg-[#f2f7fd]";

// Explains the row edge, so red/amber read as deadline urgency rather than
// the same-coloured Internal correction / Returned status chips.
const DUE_LEGEND = [
  { label: "Overdue", color: "bg-[#ef4444]" },
  { label: "Due within 3 days", color: "bg-[#f59e0b]" },
];

const DueLegend = () => (
  <div className="flex items-center gap-4 text-xs text-slate-500">
    <span className="hp:hidden">Row edge:</span>
    {DUE_LEGEND.map((item) => (
      <span key={item.label} className="inline-flex items-center gap-1.5">
        <span className={`w-[3px] h-3.5 rounded-full ${item.color}`} />
        {item.label}
      </span>
    ))}
  </div>
);

const CLOSED_TONE = {
  on_time: "text-emerald-600",
  late: "text-red-600",
  cancelled: "text-slate-400",
  none: "text-slate-400",
};

const DUE_TONE = {
  overdue: "text-red-600",
  soon: "text-amber-600",
  normal: "text-slate-700",
  none: "text-slate-400",
};

// Every cell shares one horizontal rhythm; the outer columns line up with
// the filter bar's px-6.
const CELL = "px-4 py-4 first:pl-6 last:pr-6";

// eslint-disable-next-line no-unused-vars
const lineLabel = (key) => LINES.find((l) => l.key === key)?.label ?? key;
const requestTypeLabel = (key) =>
  REQUEST_TYPES.find((t) => t.key === key)?.label ?? key;
const classificationLabel = (key) =>
  CLASSIFICATIONS.find((c) => c.key === key)?.label ?? key;

const WORK_TYPE_LABELS = {
  both: "Calculation and drawing",
  drawing: "Drawing",
  calc: "Calculation",
};

const getRequestWorkType = (r) => {
  if (!r) return "calc";
  const dt = r.designType || r.design_type;
  if (
    dt === "drawing_calculation" ||
    dt === "both" ||
    (r.workTypes?.calc && r.workTypes?.drawing)
  ) {
    return "both";
  }
  const isCalc =
    dt === "calculation" ||
    Boolean(r.workTypes?.calc) ||
    r.items?.some((i) => i.work_type === "calc") ||
    r.cases?.some((c) => c.workType === "calc");
  const isDrawing =
    dt === "drawing" ||
    Boolean(r.workTypes?.drawing) ||
    r.items?.some((i) => i.work_type === "drawing") ||
    r.cases?.some((c) => c.workType === "drawing");

  if (isCalc && isDrawing) return "both";
  if (isDrawing) return "drawing";
  return "calc";
};

const EMPTY_COPY = {
  mine: "Nothing to work on right now.",
  waiting: "No projects are waiting on anyone else.",
  done: "No finished projects yet.",
  all: "You don't have any projects yet.",
};

const EMPTY_FILTERS = {
  line: "all",
  work_type: "all",
  status: "all",
  classification: "all",
  requestType: "all",
  // One text input per field (Project no., Request no., Client, PIC …)
  ...Object.fromEntries(
    SEARCH_FIELDS.filter((f) => !f.mainOnly).map((f) => [f.key, ""]),
  ),
  requestDate: EMPTY_DATE_RANGE,
  dueDate: EMPTY_DATE_RANGE,
  // Done tab only; replaces Due there, like the Closed column does.
  completedDate: EMPTY_DATE_RANGE,
};

// Select-type filters: how a row matches a chosen value.
const SELECT_FILTERS = {
  // A5: Request uses `brandLine` (BE: brand_line), Project uses `requestForm`
  // (BE: request_form). Both show "Line" in the UI but are separate fields.
  line: (r, v) => r.brandLine === v,
  // Work type of *my* assignments, not the request's design_type — a
  work_type: (r, v) => getRequestWorkType(r) === v,
  status: (r, v) => r.view.key === v,
  classification: (r, v) => r.requestClassification === v,
  requestType: (r, v) => r.requestType === v,
};

// Does `r` pass every active filter, ignoring the one named `skip`?
function matchesFilters(r, filters, skip = null) {
  for (const [key, match] of Object.entries(SELECT_FILTERS)) {
    if (key !== skip && filters[key] !== "all" && !match(r, filters[key])) {
      return false;
    }
  }
  return (
    // Every filled field input has to match (AND), DataBank style.
    SEARCH_FIELDS.every(
      (f) => f.mainOnly || matchesField(r, f.key, filters[f.key]),
    ) &&
    matchesDateRange(r.requestDate, filters.requestDate) &&
    matchesDateRange(r.dueDate, filters.dueDate) &&
    matchesDateRange(r.closedAt, filters.completedDate)
  );
}

export default function RequestListPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("mine");
  const [searchTerm, setSearchTerm] = useState("");
  const [tabFilters, setTabFilters] = useState({
    mine: { ...EMPTY_FILTERS },
    waiting: { ...EMPTY_FILTERS },
    done: { ...EMPTY_FILTERS },
    all: { ...EMPTY_FILTERS },
  });
  const filters = tabFilters[activeTab];
  const [sortBy, setSortBy] = useState("updated");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const [currentUser, setCurrentUser] = useState(() => getUser());

  // Leaving a project's drafts for the request list drops the project
  // context, same as the project type picker used to.
  useEffect(() => {
    sessionStorage.removeItem("projectType");
    setCurrentUser(getUser());
  }, []);

  const [rawRequests, setRawRequests] = useState(() => {
    try {
      const cached = sessionStorage.getItem("cached_server_requests");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    try {
      const cached = sessionStorage.getItem("cached_server_requests");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch {}
    return true;
  });
  const [deletingRequest, setDeletingRequest] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  // Fetch live requests: render immediately as soon as initial list arrives, then enrich child details in background
  useEffect(() => {
    let isMounted = true;
    async function fetchRequests() {
      // If we do not have cached items in state, show loading skeleton
      if (rawRequests.length === 0) {
        setIsLoading(true);
      }

      // Guest User without token: read from local store
      if (!getAccessToken()) {
        const guestItems = getAllRequests();
        if (isMounted) {
          setRawRequests(guestItems);
          setIsLoading(false);
        }
        return;
      }

      // Registered User: read live directly from API Gateway (no mock store mixing)
      try {
        const [usersRes, assignableRes, reqsRes] = await Promise.all([
          getUsers().catch(() => []),
          api
            .get("/api/assignable-users")
            .then((r) => r?.data?.data || r?.data || [])
            .catch(() => []),
          getRequests({ limit: 100 }),
        ]);

        const items = Array.isArray(reqsRes)
          ? reqsRes
          : reqsRes?.items || reqsRes?.data || [];

        const currentUser = getUser();

        // Build a user name lookup map from backend users
        const userMap = new Map();
        if (currentUser?.id) {
          userMap.set(
            String(currentUser.id),
            currentUser.fullName || currentUser.name,
          );
        }
        const allUsers = [
          ...(Array.isArray(usersRes) ? usersRes : usersRes?.items || []),
          ...(Array.isArray(assignableRes)
            ? assignableRes
            : assignableRes?.items || []),
        ];
        allUsers.forEach((u) => {
          if (u?.id) {
            userMap.set(String(u.id), u.fullName || u.name || u.email);
          }
        });

        const buildNormalized = (rawItems, detailsMap = new Map()) => {
          return rawItems.map((s) => {
            const detail = detailsMap.get(s.id) || {};
            const full = { ...s, ...detail };

            const createdByUserId =
              full.created_by_user_id ||
              full.createdByUserId ||
              full.created_by;

            const resolvedCreatedByName =
              full.createdByName ||
              full.creator?.fullName ||
              full.creator?.name ||
              (createdByUserId && userMap.get(String(createdByUserId))) ||
              (createdByUserId &&
              String(createdByUserId) === String(currentUser?.id)
                ? currentUser?.fullName || currentUser?.name
                : null) ||
              null;

            // Company Name from backend: stored in requestingDepartmentName
            const companyName =
              full.requestingDepartmentName ||
              full.requesting_department_name ||
              full.companyName ||
              "";

            // PIC: Stored in child table shared_details (requesterPicName)
            const pic =
              full.sharedDetails?.requesterPicName ||
              full.shared_details?.requester_pic_name ||
              full.requesterPicName ||
              full.picName ||
              "";

            // Receipt No from backend (ysDetails or top-level)
            const receiptNo =
              full.ysDetails?.receiptNo ||
              full.ys_details?.receipt_no ||
              full.receiptNo ||
              full.receipt_no ||
              full.receptionNo ||
              full.fields?.receptionNo ||
              full.fields?.receiptNo ||
              "";

            const dt = full.designType || full.design_type || "calculation";
            const workTypes = {
              calc: dt === "drawing_calculation" || dt === "calculation",
              drawing: dt === "drawing_calculation" || dt === "drawing",
            };

            const rawAssignments = [
              ...(Array.isArray(full.serverAssignments)
                ? full.serverAssignments
                : []),
              ...(Array.isArray(full.assignments) ? full.assignments : []),
              ...(Array.isArray(full.assignments?.items)
                ? full.assignments.items
                : []),
            ];

            return {
              ...full,
              pjNo: full.pjNo || full.pj_no || "",
              requestNo: full.requestNo || full.request_no || "",
              subject: full.subject || "",
              companyName,
              receiptNo,
              requesterPicName: pic,
              picName: pic,
              createdByName: resolvedCreatedByName,
              createdByUserId,
              created_by_user_id: createdByUserId,
              serverAssignments: full.serverAssignments || [],
              assignments: rawAssignments,
              members: Array.isArray(full.members) ? full.members : [],
              requestType: full.requestType || full.request_type || "general",
              requestClassification:
                full.requestClassification ||
                full.request_classification ||
                "new",
              requestDate: full.requestDate || full.request_date || "",
              dueDate: full.dueDate || full.due_date || "",
              status: full.status || "in_progress",
              designType: dt,
              workTypes,
              cases: Array.isArray(full.cases) ? full.cases : [],
            };
          });
        };

        // 1. Immediate Fast Render: Display table instantly without waiting for waterfall child calls
        const fastNormalized = buildNormalized(items);
        if (isMounted) {
          setRawRequests(fastNormalized);
          setIsLoading(false);
          try {
            sessionStorage.setItem(
              "cached_server_requests",
              JSON.stringify(fastNormalized),
            );
          } catch {}
        }

        // 2. Non-blocking Background Enrichment: Fetch detailed PIC & assignments silently
        Promise.all(
          items.map(async (s) => {
            if (!s?.id) return null;
            try {
              const [detail, assignments] = await Promise.all([
                getRequestById(s.id).catch(() => null),
                getRequestAssignments(s.id).catch(() => []),
              ]);
              return {
                id: s.id,
                detail: {
                  ...(detail || {}),
                  serverAssignments: Array.isArray(assignments)
                    ? assignments
                    : assignments?.items || assignments?.data || [],
                },
              };
            } catch {
              return null;
            }
          }),
        ).then((enrichedList) => {
          if (!isMounted || !enrichedList) return;
          const detailsMap = new Map();
          enrichedList.forEach((e) => {
            if (e?.id) detailsMap.set(e.id, e.detail);
          });
          const enrichedNormalized = buildNormalized(items, detailsMap);
          setRawRequests(enrichedNormalized);
          try {
            sessionStorage.setItem(
              "cached_server_requests",
              JSON.stringify(enrichedNormalized),
            );
          } catch {}
        });
      } catch (err) {
        console.warn(
          "[RequestListPage] Live requests fetch failed:",
          err?.message,
        );
        if (isMounted) {
          const fallback = getAllRequests();
          setRawRequests(fallback);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    fetchRequests();
    return () => {
      isMounted = false;
    };
  }, []);

  const requests = useMemo(
    () =>
      rawRequests
        .filter(Boolean)
        .map((r) => ({
          ...r,
          tab: determineRequestTab(r, currentUser),
          view: describeRequest(r),
        })),
    [rawRequests, currentUser],
  );

  const handleConfirmDelete = async (reqToDelete) => {
    if (!reqToDelete) return;

    if (!canDeleteRequest(reqToDelete, currentUser)) {
      setToast({
        message:
          "You do not have permission to delete this project. Only the project creator or an admin can delete it.",
        type: "danger",
      });
      setDeletingRequest(null);
      return;
    }

    setIsDeleting(true);
    const reqLabel =
      reqToDelete.requestNo ||
      reqToDelete.fields?.requestNo ||
      reqToDelete.pjNo ||
      "Request";

    // 1. Delete on API Gateway (if not guest)
    if (!isGuestUser()) {
      try {
        await deleteRequestApi(reqToDelete.id);
      } catch (err) {
        console.error("[handleConfirmDelete] Gateway delete call failed:", err);
        const errorMsg =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Failed to delete request on server. Please check your permissions.";
        setToast({
          message:
            typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg),
          type: "danger",
        });
        setIsDeleting(false);
        setDeletingRequest(null);
        return;
      }
    }

    // 2. Delete locally in storage
    deleteRequestLocal(reqToDelete.id);

    // 3. Update state
    setRawRequests((prev) => prev.filter((r) => r.id !== reqToDelete.id));
    setIsDeleting(false);
    setDeletingRequest(null);
    setToast({
      message: `${reqLabel} has been permanently deleted.`,
      type: "success",
    });
  };

  // Anything that changes which rows are listed sends you back to page 1.
  const setFilter = (key) => (value) => {
    setTabFilters((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [key]: value,
      },
    }));
    setPage(1);
  };
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setPage(1);
  };
  const handleSortChange = (value) => {
    setSortBy(value);
    setPage(1);
  };
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setPage(1);
  };

  const term = searchTerm.trim();
  const matchesSearch = (r) => matchesQuickSearch(r, term);
  const inTab = (r) => activeTab === "all" || r.tab === activeTab;

  // Tabs are themselves status groups, so status never narrows the counts.
  const tabCounts = REQUEST_TABS.reduce((acc, t) => {
    const tFilters = tabFilters[t.key];
    const count = requests.filter(
      (r) =>
        matchesSearch(r) &&
        (t.key === "all" || r.tab === t.key) &&
        matchesFilters(r, tFilters, "status"),
    ).length;
    return { ...acc, [t.key]: count };
  }, {});

  const visibleRows = sortRequests(
    requests.filter(
      (r) => matchesSearch(r) && inTab(r) && matchesFilters(r, filters),
    ),
    activeTab,
    sortBy,
  );

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const firstIndex = (safePage - 1) * pageSize;
  const pagedRows = visibleRows.slice(firstIndex, firstIndex + pageSize);

  const optionsFor = (options) => [{ key: "all", label: "All" }, ...options];

  // Prefix inside the trigger ("Work Type: All") — no separate label needed.
  const quickFilters = [
    // { key: "line", prefix: "Line", options: optionsFor(LINES) },
    {
      key: "work_type",
      prefix: "Work Type",
      options: optionsFor([
        ...DISCIPLINES,
        { key: "both", label: "Calculation & Drawing" },
      ]),
    },
    // Every tab, but only the statuses that can appear in it.
    {
      key: "status",
      prefix: "Status",
      options: optionsFor(statusesForTab(activeTab)),
    },
  ].map((f) => ({ ...f, value: filters[f.key], onChange: setFilter(f.key) }));

  // Reading order = panel order: numbers, people, request kind, dates.
  const advancedFilters = [
    ...SEARCH_FIELDS.filter((f) => !f.mainOnly).map((f) => ({
      key: f.key,
      type: "text",
      label: f.label,
      placeholder: f.placeholder,
      colSpan: f.colSpan,
    })),
    {
      key: "classification",
      type: "select",
      label: "Classification",
      options: optionsFor(CLASSIFICATIONS),
    },
    {
      key: "requestType",
      type: "select",
      label: "Request type",
      options: optionsFor(REQUEST_TYPES),
    },
    {
      key: "requestDate",
      type: "date",
      label: "Request date",
    },
    {
      key: "dueDate",
      type: "date",
      label: "Request Due date",
      hidden: activeTab === "done",
    },
    {
      key: "completedDate",
      type: "date",
      label: "Closed date",
      hidden: activeTab !== "done",
    },
  ].map((f) => ({ ...f, value: filters[f.key], onChange: setFilter(f.key) }));

  const isAdvancedActive = (f) =>
    !f.hidden &&
    (f.type === "date"
      ? isRangeActive(f.value)
      : f.type === "text"
        ? f.value.trim() !== ""
        : f.value !== "all");
  const activeAdvanced = advancedFilters.filter(isAdvancedActive);

  const isFiltered =
    !!term || JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(1);
  };

  const handleReset = () => {
    setSearchTerm("");
    setTabFilters((prev) => ({
      ...prev,
      [activeTab]: { ...EMPTY_FILTERS },
    }));
    setPage(1);
  };

  // One "Progress" column on every tab, so each value has to read on its own:
  // a waiting row says who it waits on in full, not just "Checker".
  const detailFor = (r) =>
    r.tab === "waiting" ? `Waiting on ${r.view.detail}` : r.view.detail;

  // Open project detail
  const handleOpenRequest = (r) => {
    navigate(`/projects/detail/${r.id}`);
  };

  // One value per column. `th`/`td` add classes on top of the shared CELL
  // (or replace it, via `base`). `render` gets the row's position in the
  // whole filtered list, for the No. column.
  const columns = [
    {
      key: "no",
      label: "No.",
      base: NO_COL,
      th: `${STICKY_NO} bg-slate-50`,
      td: (r) =>
        `${STICKY_NO} bg-white ${STICKY_ROW_HOVER} transition-colors text-slate-500 tabular-nums ${rowAccent(r) ?? ""}`,
      render: (r, position) => position,
    },
    {
      key: "project",
      label: "Project no.",
      th: `${STICKY_PROJECT} bg-slate-50 w-[1%] whitespace-nowrap`,
      td: () =>
        `${STICKY_PROJECT} bg-white ${STICKY_ROW_HOVER} transition-colors whitespace-nowrap`,
      render: (r) => (
        <span className="font-semibold text-slate-900 tabular-nums">
          {r.pjNo || r.fields?.projectNo || "—"}
        </span>
      ),
    },
    {
      key: "subject",
      label: "Project name",
      th: "min-w-[220px]",
      td: () => "text-slate-700 break-words",
      render: (r) => r.subject || r.fields?.projectName || "—",
    },
    {
      key: "requestNo",
      label: "Request no.",
      th: "w-[1%] whitespace-nowrap",
      td: () => "whitespace-nowrap text-slate-700 tabular-nums",
      render: (r) => r.requestNo || r.fields?.requestNo || "—",
    },
    {
      key: "client",
      label: "Company name",
      th: "min-w-[160px]",
      td: () => "text-slate-600 break-words",
      render: (r) => r.companyName || "—",
    },
    {
      key: "classification",
      label: "Classification",
      th: "w-[1%]",
      td: () => "whitespace-nowrap text-slate-700",
      render: (r) => classificationLabel(r.requestClassification || "new"),
    },
    {
      key: "receiptNo",
      label: "Receipt no.",
      th: "w-[1%] whitespace-nowrap",
      td: () => "whitespace-nowrap text-slate-700 tabular-nums",
      render: (r) => r.receiptNo || "—",
    },
    {
      key: "japanPic",
      label: "PIC",
      th: "whitespace-nowrap",
      td: () => "text-slate-600 whitespace-nowrap",
      render: (r) => r.requesterPicName || "—",
    },
    {
      key: "workType",
      label: "Work Type",
      th: "w-[1%]",
      td: () => "whitespace-nowrap text-slate-700",
      render: (r) => {
        const wt = getRequestWorkType(r);
        return WORK_TYPE_LABELS[wt] || "Calculation";
      },
    },
    {
      key: "requestType",
      label: "Request type",
      th: "w-[1%]",
      td: () => "whitespace-nowrap text-slate-700",
      render: (r) => requestTypeLabel(r.requestType || r.fields?.requestType || "general"),
    },
    {
      key: "status",
      label: "Status",
      th: "w-[1%]",
      td: () => "",
      // Hover / focus the chip for a one-line explanation.
      render: (r) => (
        <RequestStatusChip
          statusKey={r.view.key}
          label={r.view.label}
          withHint
        />
      ),
    },
    {
      key: "progress",
      label: "Progress",
      th: "min-w-[220px]",
      td: () => "text-slate-700 break-words",
      render: (r) => detailFor(r) || "—",
    },
    {
      key: "requestDate",
      label: "Request date",
      th: "w-[1%]",
      td: () => "whitespace-nowrap text-slate-700",
      render: (r) => formatDate(r.requestDate) || "—",
    },
    activeTab === "done"
      ? {
          // "Closed", not "Completed": Done also holds cancelled requests.
          key: "closed",
          label: "Closed",
          th: "w-[1%]",
          td: () => "whitespace-nowrap text-slate-700",
          render: (r) => {
            const closed = describeClosed(r);
            return (
              <>
                <span className="block">{closed?.text || formatDate(r.closedAt) || "—"}</span>
                {closed?.hint && (
                  <span
                    className={`block mt-0.5 text-xs font-medium ${CLOSED_TONE[closed.tone]}`}
                  >
                    {closed.hint}
                  </span>
                )}
              </>
            );
          },
        }
      : {
          key: "due",
          label: "Request due date",
          th: "w-[1%]",
          td: () => "whitespace-nowrap",
          render: (r) => {
            const due = describeDue(r, { closed: r.tab === "done" });
            const text = due?.text && due.text !== "—" ? due.text : formatDate(r.dueDate);
            return (
              <>
                <span className={`block ${DUE_TONE[due?.tone || "normal"]}`}>
                  {text || "—"}
                </span>
                {due?.hint && text && (
                  <span
                    className={`block mt-0.5 text-xs font-medium ${DUE_TONE[due.tone]}`}
                  >
                    {due.hint}
                  </span>
                )}
              </>
            );
          },
        },
    // Who submitted it to Japan — only meaningful once a request can have
    // been submitted, so not on My tasks.
    ...(activeTab === "mine"
      ? []
      : [
          {
            key: "submittedBy",
            label: "Submitted by",
            th: "w-[1%]",
            td: () => "whitespace-nowrap text-slate-700",
            render: (r) => r.submittedByName || "—",
          },
        ]),
    {
      key: "createdBy",
      label: "Created by",
      th: "w-[1%]",
      td: () => "whitespace-nowrap text-slate-700",
      render: (r) => r.createdByName || "—",
    },
    {
      key: "updated",
      label: "Updated",
      th: "w-[1%]",
      td: () => "whitespace-nowrap text-slate-500",
      render: (r) => timeAgo(r.updatedAt) || "—",
    },
    {
      key: "action",
      label: "Action",
      th: "w-[1%] text-right",
      td: () => "text-right",
      render: (r) => {
        const isDeletable = canDeleteRequest(r, currentUser);
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenRequest(r)}
              aria-label={`Open ${r.pjNo || ""} ${r.requestNo || r.subject || ""}`.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hp:rounded-md text-xs font-semibold whitespace-nowrap bg-blue-50 text-[#0d3b66] ring-1 ring-inset ring-blue-200 group-hover:bg-[#0d3b66] group-hover:text-white group-hover:ring-[#0d3b66] hover:bg-[#0a2c4c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3399cc]/50 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Open
            </button>
            {isDeletable && (
              <>
                <span className="text-slate-300 select-none px-0.5">|</span>
                <button
                  type="button"
                  onClick={() => setDeletingRequest(r)}
                  title="Delete request"
                  aria-label={`Delete ${r.requestNo || r.pjNo || ""}`.trim()}
                  className="inline-flex items-center justify-center p-1.5 rounded-lg hp:rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 ring-1 ring-inset ring-transparent hover:ring-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="min-h-full flex flex-col">
      <Helmet>
        <title>My Works - KORI BALI</title>
      </Helmet>

      {/* A wide data table, so the page uses the full content width instead
          of the 1600px cap other pages use. Side gutter (on top of main's
          32px): 16px on laptops, 32px from 2xl. Capped at 2800px so a 4K
          screen at 100% scaling doesn't stretch rows across ~3600px.
          No top padding: main already pads 16/32px below the header, and
          stacking another 32px on top left the title floating too low. */}
      <div className="mx-auto w-full max-w-[2800px] px-6 hp:px-3 lg:px-4 2xl:px-8 pt-0 pb-4 sm:pb-6 lg:pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              My Works
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm">
              Track and manage calculation and drawing works assigned to or
              created by you, from action required to completion.
            </p>
          </div>

          <button
            onClick={() => navigate("/projects/new")}
            className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap px-5 py-2.5 bg-[#0d3b66] text-white rounded-lg hp:rounded-md font-medium text-sm hover:bg-[#0a2c4c] active:scale-[0.98] transition-all shadow-sm"
          >
            <Plus className="w-4.5 h-4.5" />
            New Project
          </button>
        </div>

        {/* Tabs + Status guide. The guide sits outside the tab strip's
            horizontal scroll container so its popover isn't clipped. */}
        <div className="flex items-end justify-between gap-4 border-b border-slate-200 mb-5">
          <div
            role="tablist"
            className="flex items-center gap-6 min-w-0 overflow-x-auto scrollbar-hide"
          >
            {REQUEST_TABS.map((tab) => {
              const isActive = tab.key === activeTab;
              const count = tabCounts[tab.key] || 0;
              // Active tab: solid navy, like its label and underline. "My tasks"
              // keeps a soft navy tint when inactive so pending work still
              // draws the eye; other counts stay muted.
              const badgeTone = isActive
                ? "bg-[#0d3b66] text-white"
                : tab.key === "mine" && count > 0
                  ? "bg-[#0d3b66]/10 text-[#0d3b66]"
                  : "bg-slate-100 text-slate-500";
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleTabChange(tab.key)}
                  className={`relative flex items-center gap-2 pb-3 pt-1 text-sm font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? "text-[#0d3b66]"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold tabular-nums transition-colors ${badgeTone}`}
                  >
                    {isLoading ? (
                      <span className="w-2.5 h-2.5 bg-current opacity-30 rounded-full animate-pulse" />
                    ) : (
                      count
                    )}
                  </span>
                  {isActive && (
                    <motion.span
                      layoutId="request-tab-underline"
                      className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-[#0d3b66]"
                    />
                  )}
                </button>
              );
            })}
          </div>
          <RequestStatusGuide />
        </div>

        {/* Search, filters, result count and sort; all controls live here
            so the column headers stay plain labels. */}
        <RequestFilterBar
          search={{
            value: searchTerm,
            onChange: handleSearchChange,
            // The box searches every field in SEARCH_FIELDS; listing them all
            // in the placeholder gets cut off, so it stays generic and the
            // tooltip spells them out.
            placeholder: "Search projects…",
            hint: `Searches ${SEARCH_FIELDS.map((f) => f.label).join(", ")}`,
          }}
          quick={quickFilters}
          advanced={advancedFilters}
          advancedCount={activeAdvanced.length}
          isFiltered={isFiltered}
          onReset={handleReset}
          // Only when the filtered list (any page) has an edged row; otherwise
          // the legend explains nothing. Never shows in Done.
          legend={visibleRows.some(rowAccent) && <DueLegend />}
          resultCount={visibleRows.length}
          sort={{
            options: SORT_OPTIONS,
            value: sortBy,
            onChange: handleSortChange,
          }}
        />

        {/* Table */}
        <div className="bg-white rounded-b-2xl hp:rounded-b-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto scrollbar-soft">
            <table className="w-full min-w-[1960px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr className="[&>th]:font-semibold [&>th]:whitespace-nowrap">
                  {columns.map((c) => (
                    <th key={c.key} className={`${c.base ?? CELL} ${c.th}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading
                  ? Array.from({ length: 6 }).map((_, idx) => (
                      <tr
                        key={`skeleton-${idx}`}
                        className="animate-pulse transition-colors"
                      >
                        {/* No. (Sticky) */}
                        <td className={`${NO_COL} ${STICKY_NO} bg-white px-3 py-3.5`}>
                          <div className="w-4 h-3.5 bg-slate-200/80 rounded" />
                        </td>

                        {/* Project no. (Sticky) */}
                        <td className={`${STICKY_PROJECT} bg-white px-3 py-3.5 whitespace-nowrap`}>
                          <div className="w-14 h-4 bg-slate-200/90 rounded" />
                        </td>

                        {/* Project name */}
                        <td className="px-3 py-3.5 min-w-[220px]">
                          <div
                            className="h-4 bg-slate-200/70 rounded"
                            style={{ width: `${140 + (idx % 3) * 35}px` }}
                          />
                        </td>

                        {/* Request no. */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="w-24 h-4 bg-slate-200/60 rounded" />
                        </td>

                        {/* Company name */}
                        <td className="px-3 py-3.5 min-w-[160px]">
                          <div
                            className="h-4 bg-slate-200/60 rounded"
                            style={{ width: `${110 + (idx % 2) * 30}px` }}
                          />
                        </td>

                        {/* Classification */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="w-12 h-3.5 bg-slate-200/60 rounded" />
                        </td>

                        {/* Receipt no. */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="w-20 h-3.5 bg-slate-200/60 rounded" />
                        </td>

                        {/* PIC */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="w-20 h-3.5 bg-slate-200/60 rounded" />
                        </td>

                        {/* Work Type */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="w-16 h-3.5 bg-slate-200/60 rounded" />
                        </td>

                        {/* Request type */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="w-14 h-3.5 bg-slate-200/60 rounded" />
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="w-24 h-6 bg-slate-200/70 rounded-full" />
                        </td>

                        {/* Progress */}
                        <td className="px-3 py-3.5 min-w-[220px]">
                          <div
                            className="h-3.5 bg-slate-200/60 rounded"
                            style={{ width: `${130 + (idx % 2) * 40}px` }}
                          />
                        </td>

                        {/* Request date */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="w-20 h-3.5 bg-slate-200/60 rounded" />
                        </td>

                        {/* Due date / Closed */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="w-20 h-3.5 bg-slate-200/60 rounded" />
                        </td>

                        {/* Submitted by (if activeTab !== "mine") */}
                        {activeTab !== "mine" && (
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <div className="w-20 h-3.5 bg-slate-200/60 rounded" />
                          </td>
                        )}

                        {/* Created by */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="w-20 h-3.5 bg-slate-200/60 rounded" />
                        </td>

                        {/* Updated */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="w-16 h-3.5 bg-slate-200/60 rounded" />
                        </td>

                        {/* Action */}
                        <td className="px-3 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 ml-auto">
                            <div className="w-14 h-7 bg-slate-200/60 rounded-lg" />
                          </div>
                        </td>
                      </tr>
                    ))
                  : pagedRows.map((r, i) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`group ${ROW_HOVER} transition-colors`}
                      >
                        {columns.map((c) => (
                          <td
                            key={c.key}
                            className={`${c.base ?? CELL} ${c.td(r)}`}
                          >
                            {c.render(r, firstIndex + i + 1)}
                          </td>
                        ))}
                      </motion.tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Empty state lives outside the scrolling table so it stays
              centred in the card even when the table is scrolled sideways. */}
          {!isLoading && visibleRows.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-slate-400">
              {isFiltered ? (
                <SearchX className="w-8 h-8" />
              ) : (
                <Inbox className="w-8 h-8" />
              )}
              <p className="text-sm">
                {isFiltered
                  ? "No projects match your search or filters."
                  : EMPTY_COPY[activeTab]}
              </p>
            </div>
          )}

          {!isLoading && visibleRows.length > 0 && (
            <RequestPagination
              page={safePage}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              total={visibleRows.length}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </div>
      </div>

      {/* ── Modal: Confirm Delete Request (GitHub Style) ── */}
      <ConfirmDeleteRequestModal
        isOpen={Boolean(deletingRequest)}
        request={deletingRequest}
        onClose={() => !isDeleting && setDeletingRequest(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      {/* ── Toast notification feedback ── */}
      <ToastModal toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
