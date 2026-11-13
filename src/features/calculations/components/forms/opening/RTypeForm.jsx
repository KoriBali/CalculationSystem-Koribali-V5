import { RotateCcw, ChevronRight, ChevronLeft, Calculator, Lock } from "lucide-react";
import { FieldErrorHint } from "../../../../../shared/components/FieldErrorHint";
import { FormSelect } from "../../../../../shared/components/FormSelect";
import { useState } from "react";
import { ConfirmResetAllModal } from "../../modals/ConfirmResetAllModal";

const OPENING_DIRECTION_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "front", label: "Front" },
  { value: "right", label: "Right" },
  { value: "back", label: "Back" },
];

/**
 * HELPER COMPONENTS & FUNCTIONS
 */
const inputStyle = (hasError) =>
  `px-2 sm:px-3 xl:px-4 py-2 lg:py-2.5 rounded-lg hp:rounded-md outline-none transition-all text-xs md:text-sm border
  ${
    hasError
      ? "border-red-500 bg-[#fff5f5] ring-1 ring-red-200"
      : "border-gray-300 bg-white focus:border-[#3399cc] focus:ring-1 focus:ring-[#3399cc]"
  }`;

const ErrorStyle = ({ show, text }) =>
  show ? (
    <div className="absolute left-0 -bottom-4 md:-bottom-5 flex items-center gap-1 text-[9px] md:text-[11px] text-red-500">
      <span>*{text}</span>
    </div>
  ) : null;

/**
 * MAIN COMPONENT: RTypeForm
 */
export function RTypeForm({
  rType,
  onUpdate,
  errors,
  onCalculate,
  onBack,
  onNext,
  isCalculated,
  buttonLabel,
  isCalculationAndDrawing = false,
  readOnly = false,
  hideNextButton = false,
}) {
  const [showResetModal, setShowResetModal] = useState(false);

  const handleReset = () => {
    if (readOnly) return;
    onUpdate({
      opWidth: "",
      opSurfaceHeight: "",
      opLength: "",
      openingDirection: "",
    });
  };

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-[0_1px_6px_rgba(15,23,42,0.04)] border border-gray-200">
      {/* Wrapper TOP + BOTTOM jadi satu row di 2xl */}
      <div className="flex justify-center pb-8 pt-8 xl:pt-12">
        <div className="flex flex-col gap-8 2xl:flex-row 2xl:items-center 2xl:gap-8">
          {/* ================= TOP SECTION ================= */}
          <div className="flex sm:pr-[146px] 2xl:pr-0 justify-start sm:justify-end relative">
            <img
              src="/images/RType-TopView (8).svg"
              alt="Top View"
              className="w-full h-[180px] sm:h-[260px]"
            />

            {/* Opening Width — tengah tengah */}
            <div className="absolute top-[50%] left-[20%] sm:left-[9%] 2xl:left-[14%] -translate-x-1/2 -translate-y-1/2">
              <label className="block text-xs md:text-sm text-gray-700 mb-1">
                Cut Width <span className="text-red-500 ml-1 font-semibold">*</span>
              </label>
              <div className="relative w-fit">
                <input
                  id="opWidth"
                  type="number"
                  min={0}
                  value={rType.opWidth}
                  onChange={(e) => onUpdate({ opWidth: e.target.value })}
                  onWheel={(e) => e.target.blur()}
                  title={errors.opWidth || undefined}
                  className={`${inputStyle(errors.opWidth)} pr-6 sm:pr-9 xl:pr-9 w-[100px] sm:w-[120px] xl:w-[140px]`}
                />
                <FieldErrorHint message={errors.opWidth} />
                <span className="absolute right-2 sm:right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                  mm
                </span>
              </div>
            </div>
          </div>

          {/* ================= BOTTOM SECTION ================= */}
          <div className="flex flex-row gap-1 sm:ml-[21px] 2xl:ml-0 justify-center items-center px-4 md:px-6">
            {/* Left Side Inputs Container */}
            <div className="flex flex-col gap-4 sm:gap-6 mb-[10px] sm:mb-[20px] w-[100px] sm:w-[120px] xl:w-[140px]">
              {/* 1. Opening Surface Height Input */}
              <div className="relative">
                <label className="block text-xs md:text-sm text-gray-700 mb-1">
                  Opening Cut Length <span className="text-red-500 ml-1 font-semibold">*</span>
                </label>
                <div className="relative">
                  <input
                    id="opSurfaceHeight"
                    type="number"
                    min={0}
                    value={rType.opSurfaceHeight}
                    onChange={(e) =>
                      onUpdate({ opSurfaceHeight: e.target.value })
                    }
                    onWheel={(e) => e.target.blur()}
                    title={errors.opSurfaceHeight || undefined}
                    className={`${inputStyle(errors.opSurfaceHeight)} pr-6 sm:pr-9 xl:pr-9 w-full`}
                  />
                  <FieldErrorHint message={errors.opSurfaceHeight} />
                  <span className="absolute right-2 sm:right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                    mm
                  </span>
                </div>
              </div>

              {/* Opening Direction (only in Calculation & Drawing mode) */}
              {isCalculationAndDrawing && (
                <div className="relative">
                  <label className="block text-xs md:text-sm text-gray-700 mb-1 whitespace-nowrap">
                    Opening Direction <span className="text-red-500 ml-1 font-semibold">*</span>
                  </label>
                  <div className="relative">
                    <FormSelect
                      id="openingDirection"
                      value={rType.openingDirection || ""}
                      onChange={(val) =>
                        !readOnly && onUpdate({ openingDirection: val })
                      }
                      options={OPENING_DIRECTION_OPTIONS}
                      hasError={!!errors.openingDirection}
                      placeholder="Select"
                      disabled={readOnly}
                    />
                    <FieldErrorHint message={errors.openingDirection} />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Diagram: Side View */}
            <div className="flex items-center justify-center">
              <img
                src="/images/RType-SideView (1).svg"
                alt="Side View"
                className="h-full w-full sm:h-[330px] 2xl:h-[350px] object-contain"
              />
            </div>

            {/* 3. Opening Length Input */}
            <div className="relative mt-[80px] sm:mt-[150px] w-[100px] sm:w-[120px] xl:w-[140px]">
              <label className="block text-xs md:text-sm text-gray-700 mb-1">
                Opening Center Height <span className="text-red-500 ml-1 font-semibold">*</span>
              </label>
              <div className="relative">
                <input
                  id="opLength"
                  type="number"
                  min={0}
                  value={rType.opLength}
                  onChange={(e) => onUpdate({ opLength: e.target.value })}
                  onWheel={(e) => e.target.blur()}
                  title={errors.opLength || undefined}
                  className={`${inputStyle(errors.opLength)} pr-6 sm:pr-9 xl:pr-9 w-[100px] sm:w-[120px] xl:w-[140px]`}
                />
                <FieldErrorHint message={errors.opLength} />
                <span className="absolute right-2 sm:right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                  mm
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Divider line */}
      <div className="border-t mx-4 md:mx-6 border-gray-200"></div>

      {/* ================= FOOTER SECTION: ACTIONS ================= */}
      <div className="flex justify-between items-center pt-6 px-4 md:px-6 pb-6 xl:pb-6 hp:gap-2">
        {/* Back => returns to the previous step */}
        <button
          onClick={onBack}
          title="Back"
          className="flex justify-center items-center gap-2 px-5 py-2.5 hp:px-3 hp:py-2 md:px-6
            rounded-lg hp:rounded-md font-medium bg-[#eef2f6] hover:bg-[#e2e8f0] text-[#0d3b66] text-xs sm:text-sm
            ring-1 ring-inset ring-[#d0d7e2] hover:ring-[#b8c2d1] shadow-sm transition-colors"
        >
          <ChevronLeft className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
          <span className="hp:hidden">Back</span>
        </button>

        {/* Grouped form actions on the right: Reset, Calculate, Next */}
        <div className="flex items-center gap-4 hp:gap-2">
          {/* Reset button to clear all inputs (hidden in readOnly) */}
          {!readOnly && (
            <button
              onClick={() => setShowResetModal(true)}
              title="Reset"
              className="flex justify-center items-center gap-2 px-5 py-2.5 hp:px-3 hp:py-2 md:px-6
                rounded-lg hp:rounded-md font-medium bg-white hover:bg-red-50 text-red-500 hover:text-red-600 text-xs sm:text-sm
                border border-red-300 transition-colors"
            >
              <RotateCcw className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
              <span className="hp:hidden">Reset</span>
            </button>
          )}

          <div className="flex items-center gap-2 hp:gap-0">
            {/* Button to trigger calculations */}
            {readOnly ? (
              <button
                type="button"
                disabled
                title="Calculations are locked in Read-Only mode"
                className="flex justify-center items-center gap-2 px-5 py-2.5 sm:py-2 lg:py-2.5 hp:px-4 hp:py-2 md:px-6 rounded-lg hp:rounded-md font-medium text-sm bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed shadow-none"
              >
                <Lock className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
                <span className="hp:text-[11px] whitespace-nowrap">
                  {isCalculated ? "Results Locked" : "Calculation Locked"}
                </span>
              </button>
            ) : (
              <button
                onClick={onCalculate}
                className={`flex justify-center items-center gap-2 px-5 py-2.5 sm:py-2 lg:py-2.5 hp:px-4 hp:py-2 md:px-6
                    rounded-lg hp:rounded-md font-medium text-sm transition-all
                    ${
                      isCalculated
                        ? "bg-[#eef2f6] hover:bg-[#e2e8f0] text-[#0d3b66] ring-1 ring-inset ring-[#d0d7e2] hover:ring-[#b8c2d1] shadow-sm"
                        : "bg-gradient-to-r from-[#0d3b66] to-[#3399cc] text-white hover:brightness-110 shadow-sm"
                    }`}
              >
                <Calculator className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
                <span className="hp:text-[11px] whitespace-nowrap">
                  Calculate Results
                </span>
              </button>
            )}

            {/* Proceed to next step or report generation */}
            {!hideNextButton && (readOnly ? (
              <button
                onClick={onNext}
                title={buttonLabel}
                className="flex justify-center items-center gap-2 px-5 py-2.5 sm:py-2 lg:py-2.5 hp:px-3 hp:py-2 md:px-6
                  rounded-lg hp:rounded-md font-medium transition-all text-sm bg-gradient-to-r from-[#0d3b66] to-[#3399cc] text-white hover:brightness-110 shadow-sm"
              >
                <span className="hp:hidden">{buttonLabel}</span>
                <ChevronRight className="w-4 md:w-5 h-4 md:h-5 hp:w-4 hp:h-4" />
              </button>
            ) : (
              <button
                onClick={onNext}
                aria-disabled={!isCalculated}
                title={!isCalculated ? 'Click "Calculate Results" first' : buttonLabel}
                className={`flex justify-center items-center gap-2 px-5 py-2.5 sm:py-2 lg:py-2.5 hp:px-3 hp:py-2 md:px-6
                  rounded-lg hp:rounded-md font-medium transition-all text-sm
                  ${
                    !isCalculated
                      ? "bg-gray-100 text-gray-400 ring-1 ring-inset ring-gray-200 cursor-not-allowed shadow-none"
                      : "bg-gradient-to-r from-[#0d3b66] to-[#3399cc] text-white hover:brightness-110 shadow-sm"
                  }`}
              >
                <span className="hp:hidden">{buttonLabel}</span>
                <ChevronRight className="w-4 md:w-5 h-4 md:h-5 hp:w-4 hp:h-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

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
