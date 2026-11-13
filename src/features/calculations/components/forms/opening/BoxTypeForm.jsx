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

// Renders a red error message below an invalid field
const ErrorStyle = ({ show, text }) =>
  show ? (
    <div className="absolute left-0 -bottom-4 md:-bottom-5 flex items-center gap-1 text-[9px] md:text-[11px] text-red-500">
      <span>*{text}</span>
    </div>
  ) : null;

/**
 * MAIN COMPONENT: BoxTypeForm
 */
export function BoxTypeForm({
  boxType,
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
      boxWidth: "",
      opWidth: "",
      boxHeight: "",
      opSurfaceHeight: "",
      opLength: "",
      openingDirection: "",
    });
  };

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-[0_1px_6px_rgba(15,23,42,0.04)] border border-gray-200">
      {/* Wrapper TOP + BOTTOM jadi satu row di lg */}
      <div className="flex justify-center pb-8 pt-12 sm:pt-8 xl:pt-12">
        <div className="flex flex-col gap-12 2xl:flex-row 2xl:items-center 2xl:gap-8">
          {/* ================= TOP SECTION ================= */}
          <div className="flex justify-start sm:justify-end ml-[19px] sm:ml-0 sm:mr-[40px] xl:mr-0 relative">
            {/* Di bawah sm pakai gambar (12), sm ke atas pakai (11) */}
            <img
              src="/images/box-op-top-view-v2 (12).svg"
              alt="Top View"
              className="block sm:hidden h-[450px]"
            />
            <img
              src="/images/box-op-top-view-v2 (11).svg"
              alt="Top View"
              className="hidden sm:block w-full sm:h-[290px] xl:h-[320px] 2xl:h-[350px]"
            />

            {/* Box Height — tengah atas */}
            <div className="absolute top-[224px] sm:top-4 xl:top-5 2xl:top-6 left-[246px] sm:left-[57%] xl:left-[56%] xl:left-[55%] 2xl:left-[58%] -translate-x-1/2">
              <label className="block text-xs md:text-sm text-gray-700 mb-1">
                Box Thickness <span className="text-red-500 ml-1 font-semibold">*</span>
              </label>
              <div className="relative w-fit">
                <input
                  id="boxHeight"
                  type="number"
                  min={0}
                  value={boxType.boxHeight}
                  onChange={(e) => onUpdate({ boxHeight: e.target.value })}
                  onWheel={(e) => e.target.blur()}
                  title={errors.boxHeight || undefined}
                  className={`${inputStyle(errors.boxHeight)} pr-6 sm:pr-9 xl:pr-9 w-[100px] sm:w-[120px] xl:w-[140px]`}
                />
                <FieldErrorHint message={errors.boxHeight} />
                <span className="absolute right-2 sm:right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                  mm
                </span>
              </div>
            </div>

            {/* Box Width — tengah kiri */}
            <div className="absolute -top-1 sm:top-[62%] xl:top-[61%] -translate-y-1/2 left-[48px] sm:left-[5px] xl:left-[64px] 2xl:-left-14">
              <label className="block text-xs md:text-sm text-gray-700 mb-1">
                Box Width <span className="text-red-500 ml-1 font-semibold">*</span>
              </label>
              <div className="relative">
                <input
                  id="boxWidth"
                  type="number"
                  min={0}
                  value={boxType.boxWidth}
                  onChange={(e) => onUpdate({ boxWidth: e.target.value })}
                  onWheel={(e) => e.target.blur()}
                  title={errors.boxWidth || undefined}
                  className={`${inputStyle(errors.boxWidth)} pr-6 sm:pr-9 xl:pr-9 w-[100px] sm:w-[120px] xl:w-[140px]`}
                />
                <FieldErrorHint message={errors.boxWidth} />
                <span className="absolute right-2 sm:right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                  mm
                </span>
              </div>
            </div>

            {/* Opening Width — tengah tengah */}
            <div className="absolute top-[27.6%] sm:top-[62%] xl:top-[61%] left-[95px] sm:left-[34%] xl:left-[37%] 2xl:left-[30%] -translate-x-1/2 -translate-y-1/2">
              <label className="block text-xs md:text-sm text-gray-700 mb-1">
                Cut Width <span className="text-red-500 ml-1 font-semibold">*</span>
              </label>
              <div className="relative w-fit">
                <input
                  id="opWidth"
                  type="number"
                  min={0}
                  value={boxType.opWidth}
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
          <div className="flex flex-row gap-1 justify-end items-center sm:ml-[240px] xl:ml-[309px] 2xl:ml-0 px-0 xl:px-6">
            {/* Left Side Inputs Container */}
            <div className="flex flex-col gap-4 sm:gap-6 w-[100px] sm:w-[120px] xl:w-[140px]">
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
                    value={boxType.opSurfaceHeight}
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
                      value={boxType.openingDirection || ""}
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
                src="/images/op-side-view-v2.svg"
                alt="Side View"
                className="h-[250px] sm:h-[320px] 2xl:h-[350px] object-contain"
              />
            </div>

            {/* 3. Opening Length Input */}
            <div className="relative mt-[150px] w-[100px] sm:w-[120px] xl:w-[140px]">
              <label className="block text-xs md:text-sm text-gray-700 mb-1">
                Opening Center Height <span className="text-red-500 ml-1 font-semibold">*</span>
              </label>
              <div className="relative">
                <input
                  id="opLength"
                  type="number"
                  min={0}
                  value={boxType.opLength}
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
