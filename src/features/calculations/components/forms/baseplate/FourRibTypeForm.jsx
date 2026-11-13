import { RotateCcw, ChevronRight, ChevronLeft, Calculator, Lock } from "lucide-react";
import { FieldErrorHint } from "../../../../../shared/components/FieldErrorHint";
import { useState } from "react";
import { ConfirmResetAllModal } from "../../modals/ConfirmResetAllModal";

/**
 * Reusable Input Field Component
 * - Handles label, unit, error, and styling
 */
const InputField = ({
  label,
  value,
  onChange,
  error,
  unit = "mm",
  colSpan = "",
}) => {
  return (
    <div className={`relative ${colSpan}`}>
      <label className="block text-xs md:text-sm text-gray-700 mb-1 md:mb-3">
        {label}
      </label>

      <div className="relative w-fit">
        <input
          type="number"
          min={0}
          value={value}
          onChange={onChange}
          onWheel={(e) => e.target.blur()}
          className={`${inputStyle(error)} pr-12`}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-400">
          {unit}
        </span>
      </div>
    </div>
  );
};

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
 * MAIN COMPONENT: FourRibTypeForm
 */
export function FourRibTypeForm({
  fourRibType,
  onUpdate,
  errors,
  onCalculate,
  onBack,
  onNext,
  isCalculated,
  buttonLabel,
  readOnly = false,
  hideNextButton = false,
}) {
  const [showResetModal, setShowResetModal] = useState(false);

  // Clear all dimension input fields
  const handleReset = () => {
    if (readOnly) return;
    const emptyState = Object.keys(fourRibType).reduce((acc, key) => {
      acc[key] = "";
      return acc;
    }, {});
    onUpdate(emptyState);
  };

  // Helper to bind input change
  const handleChange = (field) => (e) => {
    onUpdate({ [field]: e.target.value });
  };

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-[0_1px_6px_rgba(15,23,42,0.04)] border border-gray-200">
      <div className="sm:p-4 md:p-6">
        <div className="flex justify-center items-center pt-3 sm:pl-[93px] xl:pl-0 xl:pt-0 xl:pr-0 2xl:pr-[245px]">
          {/* ================= TOP VIEW : SVG + POSITIONED INPUTS ================= */}
          <div className="relative">
            <img
              src="/images/4Rib-TopView (22).svg"
              alt="4 rib baseplate top view"
              className="w-[290px] sm:w-full h-[380px] xl:h-[450px] 2xl:h-[450px] object-contain"
            />

            {/* Baseplate Width (EW) — top center */}
            <div className="absolute top-12 sm:top-0 xl:top-2 left-[52.6%] sm:left-[51.3%] xl:left-[49.6%] -translate-x-1/2">
              <label className="block text-xs md:text-sm text-gray-700 mb-1">
                Baseplate Width <span className="text-red-500 ml-1 font-semibold">*</span>
              </label>
              <div className="relative w-fit">
                <input
                  id="bpWidthEW"
                  type="number"
                  min={0}
                  value={fourRibType.bpWidthEW}
                  onChange={handleChange("bpWidthEW")}
                  onWheel={(e) => e.target.blur()}
                  title={errors.bpWidthEW || undefined}
                  className={`${inputStyle(errors.bpWidthEW)} pr-6 sm:pr-9 xl:pr-9 w-[100px] sm:w-[120px] xl:w-[140px]`}
                />
                <FieldErrorHint message={errors.bpWidthEW} />
                <span className="absolute right-2 sm:right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                  mm
                </span>
              </div>
            </div>

            {/* Anchor Pitch (EW) — below Baseplate Width (EW) */}
            <div className="absolute top-[110px] sm:top-[23%] xl:top-[24%] left-[49.6%] -translate-x-1/2">
              <label className="block text-xs md:text-sm text-gray-700 mb-1">
                Anchor Pitch <span className="text-red-500 ml-1 font-semibold">*</span>
              </label>
              <div className="relative w-fit">
                <input
                  id="anchorPitchEW"
                  type="number"
                  min={0}
                  value={fourRibType.anchorPitchEW}
                  onChange={handleChange("anchorPitchEW")}
                  onWheel={(e) => e.target.blur()}
                  title={errors.anchorPitchEW || undefined}
                  className={`${inputStyle(errors.anchorPitchEW)} pr-6 sm:pr-9 xl:pr-9 w-[100px] sm:w-[120px] xl:w-[140px]`}
                />
                <FieldErrorHint message={errors.anchorPitchEW} />
                <span className="absolute right-2 sm:right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                  mm
                </span>
              </div>
            </div>

            {/* Baseplate Width (NS) — middle left edge */}
            <div className="hidden absolute top-[71%] -translate-y-1/2 -left-10 xl:-left-12">
              <label className="block text-xs md:text-sm text-gray-700 mb-1">
                Baseplate Width (NS)
              </label>
              <div className="relative w-fit">
                <input
                  type="number"
                  min={0}
                  id="bpWidthNS"
                  value={fourRibType.bpWidthNS}
                  onChange={handleChange("bpWidthNS")}
                  onWheel={(e) => e.target.blur()}
                  title={errors.bpWidthNS || undefined}
                  className={`${inputStyle(errors.bpWidthNS)} pr-6 sm:pr-9 xl:pr-9 w-[100px] sm:w-[120px] xl:w-[140px]`}
                />
                <FieldErrorHint message={errors.bpWidthNS} />
                <span className="absolute right-2 sm:right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                  mm
                </span>
              </div>
            </div>

            {/* Anchor Pitch (NS) — to the right of Baseplate Width (NS) */}
            <div className="hidden absolute top-[71%] -translate-y-1/2 left-[20%] xl:left-[29%] -translate-x-1/2">
              <label className="block text-xs md:text-sm text-gray-700 mb-1">
                Anchor Pitch (NS)
              </label>
              <div className="relative w-fit">
                <input
                  type="number"
                  min={0}
                  id="anchorPitchNS"
                  value={fourRibType.anchorPitchNS}
                  onChange={handleChange("anchorPitchNS")}
                  onWheel={(e) => e.target.blur()}
                  title={errors.anchorPitchNS || undefined}
                  className={`${inputStyle(errors.anchorPitchNS)} pr-6 sm:pr-9 xl:pr-9 w-[100px] sm:w-[120px] xl:w-[140px]`}
                />
                <FieldErrorHint message={errors.anchorPitchNS} />
                <span className="absolute right-2 sm:right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                  mm
                </span>
              </div>
            </div>

            {/* Anchor Bolt Diameter + Number of Anchor Bolts side by side */}
            <div className="absolute top-[63%] sm:top-[73%] xl:top-[73.5%] 2xl:top-[73.5%] -translate-y-1/2 left-[35px] sm:left-[28px] xl:left-[18px] -translate-x-1/2 flex flex-col xl:flex-row gap-2 sm:gap-3 xl:gap-2">
              <div className="relative">
                <label className="w-[100px] sm:w-full block text-xs md:text-sm text-gray-700 mb-1">
                  Anchor Bolt Diameter <span className="text-red-500 ml-1 font-semibold">*</span>
                </label>
                <div className="relative w-fit">
                  <input
                    type="number"
                    min={0}
                    id="anchorDia"
                    value={fourRibType.anchorDia}
                    onChange={handleChange("anchorDia")}
                    onWheel={(e) => e.target.blur()}
                    title={errors.anchorDia || undefined}
                    className={`${inputStyle(errors.anchorDia)} pr-6 sm:pr-9 xl:pr-9 w-[90px] sm:w-[120px] xl:w-[140px]`}
                  />
                  <FieldErrorHint message={errors.anchorDia} />
                  <span className="absolute right-2 sm:right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                    mm
                  </span>
                </div>
              </div>

              <div className="hidden relative">
                <label className="w-[90px] sm:w-full block text-xs md:text-sm text-gray-700 mb-1">
                  Number of Anchor Bolts
                </label>
                <div className="relative w-fit">
                  <input
                    type="number"
                    min={0}
                    id="anchorCount"
                    value={fourRibType.anchorCount}
                    onChange={handleChange("anchorCount")}
                    onWheel={(e) => e.target.blur()}
                    title={errors.anchorCount || undefined}
                    className={`${inputStyle(errors.anchorCount)} pr-6 sm:pr-9 xl:pr-9 w-[90px] sm:w-[120px] xl:w-[140px]`}
                  />
                  <FieldErrorHint message={errors.anchorCount} />
                  <span className="absolute right-2 sm:right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                    pcs
                  </span>
                </div>
              </div>
            </div>

            {/* Number of Anchor Bolts on Tension Side — left aligned */}
            <div className="hidden absolute top-[232px] sm:top-[72%] xl:top-[72%] 2xl:top-[72%] -translate-y-1/2 -right-[59px] sm:-right-[148px] xl:-right-[300px] -translate-x-1/2">
              <label className="w-[90px] sm:w-[170px] xl:w-full block text-xs md:text-sm text-gray-700 mb-1">
                Number of Anchor Bolts on Tension Side
              </label>
              <div className="relative w-fit">
                <input
                  type="number"
                  min={0}
                  id="anchorCountTension"
                  value={fourRibType.anchorCountTension}
                  onChange={handleChange("anchorCountTension")}
                  onWheel={(e) => e.target.blur()}
                  title={errors.anchorCountTension || undefined}
                  className={`${inputStyle(errors.anchorCountTension)} pr-6 sm:pr-9 xl:pr-9 w-[90px] sm:w-[120px] xl:w-[140px]`}
                />
                <FieldErrorHint message={errors.anchorCountTension} />
                <span className="absolute right-2 sm:right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                  pcs
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main content grid: Inputs on the left, Diagrams on the right */}
        <div className="flex justify-center items-center flex-col 2xl:flex-row 2xl:gap-36 sm:pl-[12px] xl:pl-0 xl:pr-[96px] pr-[40px] sm:pr-0 2xl:pr-[75px]">
          {/* ================= SIDE VIEW : SVG/IMAGE + POSITIONED INPUTS ================= */}
          <div className="flex justify-center items-center pt-4 sm:pt-12">
            <div className="relative">
              <img
                src="/images/4Rib-SideView (3).svg"
                alt="4 rib baseplate side view"
                className="w-[300px] sm:w-full h-[180px] sm:h-[210px] xl:h-[250px] 2xl:h-[250px] object-contain"
              />

              {/* Baseplate Thickness */}
              <div className="absolute -bottom-6 sm:-bottom-1 xl:bottom-[4%] left-[3px] sm:-left-[66px] xl:-left-[76px]">
                <label className="block text-xs md:text-sm text-gray-700 mb-1">
                  Baseplate Thickness <span className="text-red-500 ml-1 font-semibold">*</span>
                </label>
                <div className="relative w-fit">
                  <input
                    type="number"
                    min={0}
                    id="bpThickness"
                    value={fourRibType.bpThickness}
                    onChange={handleChange("bpThickness")}
                    onWheel={(e) => e.target.blur()}
                    title={errors.bpThickness || undefined}
                    className={`${inputStyle(errors.bpThickness)} pr-6 sm:pr-9 xl:pr-9 w-[90px] sm:w-[120px] xl:w-[140px]`}
                  />
                  <FieldErrorHint message={errors.bpThickness} />
                  <span className="absolute right-2 sm:right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                    mm
                  </span>
                </div>
              </div>

              {/* Rib Plate Height */}
              <div className="absolute top-[41.5%] sm:top-[39%] xl:top-[40%] left-[3px] sm:left-12 2xl:left-12">
                <label className="block text-xs md:text-sm text-gray-700 mb-1">
                  Rib Plate Height <span className="text-red-500 ml-1 font-semibold">*</span>
                </label>
                <div className="relative w-fit">
                  <input
                    type="number"
                    min={0}
                    id="ribHeight"
                    value={fourRibType.ribHeight}
                    onChange={handleChange("ribHeight")}
                    onWheel={(e) => e.target.blur()}
                    title={errors.ribHeight || undefined}
                    className={`${inputStyle(errors.ribHeight)} pr-6 sm:pr-9 xl:pr-9 w-[90px] sm:w-[120px] xl:w-[140px]`}
                  />
                  <FieldErrorHint message={errors.ribHeight} />
                  <span className="absolute right-2 sm:right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                    mm
                  </span>
                </div>
              </div>

              {/* Weld Leg Length */}
              <div className="absolute top-2 sm:-top-3 xl:-top-1 -right-[38px] sm:-right-[52px] xl:-right-[65px] 2xl:-right-[65px]">
                <label className="block text-xs md:text-sm text-gray-700 mb-1">
                  Welding Length <span className="text-red-500 ml-1 font-semibold">*</span>
                </label>
                <div className="relative w-fit">
                  <input
                    type="number"
                    min={0}
                    id="weldLeg"
                    value={fourRibType.weldLeg}
                    onChange={handleChange("weldLeg")}
                    onWheel={(e) => e.target.blur()}
                    title={errors.weldLeg || undefined}
                    className={`${inputStyle(errors.weldLeg)} pr-6 sm:pr-9 xl:pr-9 w-[90px] sm:w-[120px] xl:w-[140px]`}
                  />
                  <FieldErrorHint message={errors.weldLeg} />
                  <span className="absolute right-2 sm:right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                    mm
                  </span>
                </div>
              </div>

              {/* Rib Plate Scallop */}
              <div className="absolute top-[74px] sm:top-[30%] xl:top-[34%] -right-[38px] sm:-right-[52px] xl:-right-[65px] 2xl:-right-[65px]">
                <label className="block text-xs md:text-sm text-gray-700 mb-1">
                  Rib Plate Scallop <span className="text-red-500 ml-1 font-semibold">*</span>
                </label>
                <div className="relative w-fit">
                  <input
                    type="number"
                    min={0}
                    id="ribScallop"
                    value={fourRibType.ribScallop}
                    onChange={handleChange("ribScallop")}
                    onWheel={(e) => e.target.blur()}
                    title={errors.ribScallop || undefined}
                    className={`${inputStyle(errors.ribScallop)} pr-6 sm:pr-9 xl:pr-9 w-[90px] sm:w-[120px] xl:w-[140px]`}
                  />
                  <FieldErrorHint message={errors.ribScallop} />
                  <span className="absolute right-2 sm:right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                    mm
                  </span>
                </div>
              </div>

              {/* Rib Plate Length */}
              <div className="hidden absolute -top-3 -right-24 -translate-x-1/2">
                <label className="block text-xs md:text-sm text-gray-700 mb-1">
                  Rib Plate Length
                </label>
                <div className="relative w-fit">
                  <input
                    type="number"
                    min={0}
                    id="ribLength"
                    value={fourRibType.ribLength}
                    onChange={handleChange("ribLength")}
                    onWheel={(e) => e.target.blur()}
                    title={errors.ribLength || undefined}
                    className={`${inputStyle(errors.ribLength)} pr-6 sm:pr-9 xl:pr-9 w-[100px] sm:w-[120px] xl:w-[140px]`}
                  />
                  <FieldErrorHint message={errors.ribLength} />
                  <span className="absolute right-2 sm:right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                    mm
                  </span>
                </div>
              </div>

              {/* Rib Plate Thickness */}
              <div className="hidden absolute top-[28%] -right-42 -translate-x-1/2">
                <label className="block text-xs md:text-sm text-gray-700 mb-1">
                  Rib Plate Thickness
                </label>
                <div className="relative w-fit">
                  <input
                    type="number"
                    min={0}
                    id="ribThickness"
                    value={fourRibType.ribThickness}
                    onChange={handleChange("ribThickness")}
                    onWheel={(e) => e.target.blur()}
                    title={errors.ribThickness || undefined}
                    className={`${inputStyle(errors.ribThickness)} pr-6 sm:pr-9 xl:pr-9 w-[100px] sm:w-[120px] xl:w-[140px]`}
                  />
                  <FieldErrorHint message={errors.ribThickness} />
                  <span className="absolute right-2 sm:right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                    mm
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ================= SECOND SIDE VIEW (For Rib Plate Length & Thickness) ================= */}
          <div className="flex justify-center items-center pt-24 pr-[18px] sm:pr-0 sm:pl-[290px] xl:pl-[345px] 2xl:pl-0 2xl:pt-2">
            <div className="relative">
              <img
                src="/images/4Rib-SideView (6).svg"
                alt="4 rib baseplate side view details"
                className="h-[160px] sm:h-[220px] xl:h-[250px] object-contain"
              />

              {/* Rib Plate Length (Class 'hidden' dihapus) */}
              <div className="absolute -top-[45px] sm:-top-[50px] -right-[35px] sm:-right-[46px] xl:-right-[52px] -translate-x-1/2">
                <label className="block text-xs md:text-sm text-gray-700 mb-1">
                  Rib Plate Length <span className="text-red-500 ml-1 font-semibold">*</span>
                </label>
                <div className="relative w-fit">
                  <input
                    type="number"
                    min={0}
                    value={fourRibType.ribLength}
                    onChange={handleChange("ribLength")}
                    onWheel={(e) => e.target.blur()}
                    title={errors.ribLength || undefined}
                    className={`${inputStyle(errors.ribLength)} pr-6 sm:pr-9 xl:pr-9 w-[90px] sm:w-[120px] xl:w-[140px]`}
                  />
                  <FieldErrorHint message={errors.ribLength} />
                  <span className="absolute right-2 sm:right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                    mm
                  </span>
                </div>
              </div>

              {/* Rib Plate Thickness (Class 'hidden' dihapus) */}
              {/* Catatan: -right-42 bukan ukuran bawaan Tailwind, pertimbangkan ganti ke -right-40 atau -right-[168px] */}
              <div className="absolute top-[10%] sm:top-[23%] xl:top-[16%] -right-[150px] sm:-right-[155px] xl:-right-[215px] -translate-x-1/2">
                <label className="block text-xs md:text-sm text-gray-700 mb-1">
                  Rib Plate Thickness <span className="text-red-500 ml-1 font-semibold">*</span>
                </label>
                <div className="relative w-fit">
                  <input
                    type="number"
                    min={0}
                    value={fourRibType.ribThickness}
                    onChange={handleChange("ribThickness")}
                    onWheel={(e) => e.target.blur()}
                    title={errors.ribThickness || undefined}
                    className={`${inputStyle(errors.ribThickness)} pr-6 sm:pr-9 xl:pr-9 w-[90px] sm:w-[120px] xl:w-[140px]`}
                  />
                  <FieldErrorHint message={errors.ribThickness} />
                  <span className="absolute right-2 sm:right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                    mm
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= FOOTER SECTION: ACTIONS ================= */}
        <div className="flex justify-between items-center mt-6 px-4 sm:px-0 pb-4 sm:pb-0 pt-4 md:pt-6 border-t border-gray-200 hp:gap-2">
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
