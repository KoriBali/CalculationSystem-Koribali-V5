import React from "react";
import { SendHorizontal, FileEdit, ChevronRight, FileText } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { isProjectComplete, clearSmartPreserveWarning, saveCalculationSnapshot } from "../../utils/coreLogic";
import { PaintBucket } from "lucide-react";

export function FinishCalculationModal({ open, onClose, onSaveDraft, onSaveDatabase, onGenerateReport, isDrawingMode = false }) {
  const { type: projectType, draftId } = useParams();
  const navigate = useNavigate();
  if (!open) return null;

  const projectComplete = isProjectComplete(projectType);
  const isReadOnly = sessionStorage.getItem("case_read_only") === "true";
  
  const rawWorkflow = sessionStorage.getItem(`${projectType}_workflow`);
  const workflow = rawWorkflow ? JSON.parse(rawWorkflow) : {};
  const isBothMode = workflow.projectMode === "both";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md sm:max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0d3b66] to-[#1a5a92] px-5 py-4 sm:px-8 sm:py-5">
          <h2 className="text-white font-bold text-base sm:text-lg">
            Finish Calculation
          </h2>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-8 space-y-3 sm:space-y-4">
          <p className="text-slate-600 text-sm sm:text-base mb-1 sm:mb-2">
            Calculation completed. What would you like to do next?
          </p>

          {!isDrawingMode && isBothMode && (
            <button
              onClick={() => {
                clearSmartPreserveWarning(projectType);
                saveCalculationSnapshot(projectType);
                sessionStorage.setItem(`${projectType}_drawing_started`, "true");
                navigate(`/projects/${projectType}/${draftId}/drawing/drawing-setup`);
              }}
              className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-blue-200 bg-blue-50/30 hover:border-blue-500 hover:bg-blue-100 transition-all text-left group cursor-pointer"
            >
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 text-white rounded-lg flex items-center justify-center shadow-sm">
                <PaintBucket className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-blue-800 text-sm">
                  Proceed to Drawing
                </h3>
                <p className="text-[11px] sm:text-xs text-blue-600 mt-0.5 leading-snug">
                  Start generating CAD drawings based on this calculation.
                </p>
              </div>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>
          )}

          <button
            onClick={onGenerateReport}
            className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left group cursor-pointer"
          >
            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
              {isDrawingMode ? (
                <FileEdit className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">
                  {isDrawingMode ? "Preview Drawing Output" : "Preview Report First"}
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-200/60 shrink-0">
                  Auto-saves draft
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-snug">
                {isDrawingMode
                  ? "Preview AutoCAD drawing output. Automatically saves your progress to draft."
                  : "Preview results in PDF report format. Automatically saves calculation to draft."}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
          </button>

          {!isReadOnly ? (
            <>
              <button
                onClick={projectComplete ? onSaveDatabase : undefined}
                disabled={!projectComplete}
                className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all text-left group
                  ${projectComplete 
                    ? "border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer" 
                    : "border-slate-100 bg-slate-50 cursor-not-allowed opacity-80"
                  }`}
              >
                <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-colors duration-300
                  ${projectComplete 
                    ? "bg-blue-50 text-blue-600 group-hover:bg-blue-500 group-hover:text-white" 
                    : "bg-slate-200 text-slate-400"
                  }`}
                >
                  <SendHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold text-sm transition-colors ${projectComplete ? "text-slate-800 group-hover:text-blue-700" : "text-slate-500"}`}>
                    Save & Submit for Check
                  </h3>
                  <p className={`text-[11px] sm:text-xs mt-0.5 leading-snug ${projectComplete ? "text-slate-500" : "text-red-500 font-medium"}`}>
                    {projectComplete 
                      ? "Save all calculations permanently and hand over to the checker for review."
                      : "Please complete all calculation and drawing steps before submitting."}
                  </p>
                </div>
                <ChevronRight className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-colors ${projectComplete ? "text-slate-400 group-hover:text-blue-500" : "text-slate-300"}`} />
              </button>

              <button
                onClick={onSaveDraft}
                className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left group cursor-pointer"
              >
                <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                  <FileEdit className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">
                    Save as Draft
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-snug">
                    Keep it as a draft to edit later.
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
              </button>
            </>
          ) : (
            <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800 leading-relaxed text-center">
              You are currently viewing this case in <span className="font-semibold">Read-Only mode</span>. Changes cannot be saved or submitted.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-4 sm:px-8 sm:py-5 border-t border-slate-100 flex justify-center">
          <button
            onClick={onClose}
            className="px-8 sm:px-10 py-2 sm:py-2.5 rounded-lg font-semibold text-sm text-slate-600 border border-slate-300 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
