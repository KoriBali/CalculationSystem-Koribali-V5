import { useState, useEffect } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { Eye } from "lucide-react";

import { MobileSidebar, DesktopSidebar } from "./Sidebar";
import { Header } from "./Header";
import { LogoutModal } from "./LogoutModal";
import { DraftActionModal } from "../../../features/calculations/components/modals/DraftActionModal";
import { MENU_ITEMS } from "../../constants/layoutConstants";
import {
  getUser,
  setUser,
  isAuthenticated,
  clearAuthSession,
} from "../../../utils/auth";
import { logoutUser, getMe } from "../../../services/authService";
import { ScrollToTopButton } from "../ScrollToTopButton";
import { ErrorBoundary } from "../ErrorBoundary";
import { resetScrollDirection } from "../../../hooks/useScrollDirection";
import {
  getMasterData,
  getMasterDesignStandards,
  getMasterRegions,
} from "../../../features/calculations/services/masterDataService";
import { getCouplingMasterData } from "../../../features/calculations/services/couplingMasterService";
import {
  saveWorkingSessionToDraft,
  clearActiveDraftId,
  clearCalculationSession,
  hasDraftChanged,
} from "../../../features/calculations/utils/coreLogic";
import { projectTypeLabel } from "../../../features/calculations/constants/projectTypes";
import { ConfirmResetAllModal } from "../../../features/calculations/components/modals/ConfirmResetAllModal";
import { useLeaveNewRequest } from "../../../features/calculations/hooks/useLeaveNewRequest";
import { clearNewRequestDraft } from "../../../features/calculations/utils/newRequestDraft";
import {
  findRequestOfCase,
  getRequest,
} from "../../../features/calculations/data/requestStore";
import { requestNoOf } from "../../../features/calculations/constants/requestSummary";
import { requestPathForDraft } from "../../../features/calculations/utils/requestCases";
import {
  forgetRequestsPath,
  lastRequestsPath,
  rememberRequestsPath,
  forgetProjectToolsPath,
  lastProjectToolsPath,
  rememberProjectToolsPath,
} from "../../../features/calculations/utils/requestsLastPath";

// ─── HELPERS ────────────────────────────────────────────────────────────────

function formatProjectType(type) {
  if (!type) return null;
  return projectTypeLabel(type);
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  // Sidebar state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Modal + user state
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userData, setUserData] = useState({ name: "User", email: "" });
  // Set to { ptype, draftId, target } while the "save this draft?" prompt is open.
  const [draftPrompt, setDraftPrompt] = useState(null);
  // Logo / breadcrumb out of the New Request form: "Leave this request?"
  // first when it has entries (navigates straight away anywhere else).
  const { leave: leaveNewRequest, confirmProps: leaveNewRequestProps } =
    useLeaveNewRequest();

  // Derive current page title from route + session
  const projectType = sessionStorage.getItem("projectType");
  const formattedProjectType = formatProjectType(projectType);
  const isCalculationRoot = location.pathname === "/projects" || location.pathname === "/requests";
  const isCheckingQueue = location.pathname.startsWith("/checking-queue");
  const isProjectTools = location.pathname.startsWith("/project-tools");
  const projectToolsMatch = location.pathname.match(/^\/project-tools\/([^/]+)(?:\/(.*))?$/);
  // Covers /projects/new (type picker) and /projects/new/:type (form).
  const isNewRequest = /^\/(projects|requests)\/new(\/|$)/.test(location.pathname);
  // /projects/detail/:requestId — Projects > [its Request No.]
  const requestDetailId = location.pathname.match(
    /^\/(projects|requests)\/detail\/([^/]+)/,
  )?.[2];
  // /projects/:type/:draftId[/…] — a case's draft (calculation / drawing).
  const pathParts = location.pathname.split("/").filter(Boolean);
  const draftId =
    (pathParts[0] === "projects" || pathParts[0] === "requests") &&
    !["new", "detail"].includes(pathParts[1]) &&
    pathParts[2];
  const draftCase = draftId ? findRequestOfCase(draftId) : null;

  let currentTitle;
  if (location.pathname === "/project-tools") {
    currentTitle = "Project Tools";
  } else if (projectToolsMatch) {
    const typeSlug = projectToolsMatch[1];
    const subStep = projectToolsMatch[2] || "setup";
    const formattedType = formatProjectType(typeSlug);
    const isDrawing = subStep.startsWith("drawing");

    if (subStep === "setup") {
      currentTitle = {
        global: formattedType || "Lighting Project",
        stage: "Setup",
        substage: null,
      };
    } else {
      const stepLabelMap = {
        initial: "Initial",
        pole: "Pole",
        opening: "Opening",
        baseplate: "Baseplate",
        foundation: "Foundation",
        report: "Report",
        "drawing/drawing-setup": "Drawing Setup",
        "drawing/pole": "Pole",
        "drawing/opening": "Opening",
        "drawing/baseplate": "Baseplate",
        "drawing/foundation": "Foundation",
        "drawing/coupling": "Coupling",
        "drawing/surface": "Surface",
      };

      currentTitle = {
        global: formattedType || "Lighting Project",
        stage: isDrawing ? "Drawing" : "Calculations",
        substage:
          stepLabelMap[subStep] ||
          (subStep.charAt(0).toUpperCase() + subStep.slice(1)),
      };
    }
  } else if (requestDetailId) {
    const request = getRequest(requestDetailId);
    currentTitle = {
      global: (request && requestNoOf(request)) || "Project Detail",
      stage: null,
      substage: null,
    };
  } else if (isCalculationRoot) {
    currentTitle =
      MENU_ITEMS.find((item) => item.path === "/projects")?.name ??
      "My Works";
  } else if (isCheckingQueue) {
    currentTitle = "Checking Queue";
  } else if (isNewRequest) {
    // Read project type directly from the URL — single source of truth.
    // /projects/new/:type → parts[2] is the type slug.
    const urlParts = location.pathname.split("/").filter(Boolean);
    const typeSlug = urlParts[2]; // exists only on the form page, e.g. /projects/new/lighting-project
    const formattedTypeFromUrl = typeSlug ? formatProjectType(typeSlug) : null;
    if (formattedTypeFromUrl) {
      // Projects > New Project > Lighting Project
      currentTitle = {
        global: "New Project",
        stage: formattedTypeFromUrl,
        substage: null,
      };
    } else {
      // Projects > New Project
      currentTitle = { global: "New Project", stage: null, substage: null };
    }
  } else if (
    (location.pathname.startsWith("/projects") || location.pathname.startsWith("/requests")) &&
    formattedProjectType
  ) {
    let substage = null;
    if (location.pathname.includes("/drawing")) {
      // "Drawing Setup" and "Pole" read fine on their own; the rest keep
      // the "Drawing · " prefix to disambiguate from the Calculation
      // flow's same-named steps (e.g. "Drawing · Opening" vs. Calculation's
      // "Opening").
      const drawingSegments = {
        "drawing-setup": "Drawing Setup",
        pole: "Pole",
        opening: "Opening",
        baseplate: "Baseplate",
        foundation: "Foundation",
        coupling: "Coupling",
        surface: "Surface",
      };
      const drawingMatch = Object.keys(drawingSegments).find((k) =>
        location.pathname.includes(`/drawing/${k}`),
      );
      substage = drawingMatch ? drawingSegments[drawingMatch] : "Drawing";
    } else if (
      location.pathname.includes("/initial") ||
      location.pathname.includes("/calculation-condition")
    ) {
      substage = "Initial";
    } else if (location.pathname.includes("/pole")) {
      substage = "Pole";
    } else if (location.pathname.includes("/opening")) {
      substage = "Opening";
    } else if (location.pathname.includes("/baseplate")) {
      substage = "Baseplate";
    } else if (location.pathname.includes("/foundation")) {
      substage = "Foundation";
    } else if (
      location.pathname.includes("/report") ||
      location.pathname.includes("/result")
    ) {
      substage = "Report";
    }

    // A case: Projects > [Request No.] > Case 001 > [step]; any other
    // draft: Projects > [Project Type] > Project Setup > [step].
    currentTitle = draftCase
      ? {
        global: requestNoOf(draftCase.request) || "Project",
        stage: `Case ${draftCase.case.no}`,
        substage: substage ?? "Initial",
      }
      : {
        global: formattedProjectType,
        stage: "Initial",
        substage,
      };
  } else {
    currentTitle =
      MENU_ITEMS.find((item) => location.pathname.startsWith(item.path))
        ?.name ?? "Page Not Found";
  }

  // Navigate out of the calculation area (from the logo or the header
  // breadcrumb). If we're inside a draft with unsaved changes, ask first via
  // DraftActionModal (Save / Don't Save / Cancel); otherwise leave straight
  // away, clearing the working session behind us.
  const leaveCalculation = (target) => {
    const parts = location.pathname.split("/").filter(Boolean);
    // /projects/:type/:draftId[/...] → parts[1] = type, parts[2] = draftId
    const inDraft =
      (parts[0] === "projects" || parts[0] === "requests") &&
      !!parts[1] &&
      !!parts[2];

    if (inDraft) {
      const ptype = parts[1];
      const draftId = parts[2];
      if (hasDraftChanged(ptype, draftId)) {
        setDraftPrompt({ ptype, draftId, target });
        return;
      }
      // No unsaved changes — tidy up the working session and go.
      try {
        clearCalculationSession(ptype);
        clearActiveDraftId(ptype);
      } catch {
        // Best-effort — never block navigation on cleanup failure.
      }
    }
    leaveNewRequest(target);
  };

  // Resolves the "save this draft?" prompt. `action` is "save" | "discard" |
  // "cancel". In every non-cancel case the working session is cleared and the
  // active draft id removed *before* navigating, so the next draft opened
  // (DraftSessionGuard's handleSessionTransition) doesn't re-save what the
  // user just discarded.
  const resolveDraftPrompt = (action) => {
    const prompt = draftPrompt;
    setDraftPrompt(null);
    if (!prompt || action === "cancel") return;
    try {
      if (action === "save") {
        saveWorkingSessionToDraft(prompt.ptype, prompt.draftId);
      }
      clearCalculationSession(prompt.ptype);
      clearActiveDraftId(prompt.ptype);
    } catch {
      // Best-effort — never trap the user on a save failure.
    }
    navigate(prompt.target);
  };

  // Logo → default page (project tools).
  const handleLogoClick = () => leaveCalculation("/project-tools");

  // Header breadcrumb — context-aware:
  // • New-project flow: "Projects" crumb → the project list.
  // • A draft: the Request No. crumb → that case's project.
  const handleProjectCrumbClick = () => {
    if (isNewRequest) {
      leaveNewRequest("/projects");
      return;
    }
    leaveCalculation(requestPathForDraft(draftId));
  };

  // • New-project flow: "New Project" crumb → the type-picker page.
  // • Calculation workflow: stage crumb → Project Setup of the current draft.
  const handleSetupCrumbClick = () => {
    if (isNewRequest) {
      leaveNewRequest("/projects/new");
      return;
    }
    if (isProjectTools && projectToolsMatch) {
      const typeSlug = projectToolsMatch[1];
      const isDrawing = (projectToolsMatch[2] || "").startsWith("drawing");
      navigate(
        isDrawing
          ? `/project-tools/${typeSlug}/drawing/drawing-setup`
          : `/project-tools/${typeSlug}/initial`
      );
      return;
    }
    const parts = location.pathname.split("/").filter(Boolean);
    if (
      (parts[0] === "projects" || parts[0] === "requests") &&
      parts[1] &&
      parts[2]
    ) {
      const ptype = parts[1];
      const draftId = parts[2];
      const rawWorkflow = sessionStorage.getItem(`${ptype}_workflow`);
      const workflow = rawWorkflow ? JSON.parse(rawWorkflow) : {};
      const target =
        workflow.projectMode === "drawing"
          ? `/projects/${ptype}/${draftId}/drawing/drawing-setup`
          : `/projects/${ptype}/${draftId}/initial`;
      navigate(target);
    }
  };

  // Remember where the user is inside Projects & Project Tools, for the sidebar link below.
  useEffect(() => {
    const fullPath = location.pathname + location.search;
    rememberRequestsPath(fullPath);
    rememberProjectToolsPath(fullPath);
  }, [location.pathname, location.search]);

  // Returns nav path. Projects / Project Tools: back to where the user last was in it;
  // without that, default page.
  const getMenuPath = (path) => {
    if (path === "/project-tools") {
      const lastTools = lastProjectToolsPath();
      if (lastTools) return lastTools;
      return "/project-tools";
    }

    const isProjMenu = path === "/projects" || path === "/requests";
    const lastPath = isProjMenu ? lastRequestsPath() : null;
    if (lastPath) return lastPath;
    if (isProjMenu && projectType) {
      const activeDraftId = sessionStorage.getItem(
        `${projectType}_active_draft_id`,
      );
      return activeDraftId
        ? `/projects/${projectType}/${activeDraftId}`
        : "/projects";
    }
    return path;
  };

  // Load user session on mount. sessionStorage is scoped to a single tab —
  // opening a new tab loses the cached profile even though the refresh
  // token cookie (and therefore the session) is still valid. When that
  // happens, re-fetch the profile from /me instead of showing a bare
  // "User" placeholder.
  useEffect(() => {
    const cachedUser = getUser();

    if (cachedUser) {
      setUserData(cachedUser);
      return;
    }

    if (isAuthenticated()) {
      getMe()
        .then((user) => {
          setUser(user);
          setUserData(user);
        })
        .catch(() => {
          // Refresh token turned out to be invalid too — the axios
          // interceptor already clears the session and redirects to
          // /login on this failure, nothing more to do here.
        });
    }
  }, []);

  // Prefetch master data (materials, region codes, ...) as soon as any
  // authenticated page mounts, instead of waiting for a calculation form to
  // ask for it. getMasterData() already caches in sessionStorage and dedupes
  // concurrent callers, so this just moves the ~3s gateway round-trip earlier
  // — by the time a form needs it, it's likely already sitting in cache.
  useEffect(() => {
    getMasterData().catch(() => { });
    getMasterDesignStandards().catch(() => { });
    getMasterRegions().catch(() => { });
    // Coupling master data lives deep in the drawing flow — prefetch it now so
    // it's cached well before the user reaches the coupling page.
    getCouplingMasterData().catch(() => { });
  }, []);

  // Close mobile sidebar and reset scroll position on route change
  useEffect(() => {
    setIsMobileOpen(false);
    resetScrollDirection();
    // Use timeout to ensure DOM has updated before scrolling
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      resetScrollDirection();
    }, 10);
  }, [location.pathname]);

  // Sync isMobile state with window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setIsMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Invalidates the session server-side, clears local session data, and
  // redirects to login. Local session is cleared even if the API call
  // fails, so a flaky network never traps the user in a logged-in state.
  const handleLogout = () => {
    // Clear local session immediately and navigate — don't wait for the
    // server-side invalidation call so the UI feels instant regardless of
    // API latency. The refresh token expires on its own if the call fails.
    clearAuthSession();
    sessionStorage.removeItem("projectType");
    clearNewRequestDraft();
    forgetRequestsPath();
    forgetProjectToolsPath();
    navigate("/login");

    // Fire-and-forget: invalidate token server-side in background.
    logoutUser().catch(() => { });
  };
  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Logout confirmation modal */}
      <LogoutModal
        open={showLogoutModal}
        loading={false}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />

      {/* "Save this draft?" prompt — shown when leaving a draft with unsaved
          changes via the logo or the header breadcrumb. */}
      <DraftActionModal
        open={!!draftPrompt}
        onClose={() => resolveDraftPrompt("cancel")}
        onSave={() => resolveDraftPrompt("save")}
        onDiscard={() => resolveDraftPrompt("discard")}
      />

      {/* "Leave this request?" — logo / breadcrumb out of the New Request
          form while it has entries. */}
      <ConfirmResetAllModal {...leaveNewRequestProps} />

      {/* Mobile sidebar — slide-in overlay */}
      {isMobile && (
        <MobileSidebar
          isOpen={isMobileOpen}
          onClose={() => setIsMobileOpen(false)}
          onLogoClick={handleLogoClick}
          getMenuPath={getMenuPath}
          userRole={userData?.role}
        />
      )}

      {/* Desktop sidebar — sticky, collapsible */}
      {!isMobile && (
        <DesktopSidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          onLogoClick={handleLogoClick}
          getMenuPath={getMenuPath}
          userRole={userData?.role}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <Header
          isMobile={isMobile}
          currentTitle={currentTitle}
          rootLabel={isProjectTools ? "Project Tools" : "My Works"}
          userData={userData}
          onRootCrumbClick={
            isProjectTools
              ? () => navigate("/project-tools")
              : isNewRequest
                ? () => leaveNewRequest("/projects")
                : () => leaveCalculation("/projects")
          }
          onProjectCrumbClick={
            isProjectTools
              ? () => {
                  if (projectToolsMatch) {
                    navigate(`/project-tools/${projectToolsMatch[1]}/setup`);
                  } else {
                    navigate("/project-tools");
                  }
                }
              : handleProjectCrumbClick
          }
          onSetupCrumbClick={handleSetupCrumbClick}
          onOpenMobileSidebar={() => setIsMobileOpen(true)}
          onLogout={() => {
            setShowLogoutModal(true);
          }}
        />


        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">
          <ErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <ScrollToTopButton />
    </div>
  );
}
