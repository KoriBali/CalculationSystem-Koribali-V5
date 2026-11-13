import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle,
  Circle,
  Calculator,
  PenTool,
  Layers,
  Sliders,
} from "lucide-react";
import { projectTypeLabel } from "../constants/projectTypes";
import { ConfirmResetAllModal } from "../components/modals/ConfirmResetAllModal";

// Reusable section title with left accent bar
const SectionTitle = ({ children }) => (
  <h3 className="text-[#0d3b66] mb-4 flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium">
    <div className="w-1 h-4 md:h-5 bg-[#3399cc] rounded-full" />
    {children}
  </h3>
);

// Reusable section card wrapper
const SectionCard = ({ children }) => (
  <div className="bg-white px-4 md:px-5 py-5 rounded-xl hp:rounded-lg border border-gray-200">
    {children}
  </div>
);

// CardOption matching the user's reference code
const CardOption = ({ label, desc, icon: Icon, current, value, onChange }) => {
  const isActive = current === value;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`group w-full flex items-center justify-between px-3 xl:px-4 py-2.5 lg:py-3 relative overflow-hidden rounded-lg border transition-all duration-300 cursor-pointer active:scale-[0.98] ${isActive
          ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-50"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
        }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-1.5 rounded-md ${isActive
              ? "bg-blue-100 text-blue-600"
              : "bg-slate-100 text-slate-500"
            }`}
        >
          <Icon size={16} />
        </div>
        <div className="flex flex-col items-start text-left">
          <p
            className={`text-[12px] md:text-sm font-medium ${isActive ? "text-slate-900" : "text-slate-700"
              }`}
          >
            {label}
          </p>
          <p
            className={`text-[11px] md:text-xs mt-0.5 ${isActive ? "text-slate-500" : "text-slate-400"
              }`}
          >
            {desc}
          </p>
        </div>
      </div>
      <div className="shrink-0 ml-2 flex items-center">
        {isActive ? (
          <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
        ) : (
          <Circle className="w-4 h-4 md:w-5 md:h-5 text-slate-300 group-hover:text-slate-400" />
        )}
      </div>
    </button>
  );
};

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
          designStandard: "jil",
          designWindSpeed: 60,
          designAirDensity: 1.225,
          poleType: designType,
          openingEnabled: true,
          baseplateEnabled: true,
          foundationEnabled: false,
        })
      );
      sessionStorage.setItem(
        `${projectType}_calculation_config`,
        JSON.stringify({
          pole: true,
          opening: true,
          baseplate: true,
          foundation: false,
        })
      );
    } catch (err) {
      console.warn("Failed to persist setup in sessionStorage:", err);
    }
  }, [projectType, workType, designType, storageKey]);

  const handleReset = () => {
    setWorkType("calculation");
    setDesignType("standard");
    const keysToRemove = [
      "drawing_general",
      "drawing_pole",
      "drawing_opening",
      "drawing_baseplate",
      "drawing_foundation",
      "drawing_coupling",
      "drawing_surface",
      "drawing_completed",
      "drawing_pole_completed",
      "drawing_opening_completed",
      "drawing_baseplate_completed",
      "drawing_foundation_completed",
      "drawing_coupling_completed",
      "drawing_coupling_confirmed",
      "drawing_started",
      "poles",
      "poleConfig",
      "directObjects",
      "arms",
      "overheadWires",
      "results",
      "resultsDo",
      "resultsArm",
      "resultsOhw",
      "calculatedOp",
      "calculatedBaseplate",
      "calculatedFoundation",
      "isCalculatedPole",
      "isCalculatedOp",
      "isCalculatedBp",
      "isCalculatedFd",
      "cover",
      "reportSnapshot",
      "hasReport",
    ];
    keysToRemove.forEach((k) => {
      sessionStorage.removeItem(`${projectType}_${k}`);
    });
    setShowResetModal(false);
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
          designStandard: "jil",
          designWindSpeed: 60,
          designAirDensity: 1.225,
          poleType: designType,
          openingEnabled: true,
          baseplateEnabled: true,
          foundationEnabled: false,
        })
      );
      sessionStorage.setItem(
        `${projectType}_calculation_config`,
        JSON.stringify({
          pole: true,
          opening: true,
          baseplate: true,
          foundation: false,
        })
      );

      if (workType === "drawing") {
        navigate(`/project-tools/${projectType}/drawing/drawing-setup`);
      } else {
        navigate(`/project-tools/${projectType}/initial`);
      }
    } catch (err) {
      console.error("Failed to save setup:", err);
    }
  };

  const projectTitle = projectTypeLabel(projectType);

  return (
    <div className="flex flex-col h-full">
      <Helmet>
        <title>Setup — {projectTitle} · Project Tools</title>
      </Helmet>

      <div className="w-full max-w-[1440px] mx-auto pt-0 pb-24 sm:pb-8 px-2 space-y-6 md:space-y-8">
        {/* ─── TOP BLUE BANNER (Clean single block without white tabs) ─── */}
        <div className="rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#0d3b66] to-[#1a5a92] shadow-sm px-3 py-3 sm:px-4 sm:py-4 md:px-6 2xl:px-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/project-tools")}
            className="flex items-center justify-center gap-1.5 sm:gap-2 min-w-0 max-w-full text-white px-3 py-2 sm:px-4 rounded-lg hp:rounded-md text-xs sm:text-sm font-medium border border-white/20 hover:bg-white/10 active:bg-white/15 transition shadow-xs"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" />
            <span className="truncate">Back to project type</span>
          </button>

          <span className="text-xs sm:text-sm text-white/80 font-medium hidden sm:inline">
            {projectTitle}
          </span>
        </div>

        {/* ─── FORM CONTAINER ─── */}
        <div className="bg-white rounded-2xl hp:rounded-xl border border-slate-200 shadow-[0_2px_10px_rgba(15,23,42,0.06)] overflow-hidden">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CardOption
                    label="Calculation"
                    desc="Structural integrity, wind load, and stress analysis"
                    icon={Calculator}
                    value="calculation"
                    current={workType}
                    onChange={setWorkType}
                  />
                  <CardOption
                    label="Drawing"
                    desc="CAD technical drawings and structural drafting"
                    icon={PenTool}
                    value="drawing"
                    current={workType}
                    onChange={setWorkType}
                  />
                </div>
              </SectionCard>
            </div>

            {/* ── Design Type Section ── */}
            <div>
              <SectionTitle>Design Type</SectionTitle>
              <SectionCard>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CardOption
                    label="Standard Type"
                    desc="Use predefined specifications."
                    icon={Layers}
                    value="standard"
                    current={designType}
                    onChange={setDesignType}
                  />
                  <CardOption
                    label="Custom Type"
                    desc="Define your own specifications."
                    icon={Sliders}
                    value="custom"
                    current={designType}
                    onChange={setDesignType}
                  />
                </div>
              </SectionCard>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Footer Buttons */}
            <div className="flex justify-between items-center pt-4 md:pt-0">
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 md:px-6 rounded-lg hp:rounded-md bg-white text-red-500 font-medium text-xs md:text-sm hover:bg-red-50 hover:text-red-600 transition-colors border border-red-300 shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
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
        title="Reset all inputs on this section?"
        description="This will clear all inputs entered in this section. This action cannot be undone."
      />
    </div>
  );
}
