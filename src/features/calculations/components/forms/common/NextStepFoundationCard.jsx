import React, { useState, useEffect } from "react";
import { CheckCircle, Circle, ChevronRight, FileText } from "lucide-react";
import { notifyCalculationProgressChanged } from "../../../utils/calculationProgressEvent";

/**
 * NextStepFoundationCard
 *
 * In Standard Pole mode, Additional Components is removed from the Initial tab.
 * Instead, at the final step before foundation (either Opening for Embedment,
 * or Baseplate for Baseplate installation), once calculation is complete,
 * this card presents the user with the choice to either:
 *  1. Continue to Foundation Design (adds the Foundation step and navigates to it)
 *  2. Finish Without Foundation (directly completes calculation and triggers report)
 */
export function NextStepFoundationCard({
  parentType = "baseplate", // "baseplate" | "opening"
  projectType = "lighting-project",
  isCalculated = false,
  onProceedToFoundation,
  onFinishWithoutFoundation,
  initialOption = null,
  isReadOnly = false,
}) {
  const storageKey = `${projectType}_foundation_step_choice`;

  const [selectedOption, setSelectedOption] = useState(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved === "foundation" || saved === "finish") return saved;
    } catch {}
    return initialOption;
  });

  useEffect(() => {
    if (initialOption && !selectedOption) {
      setSelectedOption(initialOption);
      try {
        sessionStorage.setItem(storageKey, initialOption);
      } catch {}
    }
  }, [initialOption, selectedOption, storageKey]);

  if (!isCalculated && !isReadOnly) {
    return null;
  }

  const handleSelectOption = (opt) => {
    setSelectedOption(opt);
    try {
      sessionStorage.setItem(storageKey, opt);

      const raw = sessionStorage.getItem(`${projectType}_condition`);
      const prev = raw ? JSON.parse(raw) : {};
      const next = { ...prev, foundationEnabled: opt === "foundation" };
      sessionStorage.setItem(`${projectType}_condition`, JSON.stringify(next));

      const rawConfig = sessionStorage.getItem(`${projectType}_calculation_config`);
      const prevConfig = rawConfig ? JSON.parse(rawConfig) : {};
      sessionStorage.setItem(
        `${projectType}_calculation_config`,
        JSON.stringify({ ...prevConfig, foundation: opt === "foundation" })
      );

      notifyCalculationProgressChanged();
    } catch (e) {
      console.warn("Failed to update foundation choice:", e);
    }
  };

  const isBaseplate = parentType === "baseplate";

  const questionText = isBaseplate
    ? "Would you like to design the Foundation for this baseplate, or finish now?"
    : "Would you like to design the Foundation for this pole, or finish now?";

  const foundationDesc = isBaseplate
    ? "Proceed to the Foundations step to design the foundation that supports this baseplate."
    : "Proceed to the Foundations step to design the foundation that supports this pole.";

  const finishDesc = isBaseplate
    ? "Complete this case now with the baseplate design only. No foundation calculation will be added."
    : "Complete this case now with the pole design only. No foundation calculation will be added.";

  const handleAction = () => {
    if (selectedOption === "foundation") {
      try {
        sessionStorage.setItem(storageKey, "foundation");
      } catch {}
      onProceedToFoundation?.();
    } else if (selectedOption === "finish") {
      try {
        sessionStorage.setItem(storageKey, "finish");
      } catch {}
      onFinishWithoutFoundation?.();
    }
  };

  return (
    <div className="mt-8">
      {/* ── Section Title (Identical style to Opening / Baseplate Specifications) ── */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[#0d3b66] flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium">
          <div className="w-1 h-4 md:h-5 bg-[#3399cc] rounded-full" />
          Next Step
        </h3>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          Calculation complete
        </span>
      </div>

      {/* ── White Card Container ── */}
      <div className="bg-white rounded-2xl hp:rounded-xl border border-gray-200 shadow-[0_2px_10px_rgba(15,23,42,0.06)] p-4 sm:p-6 space-y-4">
        {/* Subtitle / Question */}
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          {questionText}
        </p>

        {/* Two Radio Option Cards (with check icon matching Pole Type selector on the right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Option 1: Continue to Foundation Design */}
          <button
            type="button"
            onClick={() => handleSelectOption("foundation")}
            className={`group w-full text-left flex items-center justify-between px-6 py-4 rounded-xl border transition-all duration-200 cursor-pointer
              ${selectedOption === "foundation"
                ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
          >
            <div className="space-y-1 pr-3 min-w-0">
              <h4
                className={`text-xs md:text-sm font-medium leading-snug ${selectedOption === "foundation"
                  ? "text-slate-900"
                  : "text-slate-700"
                  }`}
              >
                Continue to Foundation Design
              </h4>
              <p className="text-[13px] text-slate-500 leading-relaxed">
                {foundationDesc}
              </p>
            </div>
            <div className="shrink-0 ml-2 flex items-center">
              {selectedOption === "foundation" ? (
                <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
              ) : (
                <Circle className="w-4 h-4 md:w-5 md:h-5 text-slate-300 group-hover:text-slate-400" />
              )}
            </div>
          </button>

          {/* Option 2: Finish Without Foundation */}
          <button
            type="button"
            onClick={() => handleSelectOption("finish")}
            className={`group w-full text-left flex items-center justify-between px-6 py-4 rounded-xl border transition-all duration-200 cursor-pointer
              ${selectedOption === "finish"
                ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
          >
            <div className="space-y-1 pr-3 min-w-0">
              <h4
                className={`text-xs md:text-sm font-medium leading-snug ${selectedOption === "finish"
                  ? "text-slate-900"
                  : "text-slate-700"
                  }`}
              >
                Finish Without Foundation
              </h4>
              <p className="text-[13px] text-slate-500 leading-relaxed">
                {finishDesc}
              </p>
            </div>
            <div className="shrink-0 ml-2 flex items-center">
              {selectedOption === "finish" ? (
                <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
              ) : (
                <Circle className="w-4 h-4 md:w-5 md:h-5 text-slate-300 group-hover:text-slate-400" />
              )}
            </div>
          </button>
        </div>

        {/* Bottom bar with action button aligned on the right (decluttered without extra text) */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          {selectedOption === "foundation" ? (
            <button
              type="button"
              onClick={handleAction}
              className="inline-flex justify-center items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm bg-gradient-to-r from-[#0d3b66] to-[#3399cc] text-white hover:brightness-110 shadow-sm transition-all cursor-pointer"
            >
              Next: Foundation
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : selectedOption === "finish" ? (
            <button
              type="button"
              onClick={handleAction}
              className="inline-flex justify-center items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm bg-gradient-to-r from-[#0d3b66] to-[#3399cc] text-white hover:brightness-110 shadow-sm transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Generate Report
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex justify-center items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
