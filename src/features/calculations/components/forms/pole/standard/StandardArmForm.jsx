import { useMemo } from "react";
import PropTypes from "prop-types";
import { RotateCcw } from "lucide-react";
import { useMasterData } from "../../../../hooks/useMasterData";
import { FormSelect } from "../../../../../../shared/components/FormSelect";

// Helper styles
const inputStyle = (hasError, readOnly) =>
  `w-full py-2 lg:py-2.5 rounded-lg hp:rounded-md outline-none transition-all text-xs md:text-sm border
  ${
    hasError
      ? "border-red-500 bg-[#fff5f5] ring-1 ring-red-200"
      : "border-gray-300 bg-white focus:border-[#3399cc] focus:ring-1 focus:ring-[#3399cc]"
  }
  ${readOnly ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`;

const ErrorStyle = ({ show, text }) =>
  show ? (
    <div className="absolute left-0 -bottom-4 md:-bottom-5 flex items-center gap-1 text-[9px] md:text-[11px] text-red-500">
      <span>*{text}</span>
    </div>
  ) : null;

ErrorStyle.propTypes = {
  show: PropTypes.bool,
  text: PropTypes.string,
};

// Helper to determine if arm or its objects differ from default spec
const isDifferent = (a, b, isNumeric = false) => {
  if (isNumeric) {
    const numA = a === "" || a === null || a === undefined ? NaN : Number(a);
    const numB = b === "" || b === null || b === undefined ? NaN : Number(b);
    if (isNaN(numA) && isNaN(numB)) return false;
    if (isNaN(numA) || isNaN(numB)) return true;
    return numA !== numB;
  }
  return String(a ?? "").trim() !== String(b ?? "").trim();
};

const isArmModified = (current, defaultArm) => {
  if (!current || !defaultArm) return false;
  if (isDifferent(current.name, defaultArm.name)) return true;
  if (isDifferent(current.material, defaultArm.material)) return true;
  if (isDifferent(current.diameter, defaultArm.diameter, true)) return true;
  if (isDifferent(current.thickness, defaultArm.thickness, true)) return true;
  if (isDifferent(current.length, defaultArm.length, true)) return true;
  if (isDifferent(current.expLength, defaultArm.expLength, true)) return true;
  if (isDifferent(current.zHeight, defaultArm.zHeight, true)) return true;
  if (isDifferent(current.hDistance, defaultArm.hDistance, true)) return true;
  if (isDifferent(current.fixAngle, defaultArm.fixAngle, true)) return true;
  if (isDifferent(current.nnC, defaultArm.nnC, true)) return true;
  if (isDifferent(current.quantity, defaultArm.quantity, true)) return true;

  const curObjects = current.armObjects || [];
  const defObjects = defaultArm.armObjects || [];
  if (curObjects.length !== defObjects.length) return true;

  for (let i = 0; i < curObjects.length; i++) {
    const co = curObjects[i];
    const dfo = defObjects[i];
    if (!co || !dfo) return true;
    if (isDifferent(co.name, dfo.name)) return true;
    if (isDifferent(co.type, dfo.type)) return true;
    if (isDifferent(co.frontArea, dfo.frontArea, true)) return true;
    if (isDifferent(co.sideArea, dfo.sideArea, true)) return true;
    if (isDifferent(co.weight, dfo.weight, true)) return true;
    if (isDifferent(co.zHeight, dfo.zHeight, true)) return true;
    if (isDifferent(co.hDistance, dfo.hDistance, true)) return true;
    if (isDifferent(co.nnC, dfo.nnC, true)) return true;
    if (isDifferent(co.quantity, dfo.quantity, true)) return true;
    if (isDifferent(co.fixAngle, dfo.fixAngle, true)) return true;
  }

  return false;
};

export function StandardArmForm({
  arms = [],
  defaultArms = [],
  onUpdateArm,
  onUpdateArmObject,
  onResetArm,
  errors = {},
  aoErrors = {},
  taperPoleStandard = {},
  readOnly = false,
  isOldJil = false,
}) {
  const {
    materialOptions,
    loading: materialsLoading,
    error: materialsError,
    objectTypeOptions,
    loading: objectTypesLoading,
    error: objectTypesError,
  } = useMasterData();

  const fallbackTypeOptions = [
    { value: "omni", label: "Omni" },
    { value: "directional", label: "Directional" },
  ];

  const availableTypeOptions = useMemo(() => {
    if (isOldJil) {
      return [{ value: "omni", label: "Omni" }];
    }
    return objectTypeOptions && objectTypeOptions.length > 0
      ? objectTypeOptions
      : fallbackTypeOptions;
  }, [isOldJil, objectTypeOptions]);

  const isPoleSelected =
    Boolean(taperPoleStandard?.poleType) && Boolean(taperPoleStandard?.height);

  const displayArms =
    arms && arms.length > 0
      ? arms
      : defaultArms && defaultArms.length > 0
        ? defaultArms
        : [];

  return (
    <div className="rounded-b-2xl shadow-sm border border-gray-200 overflow-hidden bg-white hp:rounded-b-xl">
      {/* ── Section Header ── */}
      <div className="px-6 pt-6 pb-3 hp:px-4 hp:pt-4 hp:pb-2 border-b border-gray-200">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[#0d3b66] flex items-center gap-2 text-xs md:text-sm font-medium hp:text-xs hp:gap-1">
            <div className="w-1 h-5 bg-[#3399cc] rounded-full hp:h-4" />
            <span className="font-semibold">Arm &amp; Object Specifications</span>
            <span className="hp:hidden text-slate-500 font-normal">
              with detailed specifications
            </span>
          </h3>
        </div>
      </div>

      {/* ── Content ── */}
      {!isPoleSelected ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
          <p className="text-xs md:text-sm font-medium text-slate-500">
            No pole standard selected yet
          </p>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-md">
            Please select a pole standard type and height in the Pole
            Configuration section above to display arm and object specifications.
          </p>
        </div>
      ) : displayArms.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
          <p className="text-xs md:text-sm font-medium text-slate-500">
            No arms for standard pole &ldquo;{taperPoleStandard.poleType}&rdquo;
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            The selected standard pole specification has no arms defined.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {displayArms.map((arm, armIndex) => {
            const armError = errors[arm.idArm] || {};
            const defaultArm =
              defaultArms.find((a) => a.idArm === arm.idArm) ||
              defaultArms[armIndex];
            const isModified = isArmModified(arm, defaultArm);
            const armObjects = arm.armObjects || [];

            return (
              <div
                key={arm.idArm || armIndex}
                className="p-6 hp:p-4 bg-white space-y-6"
              >
                {/* ── Arm Item Header ── */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 hp:pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-lg bg-[#0d3b66] text-white font-semibold text-xs md:text-sm shrink-0">
                      {armIndex + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-[#0d3b66] hp:text-xs">
                        {arm.name || `Arm ${armIndex + 1}`}
                      </h4>
                      <p className="text-xs text-gray-500 hp:text-[11px]">
                        Standard pole arm specification (adjustable)
                      </p>
                    </div>
                  </div>

                  {!readOnly && onResetArm && isModified && (
                    <button
                      type="button"
                      onClick={() => onResetArm(arm.idArm)}
                      title="Reset to default specification"
                      className="group inline-flex items-center gap-1.5 text-xs md:text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600 group-hover:rotate-[-45deg] transition-transform" />
                      <span>Reset to default spec</span>
                    </button>
                  )}
                </div>

                {/* ── ARM FORM INPUTS (11 fields) ── */}
                <div className="space-y-4">
                  {/* Row 1: Name, Material, Diameter, Thickness, Length, Exp.Length */}
                  <div
                    className="
                      grid grid-cols-2 gap-3 gap-y-6
                      md:grid-cols-6
                      xl:flex xl:flex-row xl:flex-nowrap xl:items-start xl:gap-x-2 2xl:gap-x-3
                    "
                  >
                    {/* 1. Arm Name */}
                    <div className="relative col-span-2 md:col-span-2 xl:flex-[2] min-w-0 w-full">
                      <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                        Arm Name{" "}
                        <span className="text-red-500 ml-1 font-semibold">*</span>
                      </label>
                      <input
                        id={`arm-${arm.idArm}-name`}
                        type="text"
                        value={arm.name ?? ""}
                        disabled={readOnly}
                        onChange={(e) =>
                          onUpdateArm(arm.idArm, { name: e.target.value })
                        }
                        placeholder="e.g., 照明アーム1"
                        className={`${inputStyle(armError.name, readOnly)} px-3 2xl:px-4`}
                      />
                      <ErrorStyle
                        show={Boolean(armError.name)}
                        text={armError.name}
                      />
                    </div>

                    {/* 2. Material */}
                    <div className="relative col-span-1 md:col-span-1 xl:w-[130px] xl:flex-none min-w-0 w-full">
                      <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                        Material{" "}
                        <span className="text-red-500 ml-1 font-semibold">*</span>
                      </label>
                      <FormSelect
                        id={`arm-${arm.idArm}-material`}
                        value={arm.material || "STK400"}
                        onChange={(val) =>
                          onUpdateArm(arm.idArm, { material: val })
                        }
                        options={materialOptions}
                        loading={materialsLoading}
                        disabled={readOnly || Boolean(materialsError && materialOptions.length === 0)}
                        hasError={Boolean(armError.material)}
                        placeholder="Material"
                      />
                      <ErrorStyle
                        show={Boolean(armError.material)}
                        text={armError.material}
                      />
                    </div>

                    {/* 3. Diameter */}
                    <div className="relative col-span-1 md:col-span-1 xl:flex-1 min-w-0 w-full">
                      <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                        Diameter{" "}
                        <span className="text-red-500 ml-1 font-semibold">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id={`arm-${arm.idArm}-diameter`}
                          type="number"
                          min={0}
                          step="any"
                          value={arm.diameter ?? ""}
                          disabled={readOnly}
                          onChange={(e) =>
                            onUpdateArm(arm.idArm, { diameter: e.target.value })
                          }
                          onWheel={(e) => e.target.blur()}
                          className={`${inputStyle(armError.diameter, readOnly)} pl-3 2xl:pl-4 pr-8`}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                          mm
                        </span>
                      </div>
                      <ErrorStyle
                        show={Boolean(armError.diameter)}
                        text={armError.diameter}
                      />
                    </div>

                    {/* 4. Thickness */}
                    <div className="relative col-span-1 md:col-span-1 xl:flex-1 min-w-0 w-full">
                      <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                        Thickness{" "}
                        <span className="text-red-500 ml-1 font-semibold">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id={`arm-${arm.idArm}-thickness`}
                          type="number"
                          min={0}
                          step="any"
                          value={arm.thickness ?? ""}
                          disabled={readOnly}
                          onChange={(e) =>
                            onUpdateArm(arm.idArm, { thickness: e.target.value })
                          }
                          onWheel={(e) => e.target.blur()}
                          className={`${inputStyle(armError.thickness, readOnly)} pl-3 2xl:pl-4 pr-8`}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                          mm
                        </span>
                      </div>
                      <ErrorStyle
                        show={Boolean(armError.thickness)}
                        text={armError.thickness}
                      />
                    </div>

                    {/* 5. Length */}
                    <div className="relative col-span-1 md:col-span-1 xl:flex-1 min-w-0 w-full">
                      <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                        Length{" "}
                        <span className="text-red-500 ml-1 font-semibold">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id={`arm-${arm.idArm}-length`}
                          type="number"
                          min={0}
                          step="any"
                          value={arm.length ?? ""}
                          disabled={readOnly}
                          onChange={(e) =>
                            onUpdateArm(arm.idArm, { length: e.target.value })
                          }
                          onWheel={(e) => e.target.blur()}
                          className={`${inputStyle(armError.length, readOnly)} pl-3 2xl:pl-4 pr-8`}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                          mm
                        </span>
                      </div>
                      <ErrorStyle
                        show={Boolean(armError.length)}
                        text={armError.length}
                      />
                    </div>

                    {/* 6. Exp.Length */}
                    <div className="relative col-span-1 md:col-span-1 xl:flex-1 min-w-0 w-full">
                      <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                        Exp.Length{" "}
                        <span className="text-red-500 ml-1 font-semibold">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id={`arm-${arm.idArm}-expLength`}
                          type="number"
                          min={0}
                          step="any"
                          value={arm.expLength ?? ""}
                          disabled={readOnly}
                          onChange={(e) =>
                            onUpdateArm(arm.idArm, { expLength: e.target.value })
                          }
                          onWheel={(e) => e.target.blur()}
                          className={`${inputStyle(armError.expLength, readOnly)} pl-3 2xl:pl-4 pr-8`}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                          mm
                        </span>
                      </div>
                      <ErrorStyle
                        show={Boolean(armError.expLength)}
                        text={armError.expLength}
                      />
                    </div>
                  </div>

                  {/* Row 2: Height, H-Distance, Fix Angle, nnC, Quantity */}
                  <div
                    className="
                      grid grid-cols-2 gap-3 gap-y-6
                      md:grid-cols-5
                      xl:flex xl:flex-row xl:flex-nowrap xl:items-start xl:gap-x-2 2xl:gap-x-3
                    "
                  >
                    {/* 7. Height */}
                    <div className="relative col-span-1 xl:flex-1 min-w-0 w-full">
                      <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                        Height{" "}
                        <span className="text-red-500 ml-1 font-semibold">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id={`arm-${arm.idArm}-zHeight`}
                          type="number"
                          min={0}
                          step="any"
                          value={arm.zHeight ?? ""}
                          disabled={readOnly}
                          onChange={(e) =>
                            onUpdateArm(arm.idArm, { zHeight: e.target.value })
                          }
                          onWheel={(e) => e.target.blur()}
                          className={`${inputStyle(armError.zHeight, readOnly)} pl-3 2xl:pl-4 pr-8`}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                          mm
                        </span>
                      </div>
                      <ErrorStyle
                        show={Boolean(armError.zHeight)}
                        text={armError.zHeight}
                      />
                    </div>

                    {/* 8. H-Distance */}
                    <div className="relative col-span-1 xl:flex-1 min-w-0 w-full">
                      <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                        H-Distance{" "}
                        <span className="text-red-500 ml-1 font-semibold">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id={`arm-${arm.idArm}-hDistance`}
                          type="number"
                          min={0}
                          step="any"
                          value={arm.hDistance ?? ""}
                          disabled={readOnly}
                          onChange={(e) =>
                            onUpdateArm(arm.idArm, { hDistance: e.target.value })
                          }
                          onWheel={(e) => e.target.blur()}
                          className={`${inputStyle(armError.hDistance, readOnly)} pl-3 2xl:pl-4 pr-8`}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                          mm
                        </span>
                      </div>
                      <ErrorStyle
                        show={Boolean(armError.hDistance)}
                        text={armError.hDistance}
                      />
                    </div>

                    {/* 9. Fix Angle */}
                    <div className="relative col-span-1 xl:flex-1 min-w-0 w-full">
                      <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                        Fix Angle{" "}
                        <span className="text-red-500 ml-1 font-semibold">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id={`arm-${arm.idArm}-fixAngle`}
                          type="number"
                          step="any"
                          value={arm.fixAngle ?? "0"}
                          disabled={readOnly}
                          onChange={(e) =>
                            onUpdateArm(arm.idArm, { fixAngle: e.target.value })
                          }
                          onWheel={(e) => e.target.blur()}
                          className={`${inputStyle(armError.fixAngle, readOnly)} pl-3 2xl:pl-4 pr-8`}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                          deg
                        </span>
                      </div>
                      <ErrorStyle
                        show={Boolean(armError.fixAngle)}
                        text={armError.fixAngle}
                      />
                    </div>

                    {/* 10. nnC */}
                    <div className="relative col-span-1 xl:flex-[0.8] min-w-0 w-full">
                      <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                        nnC{" "}
                        <span className="text-red-500 ml-1 font-semibold">*</span>
                      </label>
                      <input
                        id={`arm-${arm.idArm}-nnC`}
                        type="number"
                        min={0}
                        step="any"
                        value={arm.nnC ?? ""}
                        disabled={readOnly}
                        onChange={(e) =>
                          onUpdateArm(arm.idArm, { nnC: e.target.value })
                        }
                        onWheel={(e) => e.target.blur()}
                        className={`${inputStyle(armError.nnC, readOnly)} px-3 2xl:px-4`}
                      />
                      <ErrorStyle
                        show={Boolean(armError.nnC)}
                        text={armError.nnC}
                      />
                    </div>

                    {/* 11. Quantity */}
                    <div className="relative col-span-2 md:col-span-1 xl:flex-[0.8] min-w-0 w-full">
                      <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                        Quantity{" "}
                        <span className="text-red-500 ml-1 font-semibold">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id={`arm-${arm.idArm}-quantity`}
                          type="number"
                          min={1}
                          step={1}
                          value={arm.quantity ?? 1}
                          disabled={readOnly}
                          onChange={(e) =>
                            onUpdateArm(arm.idArm, { quantity: e.target.value })
                          }
                          onWheel={(e) => e.target.blur()}
                          className={`${inputStyle(armError.quantity, readOnly)} pl-3 2xl:pl-4 pr-8`}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                          pcs
                        </span>
                      </div>
                      <ErrorStyle
                        show={Boolean(armError.quantity)}
                        text={armError.quantity}
                      />
                    </div>
                  </div>
                </div>

                {/* ── OBJECTS ON THIS ARM SUB-SECTION ── */}
                {armObjects.length > 0 && (
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 md:p-5 mt-4 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                      <div className="w-1.5 h-4 bg-[#3399cc] rounded-full" />
                      <h5 className="text-xs md:text-sm font-semibold text-[#0d3b66]">
                        Object on Arm Specifications
                      </h5>
                    </div>

                    {armObjects.map((ao, aoIdx) => {
                      const aoErr =
                        aoErrors[`${arm.idArm}_${ao.idAo}`] ||
                        aoErrors[ao.idAo] ||
                        {};

                      return (
                        <div
                          key={ao.idAo || aoIdx}
                          className="
                            grid grid-cols-2 gap-3 gap-y-6
                            md:grid-cols-5
                            xl:flex xl:flex-row xl:flex-nowrap xl:items-start xl:gap-x-2 2xl:gap-x-3
                          "
                        >
                          {/* Object Name */}
                          <div className="relative col-span-2 md:col-span-2 xl:flex-[2] min-w-0 w-full">
                            <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                              Object Name{" "}
                              <span className="text-red-500 ml-1 font-semibold">*</span>
                            </label>
                            <input
                              id={`ao-${arm.idArm}-${ao.idAo}-name`}
                              type="text"
                              value={ao.name ?? ""}
                              disabled={readOnly}
                              onChange={(e) =>
                                onUpdateArmObject(arm.idArm, ao.idAo, {
                                  name: e.target.value,
                                })
                              }
                              placeholder="e.g., 灯具"
                              className={`${inputStyle(aoErr.name, readOnly)} px-3 2xl:px-4`}
                            />
                            <ErrorStyle
                              show={Boolean(aoErr.name)}
                              text={aoErr.name}
                            />
                          </div>

                          {/* Object Type */}
                          <div className="relative col-span-1 xl:w-[130px] xl:flex-none min-w-0 w-full">
                            <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                              Type{" "}
                              <span className="text-red-500 ml-1 font-semibold">*</span>
                              {isOldJil && !readOnly && (
                                <span className="ml-1 text-[11px] text-gray-400 font-normal">
                                  (Omni only)
                                </span>
                              )}
                            </label>
                            <FormSelect
                              id={`ao-${arm.idArm}-${ao.idAo}-type`}
                              value={isOldJil ? "omni" : ao.type || "omni"}
                              onChange={(val) => {
                                if (!isOldJil) {
                                  onUpdateArmObject(arm.idArm, ao.idAo, {
                                    type: val,
                                  });
                                }
                              }}
                              options={availableTypeOptions}
                              loading={objectTypesLoading}
                              disabled={
                                readOnly ||
                                isOldJil ||
                                Boolean(objectTypesError && objectTypeOptions.length === 0)
                              }
                              hasError={!isOldJil && Boolean(aoErr.type)}
                              placeholder="Type"
                            />
                            <ErrorStyle
                              show={Boolean(aoErr.type)}
                              text={aoErr.type}
                            />
                          </div>

                          {/* Front Area */}
                          <div className="relative col-span-1 xl:flex-1 min-w-0 w-full">
                            <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                              Front Area{" "}
                              <span className="text-red-500 ml-1 font-semibold">*</span>
                            </label>
                            <div className="relative">
                              <input
                                id={`ao-${arm.idArm}-${ao.idAo}-frontArea`}
                                type="number"
                                min={0}
                                step="any"
                                value={ao.frontArea ?? ""}
                                disabled={readOnly}
                                onChange={(e) =>
                                  onUpdateArmObject(arm.idArm, ao.idAo, {
                                    frontArea: e.target.value,
                                  })
                                }
                                onWheel={(e) => e.target.blur()}
                                className={`${inputStyle(aoErr.frontArea, readOnly)} pl-3 2xl:pl-4 pr-7`}
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                                m<sup>2</sup>
                              </span>
                            </div>
                            <ErrorStyle
                              show={Boolean(aoErr.frontArea)}
                              text={aoErr.frontArea}
                            />
                          </div>

                          {/* Side Area (Directional only) */}
                          {ao.type === "directional" && (
                            <div className="relative col-span-1 xl:flex-1 min-w-0 w-full">
                              <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                                Side Area{" "}
                                <span className="text-red-500 ml-1 font-semibold">*</span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`ao-${arm.idArm}-${ao.idAo}-sideArea`}
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={ao.sideArea ?? "0.1"}
                                  disabled={readOnly}
                                  onChange={(e) =>
                                    onUpdateArmObject(arm.idArm, ao.idAo, {
                                      sideArea: e.target.value,
                                    })
                                  }
                                  onWheel={(e) => e.target.blur()}
                                  className={`${inputStyle(aoErr.sideArea, readOnly)} pl-3 2xl:pl-4 pr-7`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                                  m<sup>2</sup>
                                </span>
                              </div>
                              <ErrorStyle
                                show={Boolean(aoErr.sideArea)}
                                text={aoErr.sideArea}
                              />
                            </div>
                          )}

                          {/* Weight */}
                          <div className="relative col-span-1 xl:flex-1 min-w-0 w-full">
                            <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                              Weight{" "}
                              <span className="text-red-500 ml-1 font-semibold">*</span>
                            </label>
                            <div className="relative">
                              <input
                                id={`ao-${arm.idArm}-${ao.idAo}-weight`}
                                type="number"
                                min={0}
                                step="any"
                                value={ao.weight ?? ""}
                                disabled={readOnly}
                                onChange={(e) =>
                                  onUpdateArmObject(arm.idArm, ao.idAo, {
                                    weight: e.target.value,
                                  })
                                }
                                onWheel={(e) => e.target.blur()}
                                className={`${inputStyle(aoErr.weight, readOnly)} pl-3 2xl:pl-4 pr-6`}
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                                kg
                              </span>
                            </div>
                            <ErrorStyle
                              show={Boolean(aoErr.weight)}
                              text={aoErr.weight}
                            />
                          </div>

                          {/* H-Distance */}
                          <div className="relative col-span-1 xl:flex-1 min-w-0 w-full">
                            <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                              H-Distance{" "}
                              <span className="text-red-500 ml-1 font-semibold">*</span>
                            </label>
                            <div className="relative">
                              <input
                                id={`ao-${arm.idArm}-${ao.idAo}-hDistance`}
                                type="number"
                                min={0}
                                step="any"
                                value={ao.hDistance ?? ao.zHeight ?? ""}
                                disabled={readOnly}
                                onChange={(e) =>
                                  onUpdateArmObject(arm.idArm, ao.idAo, {
                                    hDistance: e.target.value,
                                    zHeight: e.target.value,
                                  })
                                }
                                onWheel={(e) => e.target.blur()}
                                className={`${inputStyle(aoErr.hDistance || aoErr.zHeight, readOnly)} pl-3 2xl:pl-4 pr-8`}
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                                mm
                              </span>
                            </div>
                            <ErrorStyle
                              show={Boolean(aoErr.hDistance || aoErr.zHeight)}
                              text={aoErr.hDistance || aoErr.zHeight}
                            />
                          </div>

                          {/* nnC */}
                          <div className="relative col-span-1 xl:flex-[0.8] min-w-0 w-full">
                            <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                              nnC{" "}
                              <span className="text-red-500 ml-1 font-semibold">*</span>
                            </label>
                            <input
                              id={`ao-${arm.idArm}-${ao.idAo}-nnC`}
                              type="number"
                              min={0}
                              step="any"
                              value={ao.nnC ?? ""}
                              disabled={readOnly}
                              onChange={(e) =>
                                onUpdateArmObject(arm.idArm, ao.idAo, {
                                  nnC: e.target.value,
                                })
                              }
                              onWheel={(e) => e.target.blur()}
                              className={`${inputStyle(aoErr.nnC, readOnly)} px-3 2xl:px-4`}
                            />
                            <ErrorStyle
                              show={Boolean(aoErr.nnC)}
                              text={aoErr.nnC}
                            />
                          </div>

                          {/* Quantity */}
                          <div className="relative col-span-1 xl:flex-[0.8] min-w-0 w-full">
                            <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                              Quantity{" "}
                              <span className="text-red-500 ml-1 font-semibold">*</span>
                            </label>
                            <div className="relative">
                              <input
                                id={`ao-${arm.idArm}-${ao.idAo}-quantity`}
                                type="number"
                                min={1}
                                step={1}
                                value={ao.quantity ?? 1}
                                disabled={readOnly}
                                onChange={(e) =>
                                  onUpdateArmObject(arm.idArm, ao.idAo, {
                                    quantity: e.target.value,
                                  })
                                }
                                onWheel={(e) => e.target.blur()}
                                className={`${inputStyle(aoErr.quantity, readOnly)} pl-3 2xl:pl-4 pr-8`}
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                                pcs
                              </span>
                            </div>
                            <ErrorStyle
                              show={Boolean(aoErr.quantity)}
                              text={aoErr.quantity}
                            />
                          </div>

                          {/* Fix Angle (Directional only) */}
                          {ao.type === "directional" && (
                            <div className="relative col-span-1 xl:flex-1 min-w-0 w-full">
                              <label className="block text-sm text-gray-700 mb-2 hp:text-xs hp:mb-1">
                                Fix Angle{" "}
                                <span className="text-red-500 ml-1 font-semibold">*</span>
                              </label>
                              <div className="relative">
                                <input
                                  id={`ao-${arm.idArm}-${ao.idAo}-fixAngle`}
                                  type="number"
                                  step="any"
                                  value={ao.fixAngle ?? "0"}
                                  disabled={readOnly}
                                  onChange={(e) =>
                                    onUpdateArmObject(arm.idArm, ao.idAo, {
                                      fixAngle: e.target.value,
                                    })
                                  }
                                  onWheel={(e) => e.target.blur()}
                                  className={`${inputStyle(aoErr.fixAngle, readOnly)} pl-3 2xl:pl-4 pr-8`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500 pointer-events-none">
                                  deg
                                </span>
                              </div>
                              <ErrorStyle
                                show={Boolean(aoErr.fixAngle)}
                                text={aoErr.fixAngle}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

StandardArmForm.propTypes = {
  arms: PropTypes.arrayOf(PropTypes.object),
  defaultArms: PropTypes.arrayOf(PropTypes.object),
  onUpdateArm: PropTypes.func.isRequired,
  onUpdateArmObject: PropTypes.func.isRequired,
  onResetArm: PropTypes.func,
  errors: PropTypes.object,
  aoErrors: PropTypes.object,
  taperPoleStandard: PropTypes.object,
  readOnly: PropTypes.bool,
  isOldJil: PropTypes.bool,
};

