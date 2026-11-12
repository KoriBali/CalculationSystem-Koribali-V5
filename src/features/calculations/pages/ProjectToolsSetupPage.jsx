import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  ArrowLeft,
  RotateCcw,
  ChevronRight,
  Calculator,
  PenTool,
  Boxes,
  Sliders,
  Settings,
} from "lucide-react";
import { projectTypeLabel } from "../constants/projectTypes";
import { ConfirmResetAllModal } from "../components/modals/ConfirmResetAllModal";
import { ToastModal } from "../components/modals/ToastModal";

// Reusable section title with left accent bar (matching ConditionForm)
const SectionTitle = ({ children }) => (
  <h3 className="text-[#0d3b66] mb-4 flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium">
    <div className="w-1 h-4 md:h-5 bg-[#3399cc] rounded-full" />
    {children}
  </h3>
);

// Reusable section card wrapper (matching ConditionForm)
const SectionCard = ({ children }) => (
  <div className="bg-white px-4 md:px-5 py-5 rounded-xl hp:rounded-lg border border-gray-200">
    {children}
  </div>
);

// Selectable option card matching ConditionForm ToggleCard style & wireframe radio indicator
function SelectOptionCard({ label, icon, selected, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className={`relative overflow-hidden rounded-lg border px-3 xl:px-4 py-2.5 lg:py-3 transition-all duration-300 cursor-pointer ${
        selected
          ? "border-blue-500 bg-white shadow-sm ring-1 ring-blue-50"
          : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className={`p-1.5 rounded-md transition-colors ${
              selected ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
            }`}
          >
            {icon}
          </div>
          {/* Label */}
          <p
            className={`text-[12px] md:text-sm font-medium ${
              selected ? "text-slate-900 font-semibold" : "text-slate-500"
            }`}
          >
            {label}
          </p>
        </div>

        {/* Circular radio indicator */}
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
            selected ? "border-blue-600 bg-white" : "border-slate-300 bg-white"
          }`}
        >
          {selected && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
        </div>
      </div>
    </div>
  );
}

export default function ProjectToolsSetupPage() {
  const navigate = useNavigate();
  const { type: projectType = "lighting-project" } = useParams();

  const storageKey = `projectTools_setup_${projectType}`;

  // Work Type: "calculation" | "drawing"
  const [workType, setWorkType] = useState(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.workType) return parsed.workType;
      }
    } catch {
      // ignore
    }
    return "calculation";
  });

  // Design Type: "standard" | "custom"
  const [designType, setDesignType] = useState(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.designType) return parsed.designType;
      }
    } catch {
      // ignore
    }
    return "standard";
  });

  const [showResetModal, setShowResetModal] = useState(false);
  const [toast, setToast] = useState(null);

  // Auto-sync selection changes to sessionStorage
  useEffect(() => {
    try {
      const payload = {
        projectType,
        workType,
        designType,
        updatedAt: new Date().toISOString(),
      };
      sessionStorage.setItem(storageKey, JSON.stringify(payload));
      sessionStorage.setItem("projectType", projectType);
      sessionStorage.setItem("projectMode", workType);
      sessionStorage.setItem(
        `${projectType}_workflow`,
        JSON.stringify({ projectMode: workType, withReport: false })
      );
      sessionStorage.setItem(
        `${projectType}_condition`,
        JSON.stringify({
          poleType: designType,
          openingEnabled: designType === "standard",
          baseplateEnabled: designType === "standard",
          foundationEnabled: false,
        })
      );
    } catch (err) {
      console.warn("Failed to persist setup in sessionStorage:", err);
    }
  }, [projectType, workType, designType, storageKey]);

  const handleReset = () => {
    setWorkType("calculation");
    setDesignType("standard");
    setShowResetModal(false);
    setToast({
      type: "success",
      title: "Reset Successful",
      message: "Setup options have been restored to default values.",
    });
  };

  const handleNextInitial = () => {
    try {
      sessionStorage.setItem("projectType", projectType);
      sessionStorage.setItem("projectMode", workType);
      sessionStorage.setItem(
        `${projectType}_workflow`,
        JSON.stringify({ projectMode: workType, withReport: false })
      );
      sessionStorage.setItem(
        `${projectType}_condition`,
        JSON.stringify({
          poleType: designType,
          openingEnabled: designType === "standard",
          baseplateEnabled: designType === "standard",
          foundationEnabled: false,
        })
      );

      setToast({
        type: "success",
        title: "Setup Saved",
        message: `Saved: ${workType === "calculation" ? "Calculation" : "Drawing"} · ${
          designType === "standard" ? "Standard Type" : "Custom Type"
        }. Session storage ready.`,
      });
    } catch (err) {
      console.error("Failed to save setup:", err);
    }
  };

  const projectTitle = projectTypeLabel(projectType);

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <Helmet>
        <title>Setup — {projectTitle} · Project Tools</title>
      </Helmet>

      {/* ─── TOP HEADER CALCULATION STYLE BAR ─────────────────────────── */}
      <div className="w-full max-w-[1440px] mx-auto px-2 pt-2 sm:pt-4">
        {/* Blue Header Card */}
        <div className="rounded-xl bg-gradient-to-r from-[#0d3b66] to-[#1a5a92] shadow-sm px-3 py-3 sm:px-4 sm:py-4 md:px-6 2xl:px-8 flex flex-col gap-3 sm:gap-4 sm:rounded-t-2xl sm:rounded-b-none">
          <div className="flex items-center justify-between gap-2 sm:gap-3 w-full">
            {/* Back Button */}
            <div className="flex-1 flex justify-start">
              <button
                type="button"
                onClick={() => navigate("/project-tools")}
                className="flex items-center justify-center gap-1.5 sm:gap-2 min-w-0 max-w-full text-white px-3 py-2 sm:px-4 rounded-lg hp:rounded-md text-xs sm:text-sm font-medium border border-white/20 hover:bg-white/10 active:bg-white/15 transition"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span className="truncate">Back to project type</span>
              </button>
            </div>

            {/* Stepper info */}
            <div className="text-right">
              <span className="text-xs text-white/80 font-medium">
                {projectTitle}
              </span>
            </div>
          </div>
        </div>

        {/* Attached White Stepper Bar */}
        <div className="hidden sm:block bg-white border border-slate-200 border-t-0 rounded-b-2xl sm:px-4 sm:py-2 md:px-6 2xl:px-8 shadow-sm">
          <div className="flex items-center gap-2 py-1.5">
            <div className="flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold bg-[#0d3b66] text-white shadow-xs">
              <Settings className="w-3.5 h-3.5" />
              <span>Setup</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
            <div className="flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium text-slate-400">
              <span>Initial</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── FORM CONTAINER (matching Initial form ConditionForm) ─────── */}
      <div className="w-full max-w-[1440px] mx-auto pt-6 pb-24 sm:pb-8 px-2">
        <div className="bg-white rounded-2xl hp:rounded-xl border border-gray-200 shadow-[0_2px_10px_rgba(15,23,42,0.06)] overflow-hidden">
          {/* Top accent strip */}
          <div
            aria-hidden="true"
            className="h-1.5 bg-gradient-to-r from-[#0d3b66] to-[#3399cc]"
          />

          <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            {/* ── Work Type Section ── */}
            <div>
              <SectionTitle>Work Type</SectionTitle>
              <SectionCard>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 xl:gap-6">
                  <SelectOptionCard
                    label="Calculation"
                    icon={<Calculator size={16} />}
                    selected={workType === "calculation"}
                    onSelect={() => setWorkType("calculation")}
                  />
                  <SelectOptionCard
                    label="Drawing"
                    icon={<PenTool size={16} />}
                    selected={workType === "drawing"}
                    onSelect={() => setWorkType("drawing")}
                  />
                </div>
              </SectionCard>
            </div>

            {/* ── Design Type Section ── */}
            <div>
              <SectionTitle>Design Type</SectionTitle>
              <SectionCard>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 xl:gap-6">
                  <SelectOptionCard
                    label="Standard Type"
                    icon={<Boxes size={16} />}
                    selected={designType === "standard"}
                    onSelect={() => setDesignType("standard")}
                  />
                  <SelectOptionCard
                    label="Custom Type"
                    icon={<Sliders size={16} />}
                    selected={designType === "custom"}
                    onSelect={() => setDesignType("custom")}
                  />
                </div>
              </SectionCard>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Footer buttons */}
            <div className="flex justify-between items-center pt-4 md:pt-0">
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 md:px-6 rounded-lg hp:rounded-md bg-white text-red-500 font-medium text-xs md:text-sm hover:bg-red-50 hover:text-red-600 transition-colors border border-red-300"
              >
                <RotateCcw className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
                Reset
              </button>

              <button
                type="button"
                onClick={handleNextInitial}
                className="flex justify-center items-center gap-2 px-5 py-2.5 md:px-6 rounded-lg hp:rounded-md font-medium bg-gradient-to-r from-[#0d3b66] to-[#3399cc] text-white text-xs md:text-sm hover:brightness-110 shadow-sm transition-all"
              >
                Next: Initial
                <ChevronRight className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Reset Modal */}
      <ConfirmResetAllModal
        open={showResetModal}
        onClose={() => setShowResetModal(false)}
        onReset={handleReset}
        title="Reset Setup?"
        description="Are you sure you want to reset setup choices to default values?"
      />

      <ToastModal toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
