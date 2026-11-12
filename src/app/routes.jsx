// src/app/routes.jsx
import { Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";

// Helper component to redirect draft index directly to calculation or drawing step
function DraftIndexRedirect() {
  const { type, draftId } = useParams();
  const rawWorkflow = sessionStorage.getItem(`${type}_workflow`);
  const workflow = rawWorkflow ? JSON.parse(rawWorkflow) : {};
  const isDrawing = workflow.projectMode === "drawing";
  const target = isDrawing
    ? `/projects/${type}/${draftId}/drawing/drawing-setup`
    : `/projects/${type}/${draftId}/initial`;
  return <Navigate to={target} replace />;
}

// Redirect legacy /requests/* paths to /projects/*
function RequestsRedirect() {
  const location = useLocation();
  const target = location.pathname.replace(/^\/requests/, "/projects");
  return <Navigate to={target + location.search} replace />;
}

// Import Shared/Layout
import Layout from "../shared/components/layout/Layout";
import ProtectedRoute from "../routes/ProtectedRoute";
import ScrollToTop from "../shared/components/ScroolTop";

// Import Pages (Sesuaikan path folder barumu)
import LoginPage from "../pages/LoginPage";
import RequestListPage from "../features/calculations/pages/RequestListPage";
import ProjectSelectPage from "../features/calculations/pages/ProjectSelect";
import NewRequestFormPage from "../features/calculations/pages/NewRequestFormPage";
import RequestDetailPage from "../features/calculations/pages/RequestDetailPage";
import InitialInputPage from "../features/calculations/pages/InitialInputPage";
import DrawingGeneralPage from "../features/calculations/pages/drawing/DrawingGeneralPage";
import DrawingPolePage from "../features/calculations/pages/drawing/DrawingPolePage";
import DrawingOpeningPage from "../features/calculations/pages/drawing/DrawingOpeningPage";
import DrawingCouplingPage from "../features/calculations/pages/drawing/DrawingCouplingPage";
import DrawingBaseplatePage from "../features/calculations/pages/drawing/DrawingBaseplatePage";
import DrawingFoundationPage from "../features/calculations/pages/drawing/DrawingFoundationPage";
import DrawingSurfacePage from "../features/calculations/pages/drawing/DrawingSurfacePage";
import ReportPage from "../features/report/pages/ReportPage";
import ProjectDatabasePage from "../features/database/pages/ProjectDatabasePage";
import CheckingQueuePage from "../features/calculations/pages/CheckingQueuePage";
import MySubmissionsPage from "../features/calculations/pages/MySubmissionsPage";
import ProjectToolsPage from "../features/calculations/pages/ProjectToolsPage";
import NotFoundPage from "../pages/NotFoundPage";

// Admin Pages
import SuperAdminDashboard from "../features/admin/pages/SuperAdminDashboard";
import DepartmentManagement from "../features/admin/pages/DepartmentManagement";
import UserManagement from "../features/admin/pages/UserManagement";

// Detail Input Steps
import PoleFormPage from "../features/calculations/pages/steps/PoleStep";
import OpeningFormPage from "../features/calculations/pages/steps/OpeningStep";
import BaseplateFormPage from "../features/calculations/pages/steps/BaseplateStep";
import FoundationFormPage from "../features/calculations/pages/steps/FoundationStep";

// Guards
import TypeGuard from "../features/calculations/guards/TypeGuard";
import SessionGuard from "../features/calculations/guards/SessionGuard";
import DraftSessionGuard from "../features/calculations/guards/DraftSessionGuard";
import RoleGuard from "../routes/RoleGuard";

export default function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* PUBLIC */}
        <Route path="/login" element={<LoginPage />} />

        {/* PROTECTED AREA */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            {/* Redirect old /calculation/* links to /projects */}
            <Route
              path="calculation"
              element={<Navigate to="/projects" replace />}
            />
            <Route
              path="calculation/*"
              element={<Navigate to="/projects" replace />}
            />

            {/* Redirect old /requests and /requests/* links to /projects/* */}
            <Route
              path="requests"
              element={<Navigate to="/projects" replace />}
            />
            <Route
              path="requests/*"
              element={<RequestsRedirect />}
            />

            {/* ── PROJECTS (main section) ──────────────────────── */}
            <Route path="projects">
              <Route index element={<RequestListPage />} />
              {/* New project flow: pick type → fill form.
                  Static "new" wins over :type below. */}
              <Route path="new" element={<ProjectSelectPage />} />
              <Route path="new/:type" element={<NewRequestFormPage />} />
              {/* After the form: the project's summary, assignment, cases
                  and files. Static "detail" wins over :type too. */}
              <Route path="edit/:requestId" element={<NewRequestFormPage />} />
              <Route path="detail/:requestId" element={<RequestDetailPage />} />

              {/* Dynamic Path with Multi-Guards */}
              <Route path=":type" element={<TypeGuard />}>
                <Route element={<SessionGuard />}>
                  {/* No drafts list: a draft is opened from its case on
                      the Project Detail page. */}
                  <Route index element={<Navigate to="/projects" replace />} />
                  <Route path=":draftId" element={<DraftSessionGuard />}>
                    <Route index element={<DraftIndexRedirect />} />
                    <Route
                      path="initial"
                      element={<InitialInputPage />}
                    />
                    <Route
                      path="calculation-condition"
                      element={<Navigate to="../initial" replace />}
                    />
                    <Route
                      path="drawing"
                      element={<Navigate to="drawing-setup" replace />}
                    />
                    <Route
                      path="drawing/drawing-setup"
                      element={<DrawingGeneralPage />}
                    />
                    <Route path="drawing/pole" element={<DrawingPolePage />} />
                    <Route
                      path="drawing/opening"
                      element={<DrawingOpeningPage />}
                    />
                    <Route
                      path="drawing/baseplate"
                      element={<DrawingBaseplatePage />}
                    />
                    <Route
                      path="drawing/foundation"
                      element={<DrawingFoundationPage />}
                    />
                    <Route
                      path="drawing/coupling"
                      element={<DrawingCouplingPage />}
                    />
                    <Route
                      path="drawing/surface"
                      element={<DrawingSurfacePage />}
                    />
                    <Route path="pole" element={<PoleFormPage />} />
                    <Route path="opening" element={<OpeningFormPage />} />
                    <Route path="baseplate" element={<BaseplateFormPage />} />
                    <Route path="foundation" element={<FoundationFormPage />} />
                    <Route path="report" element={<ReportPage />} />
                  </Route>
                </Route>
              </Route>
            </Route>

            <Route path="report" element={<Navigate to="/projects" replace />} />
            <Route path="submissions" element={<MySubmissionsPage />} />
            <Route path="project-tools" element={<ProjectToolsPage />} />
            <Route path="database" element={<ProjectDatabasePage />} />

            {/* Checking Queue (Drafter Checkers & Admins) */}
            <Route
              path="checking-queue"
              element={
                <RoleGuard
                  allowedRoles={[
                    "superadmin",
                    "admin",
                    "drafter_checker",
                    "admin_department",
                  ]}
                />
              }
            >
              <Route index element={<CheckingQueuePage />} />
            </Route>

            {/* Super Admin Routes */}
            <Route
              path="superadmin"
              element={<RoleGuard allowedRoles={["superadmin"]} />}
            >
              <Route path="dashboard" element={<SuperAdminDashboard />} />
              <Route path="departments" element={<DepartmentManagement />} />
              <Route path="users" element={<UserManagement />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>
          </Route>

          {/* Global Redirects & 404 (Protected) */}
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}
