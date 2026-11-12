import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  ArrowLeft,
  RotateCcw,
  ChevronRight,
  Check,
  Calculator,
  PenTool,
  Boxes,
  Sliders,
} from "lucide-react";
import { projectTypeLabel } from "../constants/projectTypes";
import { ToastModal } from "../components/modals/ToastModal";

export default function ProjectToolsSetupPage() {
  const navigate = useNavigate();
  const { type: projectType = "lighting-project" } = useParams();

  // Storage key for setup persistence in session storage
  const storageKey = `projectTools_setup_${projectType}`;

  // Work Type: "calculation" | "drawing"
  // Design Type: "standard" | "custom"
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

      // Align with standard workflow/condition session keys
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
    setToast({
      type: "success",
      title: "Reset Successful",
      message: "Setup options have been restored to default values.",
    });
  };

  const handleNextInitial = () => {
    try {
      // Finalise session storage setup
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
        message: `Setup completed (${workType === "calculation" ? "Calculation" : "Drawing"} · ${designType === "standard" ? "Standard Type" : "Custom Type"}). Session storage is ready.`,
      });
    } catch (err) {
      console.error("Failed to complete setup:", err);
    }
  };

  const projectTitle = projectTypeLabel(projectType);

  return (
    <div className="min-h-full flex flex-col">
      <Helmet>
        <title>Setup — {projectTitle} · Project Tools</title>
      </Helmet>

      {/* Top Banner: Back to project type */}
      <div className="w-full max-w-[1440px] mx-auto px-2 sm:px-4 mb-4 sm:mb-6">
        <div className="bg-[#0d3b66] rounded-xl px-4 py-3 text-white flex items-center justify-between shadow-xs">
          <button
            type="button"
            onClick={() => navigate("/project-tools")}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-white hover:text-white/80 bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to project type
          </button>
          <span className="text-xs text-white/70 hidden sm:inline font-medium">
            {projectTitle}
          </span>
        </div>
      </div>

      {/* Form Card (matching style & sizing of ConditionForm / Initial form page) */}
      <div className="w-full max-w-[1440px] mx-auto px-2 sm:px-4 pb-12">
        <div className="bg-white rounded-2xl hp:rounded-xl border border-gray-200 shadow-[0_2px_10px_rgba(15,23,42,0.06)] overflow-hidden">
          {/* Top accent gradient strip */}
          <div
            aria-hidden="true"
            className="h-1.5 bg-gradient-to-r from-[#0d3b66] to-[#3399cc]"
          />

          <div className="p-5 sm:p-7 md:p-8 space-y-6 md:space-y-8">
            {/* ── Section 1: Work Type ── */}
            <div>
              <h3 className="text-[#0d3b66] mb-3 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-semibold">
                <div className="w-1 h-4 md:h-5 bg-[#3399cc] rounded-full" />
                Work Type
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Calculation */}
                <button
                  type="button"
                  onClick={() => setWorkType("calculation")}
                  className={`
                    relative w-full flex items-center justify-between p-4 sm:p-5 rounded-xl border transition-all text-left
                    ${
                      workType === "calculation"
                        ? "border-blue-500 bg-blue-50/25 ring-1 ring-blue-500 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                        w-9 h-9 rounded-lg flex items-center justify-center transition-colors
                        ${
                          workType === "calculation"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-500"
                        }
                      `}
                    >
                      <Calculator className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-sm sm:text-base font-semibold text-slate-800">
                      Calculation
                    </span>
                  </div>

                  {/* Circular radio indicator */}
                  <div
                    className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0
                      ${
                        workType === "calculation"
                          ? "border-blue-600 bg-white"
                          : "border-slate-300 bg-white"
                      }
                    `}
                  >
                    {workType === "calculation" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    )}
                  </div>
                </button>

                {/* Drawing */}
                <button
                  type="button"
                  onClick={() => setWorkType("drawing")}
                  className={`
                    relative w-full flex items-center justify-between p-4 sm:p-5 rounded-xl border transition-all text-left
                    ${
                      workType === "drawing"
                        ? "border-blue-500 bg-blue-50/25 ring-1 ring-blue-500 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                        w-9 h-9 rounded-lg flex items-center justify-center transition-colors
                        ${
                          workType === "drawing"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-500"
                        }
                      `}
                    >
                      <PenTool className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-sm sm:text-base font-semibold text-slate-800">
                      Drawing
                    </span>
                  </div>

                  {/* Circular radio indicator */}
                  <div
                    className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0
                      ${
                        workType === "drawing"
                          ? "border-blue-600 bg-white"
                          : "border-slate-300 bg-white"
                      }
                    `}
                  >
                    {workType === "drawing" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* ── Section 2: Design Type ── */}
            <div>
              <h3 className="text-[#0d3b66] mb-3 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-semibold">
                <div className="w-1 h-4 md:h-5 bg-[#3399cc] rounded-full" />
                Design Type
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Standard Type */}
                <button
                  type="button"
                  onClick={() => setDesignType("standard")}
                  className={`
                    relative w-full flex items-center justify-between p-4 sm:p-5 rounded-xl border transition-all text-left
                    ${
                      designType === "standard"
                        ? "border-blue-500 bg-blue-50/25 ring-1 ring-blue-500 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                        w-9 h-9 rounded-lg flex items-center justify-center transition-colors
                        ${
                          designType === "standard"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-500"
                        }
                      `}
                    >
                      <Boxes className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-sm sm:text-base font-semibold text-slate-800">
                      Standard Type
                    </span>
                  </div>

                  <div
                    className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0
                      ${
                        designType === "standard"
                          ? "border-blue-600 bg-white"
                          : "border-slate-300 bg-white"
                      }
                    `}
                  >
                    {designType === "standard" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    )}
                  </div>
                </button>

                {/* Custom Type */}
                <button
                  type="button"
                  onClick={() => setDesignType("custom")}
                  className={`
                    relative w-full flex items-center justify-between p-4 sm:p-5 rounded-xl border transition-all text-left
                    ${
                      designType === "custom"
                        ? "border-blue-500 bg-blue-50/25 ring-1 ring-blue-500 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                        w-9 h-9 rounded-lg flex items-center justify-center transition-colors
                        ${
                          designType === "custom"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-500"
                        }
                      `}
                    >
                      <Sliders className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-sm sm:text-base font-semibold text-slate-800">
                      Custom Type
                    </span>
                  </div>

                  <div
                    className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0
                      ${
                        designType === "custom"
                          ? "border-blue-600 bg-white"
                          : "border-slate-300 bg-white"
                      }
                    `}
                  >
                    {designType === "custom" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 pt-2" />

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 px-5 py-2.5 md:px-6 rounded-lg hp:rounded-md bg-white text-red-500 font-medium text-xs md:text-sm hover:bg-red-50 hover:text-red-600 transition-colors border border-red-300"
              >
                <RotateCcw className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
                Reset
              </button>

              <button
                type="button"
                onClick={handleNextInitial}
                className="flex items-center gap-2 px-6 py-2.5 md:px-7 rounded-lg hp:rounded-md font-medium bg-gradient-to-r from-[#0d3b66] to-[#3399cc] text-white text-xs md:text-sm hover:brightness-110 shadow-sm transition-all"
              >
                Next: Initial
                <ChevronRight className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ToastModal toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
