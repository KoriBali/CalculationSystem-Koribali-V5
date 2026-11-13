import { RotateCcw, Loader2, AlertCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { GROUND_POSITION_OPTIONS } from "../../../../constants/straightPoleStandardOptions";
import { getThicknessOptions } from "../../../../logic/pole/standard/straightPoleLogic";
import { usePoleStandardData } from "../../../../hooks/usePoleStandardData";
import { ConfirmResetAllModal } from "../../../modals/ConfirmResetAllModal";
import { FormSelect } from "../../../../../../shared/components/FormSelect";
import { AdaptiveGroundPositionInput } from "../common/AdaptiveGroundPositionInput";
import STANDARD_POLE_DATA from "../../../../data/specStandardPole.json";

// === IMAGES ===
const onGlImg = "/images/on-gl.svg";
const onGldImg = "/images/on-GL(h).svg";
const upperGlImg = "/images/upper-gl.svg";
const upperGldImg = "/images/upper-GL(h).svg";
const underGlImg = "/images/under-gl.svg";
const underGldImg = "/images/under-GL(h).svg";

// Maps ground position id to its diagram image
const groundPositionImageMap = {
  onGL: onGlImg,
  upperGL: upperGlImg,
  underGL: underGlImg,
};

const groundPositionImageMapD = {
  onGL: onGldImg,
  upperGL: upperGldImg,
  underGL: underGldImg,
};

// === HELPERS ===
// Returns input className based on validation state
const inputStyle = (hasError) =>
  `px-3 xl:px-4 py-2 lg:py-2.5 rounded-lg outline-none transition-all border text-sm pr-9
  ${hasError
    ? "border-red-500 bg-[#fff5f5] ring-1 ring-red-200"
    : "border-gray-300 bg-white focus:border-[#3399cc] focus:ring-1 focus:ring-[#3399cc]"
  } hp:pl-2 hp:rounded-md hp:text-xs`;

// Renders a red error message below an invalid field
const ErrorStyle = ({ show, text }) =>
  show ? (
    <div className="absolute left-0 -bottom-5 flex items-center gap-1 text-[11px] text-red-500 hp:text-[9px] hp:-bottom-4">
      <span>*{text}</span>
    </div>
  ) : null;

// Reusable section title with left accent bar
const SectionTitle = ({ children }) => (
  <h3 className="text-[#0d3b66] mb-4 flex items-center gap-2 text-sm font-medium hp:text-xs hp:gap-1">
    <div className="w-1 h-5 bg-[#3399cc] rounded-full hp:h-4" />
    {children}
  </h3>
);

// Placeholder shown when a prerequisite field hasn't been selected yet
const SelectFirst = ({ message }) => (
  <div className="border border-slate-200 rounded-lg hp:rounded-md px-5 py-2 lg:py-2.5 bg-slate-50 flex items-center">
    <p className="text-sm hp:text-xs text-slate-400">{message}</p>
  </div>
);

// Empty reset state — used when reset button is clicked
const EMPTY_STEPPED_POLE = {
  combinationGroup: "",
  combination: "",
  upperThickness: "",
  upperLength: "",
  lowerThickness: "",
  lowerLength: "",
  embedmentLength: "",
  groundPosition: "",
  lowestHeight: "",
};

// === COMPONENT ===
export function StraightPoleStandardForm({
  straightPoleStandard,
  onUpdate,
  errors,
  condition,
  readOnly = false,
}) {
  const {
    steppedPoleOptions,
    combinationGroups,
    combinations,
    tplMap,
    loading: poleStandardLoading,
    error: poleStandardError,
    refetch: refetchPoleStandard,
  } = usePoleStandardData();

  const [showResetModal, setShowResetModal] = useState(false);

  // Derive thickness options from selected combination
  const { upper: upperOptions, lower: lowerOptions } = getThicknessOptions(
    straightPoleStandard.combination,
    tplMap,
  );

  // Derive human-readable spec for the currently selected combination
  const selectedCombinationSpec = useMemo(() => {
    if (!straightPoleStandard.combination) return null;
    const pole =
      STANDARD_POLE_DATA?.straight?.[straightPoleStandard.combination];
    if (!pole || !Array.isArray(pole.poles) || pole.poles.length < 2)
      return null;
    return {
      upperD: pole.poles[0]?.lowerDiameter || pole.poles[0]?.upperDiameter,
      lowerD: pole.poles[1]?.lowerDiameter || pole.poles[1]?.upperDiameter,
      material: pole.poles[0]?.material || "STK400",
    };
  }, [straightPoleStandard.combination]);

  // Enrich combination options with upper pole diameter for clear readability
  const combinationOptions = useMemo(() => {
    const list = combinations[straightPoleStandard.combinationGroup] || [];
    return list.map((c) => {
      const pole = STANDARD_POLE_DATA?.straight?.[c];
      const upperD =
        pole?.poles?.[0]?.lowerDiameter || pole?.poles?.[0]?.upperDiameter;
      return {
        value: c,
        label: upperD ? `${c} (Upper ø${upperD} mm)` : c,
      };
    });
  }, [combinations, straightPoleStandard.combinationGroup]);

  // Diagram image changes based on selected ground position
  const currentImage =
    groundPositionImageMap[straightPoleStandard.groundPosition] ?? onGlImg;

  // onGL mode disables the height depth input (fixed at ground level)
  const isOnGL = straightPoleStandard.groundPosition === "onGL";

  // Straight Pole is in preview / in development
  const activePoleType = straightPoleStandard.poleType || "steppedPole";

  return (
    <div className="bg-white px-4 md:px-6 pb-6 rounded-b-2xl hp:rounded-b-xl">
      {/* ── Preview / In Development Banner (matching user image) ── */}
      <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-[#fef9ee] border border-[#faecd2] flex items-start gap-3.5">
        <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm sm:text-sm font-semibold text-amber-900 mb-1.5">
            Straight Pole is in preview
          </h4>
          <p className="text-xs sm:text-sm text-amber-800">
            Calculation for this type isn’t available yet. You can review the required inputs, but results can’t be generated. Please use Taper Pole for now.
          </p>
        </div>
      </div>

      {/* ── Muted / Read-Only Form Container ("full abu cuma buat user lihat aja") ── */}
      <div className="opacity-75 pointer-events-none select-none">
        {/* ── Select Pole Standard ── */}
        <div className="mb-6">
          <SectionTitle>
            Select Pole Standard Type{" "}
            <span className="text-red-500 ml-1 font-semibold">*</span>
          </SectionTitle>
          <div className="border border-slate-200 rounded-xl hp:rounded-lg p-4 sm:p-6 bg-white shadow-sm">
            {poleStandardLoading && steppedPoleOptions.length === 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-11 rounded-lg hp:rounded-md bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 animate-pulse border border-slate-200/80 flex items-center justify-between px-4"
                  >
                    <div className="w-24 h-3.5 bg-slate-200/80 rounded" />
                    <div className="w-4 h-4 rounded-full bg-slate-200/80" />
                  </div>
                ))}
              </div>
            ) : !poleStandardLoading &&
              poleStandardError &&
              steppedPoleOptions.length === 0 ? (
              <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                <p className="text-xs sm:text-sm text-red-600">
                  Failed to load pole standard options.
                </p>
                <button
                  type="button"
                  onClick={refetchPoleStandard}
                  className="text-xs sm:text-sm font-medium text-red-600 underline hover:text-red-700 shrink-0"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(steppedPoleOptions.length > 0
                  ? steppedPoleOptions
                  : [{ id: "steppedPole", label: "Stepped Pole" }]
                ).map((option) => {
                  const isActive = activePoleType === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled
                      className={`rounded-lg hp:rounded-md border px-4 py-2 lg:py-2.5 text-xs md:text-sm font-medium transition-all cursor-not-allowed
                        ${isActive
                          ? "border-[#3399cc] bg-blue-50/50 text-[#0d3b66] font-semibold shadow-none"
                          : "border-slate-200 text-slate-400 bg-slate-50"
                        }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Main form preview ── */}
        <div className="grid md:grid-cols-1 gap-6 mb-8">
          {/* ── Pole Data: combination + thickness + length ── */}
          <div>
            <SectionTitle>Pole Data</SectionTitle>
            <div className="border border-slate-200 rounded-xl hp:rounded-lg p-4 md:p-6 bg-white shadow-sm space-y-6">
              {/* Diameter group + combination selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lower pole diameter group */}
                <div>
                  <h4 className="block text-gray-700 text-sm mb-3 hp:text-xs hp:mb-2">
                    Select Lower Pole Diameter (mm){" "}
                    <span className="text-red-500 ml-1 font-semibold">*</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {(combinationGroups.length > 0
                      ? combinationGroups
                      : ["114.3", "139.8", "165.2"]
                    ).map((group) => (
                      <button
                        key={group}
                        type="button"
                        disabled
                        className="w-full py-2 lg:py-2.5 rounded-lg hp:rounded-md text-sm hp:text-xs border border-slate-200 bg-white text-slate-400 transition cursor-not-allowed font-medium"
                      >
                        {group}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Combination dropdown — disabled preview */}
                <div className="relative">
                  <h4 className="block text-gray-700 text-sm mb-3 hp:text-xs hp:mb-2">
                    Select Pole Combination{" "}
                    <span className="text-red-500 ml-1 font-semibold">*</span>
                  </h4>
                  <div className="border border-slate-200 rounded-lg hp:rounded-md px-3.5 py-2 lg:py-2.5 bg-white text-slate-400 text-sm flex items-center justify-between cursor-not-allowed">
                    <span>Select Combination</span>
                    <span className="text-slate-400 text-xs">▼</span>
                  </div>
                </div>
              </div>

              {/* Upper + lower thickness and length */}
              <div className="bg-slate-50/60 p-5 rounded-xl border border-gray-200 hp:p-4 hp:rounded-lg">
                <div className="grid grid-cols-1 gap-4 sm:gap-6">
                  {/* Upper pole — thickness + length */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <h4 className="block text-gray-700 text-sm mb-3 hp:text-xs hp:mb-2">
                        Upper Pole Thickness{" "}
                        <span className="text-red-500 ml-1 font-semibold">*</span>
                      </h4>
                      <SelectFirst message="Select pole combination first" />
                    </div>

                    <div>
                      <h4 className="block text-gray-700 text-sm mb-3 hp:text-xs hp:mb-2">
                        Upper Pole Length{" "}
                        <span className="text-red-500 ml-1 font-semibold">*</span>
                      </h4>
                      <div className="relative">
                        <input
                          type="text"
                          disabled
                          placeholder="Input Length"
                          value=""
                          className="w-full px-3 xl:px-4 py-2 lg:py-2.5 rounded-lg border text-sm pr-9 border-slate-200 bg-white text-slate-400 cursor-not-allowed"
                        />
                        <span className="absolute right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-400 pointer-events-none">
                          mm
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lower pole — thickness + length */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <h4 className="block text-gray-700 text-sm mb-3 hp:text-xs hp:mb-2">
                        Lower Pole Thickness{" "}
                        <span className="text-red-500 ml-1 font-semibold">*</span>
                      </h4>
                      <SelectFirst message="Select pole combination first" />
                    </div>

                    <div>
                      <h4 className="block text-gray-700 text-sm mb-3 hp:text-xs hp:mb-2">
                        Lower Pole Length{" "}
                        <span className="text-red-500 ml-1 font-semibold">*</span>
                      </h4>
                      <div className="relative">
                        <input
                          type="text"
                          disabled
                          placeholder="Input Length"
                          value=""
                          className="w-full px-3 xl:px-4 py-2 lg:py-2.5 rounded-lg border text-sm pr-9 border-slate-200 bg-white text-slate-400 cursor-not-allowed"
                        />
                        <span className="absolute right-3 xl:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-400 pointer-events-none">
                          mm
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Installation type — Baseplate / Embedment preview ── */}
          <div>
            <SectionTitle>
              {condition?.baseplateEnabled !== false
                ? "Pole Base Type"
                : "Pole Embedment Type"}
            </SectionTitle>

            <div className="border border-slate-200 rounded-xl hp:rounded-lg p-4 sm:p-6 bg-white shadow-sm">
              <div className="w-full">
                <AdaptiveGroundPositionInput
                  value={straightPoleStandard.lowestHeight ?? "0"}
                  groundPosition={straightPoleStandard.groundPosition ?? "onGL"}
                  disabled={true}
                  label="Lowest Height"
                  title={condition?.baseplateEnabled !== false ? "Baseplate" : "Embedment"}
                  required={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Reset Button Preview ── */}
        <div className="pt-2">
          <button
            type="button"
            disabled
            className="flex items-center text-sm gap-2 px-4 py-2 text-slate-400 border border-slate-200 rounded-lg bg-slate-50 cursor-not-allowed font-medium text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
