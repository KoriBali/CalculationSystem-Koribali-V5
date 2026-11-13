import {
  RotateCcw,
  ChevronRight,
  DoorOpen,
  Layers,
} from "lucide-react";
import { useState } from "react";
import { BaseplateIcon } from "../../../../../assets/icon";
import { ConfirmResetAllModal } from "../../modals/ConfirmResetAllModal";
import { FormSelect } from "../../../../../shared/components/FormSelect";

const CONDITION_STANDARD_OPTIONS = [
  { value: "old_lighting_pole", label: "Old Lighting Pole" },
  { value: "new_jil", label: "New JIL" },
];

/**
 * HELPER COMPONENTS & FUNCTIONS
 */
// Returns input className based on validation state
const inputStyle = (hasError) =>
  `w-full pl-3 md:pl-4 py-2 lg:py-2.5 rounded-lg hp:rounded-md text-xs md:text-sm outline-none transition-all border
  ${
    hasError
      ? "border-red-500 bg-[#fff5f5] ring-1 ring-red-200"
      : "border-gray-300 bg-white focus:border-[#3399cc] focus:ring-1 focus:ring-[#3399cc]"
  }`;

// Renders a red error message below an invalid field
const ErrorStyle = ({ show, text }) =>
  show && typeof text === "string" ? (
    <div className="absolute left-0 -bottom-4 md:-bottom-5 flex items-center gap-1 text-[9px] md:text-[11px] text-red-500">
      <span>*{text}</span>
    </div>
  ) : null;

// Reusable section title with left accent bar
const SectionTitle = ({ children }) => (
  <h3 className="text-[#0d3b66] mb-4 flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium">
    <div className="w-1 h-4 md:h-5 bg-[#3399cc] rounded-full" />
    {children}
  </h3>
);

// Reusable section card wrapper
const SectionCard = ({ children }) => (
  <div className="bg-white px-4 md:px-5 py-5 rounded-lg sm:rounded-xl border border-gray-200">
    {children}
  </div>
);

// Reusable number input with unit suffix
const UnitInput = ({
  value,
  onChange,
  unit,
  unitPadding,
  hasError,
  className,
  ...props
}) => (
  <div className="relative">
    <input
      type="number"
      step="any"
      min={0}
      value={value}
      onChange={onChange}
      onWheel={(e) => e.target.blur()}
      className={
        className ||
        `${inputStyle(hasError)} ${unitPadding || (unit ? "pr-10" : "pr-3 md:pr-4")}`
      }
      {...props}
    />
    {unit && (
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none select-none">
        {unit}
      </span>
    )}
  </div>
);

/**
 * MAIN COMPONENT: ConditionForm
 */
export function ConditionForm({
  projectType,
  projectMode,
  condition = {},
  onUpdate,
  onFinish,
  errors = {},
  readOnly = false,
}) {
  // State for reset confirmation modal
  const [showResetModal, setShowResetModal] = useState(false);

  // Resets condition to defaults
  const handleReset = () => {
    if (readOnly) return;
    const isStandard = condition?.poleType === "standard";
    onUpdate({
      designStandard: "old_lighting_pole",
      designWindSpeed: "60",
      designAirDensity: "1.23",
      horizontalAcceleration: "4.71",
      responseRatio: "1.00",
      openingEnabled: true,
      baseplateEnabled: isStandard ? false : false,
      foundationEnabled: false,
    });
  };

  const isNewJil = condition?.designStandard === "new_jil";

  return (
    <div className="relative">
      <div
        className="
          bg-white
          rounded-2xl hp:rounded-xl
          border border-gray-200
          shadow-[0_2px_10px_rgba(15,23,42,0.06)]
          overflow-hidden
        "
      >
        {/* Top accent strip — full-bleed rect, otomatis ke-clip mengikuti rounded corner parent */}
        <div
          aria-hidden="true"
          className="
            h-1.5
            bg-gradient-to-r from-[#0d3b66] to-[#3399cc]
          "
        />

        <div className="p-4 md:p-6 space-y-6">
          {/* ── Standard and Condition ── */}
          <div>
            <SectionTitle>Standard and Condition</SectionTitle>
            <SectionCard>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6">
                {/* Condition Standard */}
                <div className="relative">
                  <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                    Condition Standard{" "}
                    <span className="text-red-500 ml-1 font-semibold">*</span>
                  </label>
                  <FormSelect
                    id="designStandard"
                    value={condition?.designStandard || "old_lighting_pole"}
                    onChange={(val) => onUpdate({ designStandard: val })}
                    options={CONDITION_STANDARD_OPTIONS}
                    placeholder="Select Standard"
                    disabled={readOnly}
                    hasError={!!errors?.designStandard}
                  />
                  <ErrorStyle
                    show={errors?.designStandard}
                    text={errors?.designStandard}
                  />
                </div>

                {/* Wind Speed */}
                <div className="relative">
                  <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                    Wind Speed{" "}
                    <span className="text-red-500 ml-1 font-semibold">*</span>
                  </label>
                  <UnitInput
                    id="designWindSpeed"
                    value={condition?.designWindSpeed ?? ""}
                    onChange={(e) =>
                      onUpdate({ designWindSpeed: e.target.value })
                    }
                    unit="m/s"
                    unitPadding="pr-12"
                    placeholder="60"
                    disabled={readOnly}
                    hasError={!!errors?.designWindSpeed}
                  />
                  <ErrorStyle
                    show={errors?.designWindSpeed}
                    text={errors?.designWindSpeed}
                  />
                </div>

                {/* Air Density */}
                <div className="relative">
                  <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                    Air Density{" "}
                    <span className="text-red-500 ml-1 font-semibold">*</span>
                  </label>
                  <UnitInput
                    id="designAirDensity"
                    value={condition?.designAirDensity ?? ""}
                    onChange={(e) =>
                      onUpdate({ designAirDensity: e.target.value })
                    }
                    unit={
                      <span>
                        N・sec<sup>2</sup>/m<sup>4</sup>
                      </span>
                    }
                    unitPadding="pr-[92px]"
                    placeholder="1.23"
                    disabled={readOnly}
                    hasError={!!errors?.designAirDensity}
                  />
                  <ErrorStyle
                    show={errors?.designAirDensity}
                    text={errors?.designAirDensity}
                  />
                </div>
              </div>

              {/* Conditional Seismic Inputs for New JIL */}
              {isNewJil && (
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <p className="text-xs md:text-sm font-medium text-[#0d3b66] mb-4 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3399cc]" />
                    Condition for calculation of seismic
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
                    {/* Horizontal Acceleration (EQa) */}
                    <div className="relative">
                      <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                        Horizontal Acceleration (EQa){" "}
                        <span className="text-red-500 ml-1 font-semibold">*</span>
                      </label>
                      <UnitInput
                        id="horizontalAcceleration"
                        value={condition?.horizontalAcceleration ?? ""}
                        onChange={(e) =>
                          onUpdate({ horizontalAcceleration: e.target.value })
                        }
                        unit={
                          <span>
                            m/s<sup>2</sup>
                          </span>
                        }
                        unitPadding="pr-12"
                        placeholder="4.71"
                        disabled={readOnly}
                        hasError={!!errors?.horizontalAcceleration}
                      />
                      <ErrorStyle
                        show={errors?.horizontalAcceleration}
                        text={errors?.horizontalAcceleration}
                      />
                    </div>

                    {/* Response Ratio (EQr) */}
                    <div className="relative">
                      <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                        Response Ratio (EQr){" "}
                        <span className="text-red-500 ml-1 font-semibold">*</span>
                      </label>
                      <UnitInput
                        id="responseRatio"
                        value={condition?.responseRatio ?? ""}
                        onChange={(e) =>
                          onUpdate({ responseRatio: e.target.value })
                        }
                        placeholder="1.00"
                        disabled={readOnly}
                        hasError={!!errors?.responseRatio}
                      />
                      <ErrorStyle
                        show={errors?.responseRatio}
                        text={errors?.responseRatio}
                      />
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Additional Component (toggles) — only for custom mode ── */}
          {condition.poleType !== "standard" && (
            <div>
              <SectionTitle>Additional Components</SectionTitle>
              <SectionCard>
                <div className="grid xl:grid-cols-3 gap-6">
                  {/* Opening */}
                  <ToggleCard
                    label="Opening"
                    icon={<DoorOpen size={16} />}
                    enabled={condition.openingEnabled}
                    disabled={
                      readOnly ||
                      (projectMode === "both" && condition.poleType === "standard")
                    }
                    onToggle={() =>
                      !readOnly && onUpdate({ openingEnabled: !condition.openingEnabled })
                    }
                  />

                  {/* Baseplate */}
                  <ToggleCard
                    label="Baseplate"
                    icon={<BaseplateIcon size={18} />}
                    enabled={condition.baseplateEnabled}
                    disabled={readOnly}
                    onToggle={() =>
                      !readOnly && onUpdate({ baseplateEnabled: !condition.baseplateEnabled })
                    }
                  />

                  {/* Foundation */}
                  <ToggleCard
                    label="Foundation"
                    icon={<Layers size={16} />}
                    enabled={condition.foundationEnabled}
                    disabled={readOnly}
                    onToggle={() =>
                      !readOnly &&
                      onUpdate({
                        foundationEnabled: !condition.foundationEnabled,
                      })
                    }
                  />
                </div>
              </SectionCard>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Footer */}
          <div className={`flex ${readOnly ? "justify-end" : "justify-between"} items-center pt-4 md:pt-0`}>
            {/* Reset => clears all fields (hidden in readOnly) */}
            {!readOnly && (
              <button
                onClick={() => setShowResetModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 md:px-6 rounded-lg hp:rounded-md bg-white text-red-500 font-medium text-xs md:text-sm hover:bg-red-50 hover:text-red-600 transition-colors border border-red-300"
              >
                <RotateCcw className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
                Reset
              </button>
            )}

            {/* Finish => proceeds to next step */}
            <button
              onClick={onFinish}
              className="flex justify-center items-center gap-2 px-5 py-2.5 md:px-6 
            rounded-lg hp:rounded-md font-medium bg-gradient-to-r from-[#0d3b66] to-[#3399cc] text-white text-xs md:text-sm hover:brightness-110 shadow-sm transition-all"
            >
              Next: Pole
              <ChevronRight className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
            </button>
          </div>
        </div>
      </div>
      <ConfirmResetAllModal
        open={showResetModal}
        onClose={() => setShowResetModal(false)}
        onReset={handleReset}
      />
    </div>
  );
}

// ─── SUB-COMPONENT ───────────────────────────────────────────────────────────

// Reusable toggle card for additional components (Opening, Baseplate, Foundation)
function ToggleCard({ label, icon, enabled, onToggle, disabled = false }) {
  return (
    <div
      onClick={disabled ? undefined : onToggle}
      className={`relative overflow-hidden rounded-lg border px-3 xl:px-4 py-2 lg:py-3 transition-all duration-300
        ${disabled ? "cursor-not-allowed" : "cursor-pointer"}
        ${disabled && !enabled ? "bg-slate-100 opacity-60" : ""}
        ${
          enabled
            ? "border-blue-500 bg-white shadow-sm ring-1 ring-blue-50"
            : disabled
              ? "border-slate-200"
              : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"
        }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className={`p-1.5 rounded-md ${enabled ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}
          >
            {icon}
          </div>
          {/* Label */}
          <p
            className={`text-[12px] md:text-sm font-medium ${enabled ? "text-slate-900" : "text-slate-500"}`}
          >
            {label}
          </p>
        </div>

        {/* Toggle switch */}
        <button
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onToggle();
          }}
          className={`relative inline-flex h-5 w-10 md:h-6 md:w-11 items-center rounded-full ${enabled ? "bg-blue-500" : "bg-slate-300"} ${disabled ? "cursor-not-allowed" : ""}`}
        >
          <span
            className={`inline-block h-2.5 w-2.5 md:h-4 md:w-4 transform rounded-full bg-white transition ${enabled ? "translate-x-6" : "translate-x-1"}`}
          />
        </button>
      </div>
    </div>
  );
}
