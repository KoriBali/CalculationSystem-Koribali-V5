import { AdaptiveGroundPositionInput } from "../common/AdaptiveGroundPositionInput";

const inputStyle = (hasError, disabled) =>
  `w-full pl-3 md:pl-4 pr-9 py-2 lg:py-2.5 rounded-lg hp:rounded-md text-xs md:text-sm outline-none transition-all border
  ${
    disabled
      ? "bg-gray-100 border-gray-200 text-gray-400"
      : hasError
        ? "border-red-500 bg-[#fff5f5] ring-1 ring-red-200"
        : "border-gray-300 bg-white focus:border-[#3399cc] focus:ring-1 focus:ring-[#3399cc]"
  }`;

export function PoleConfigForm({ poleConfig, onUpdate, errors, condition }) {
  const { lowestHeight, groundPosition, overdesignFactor, embedmentLength } =
    poleConfig;

  const isBaseplate = condition?.baseplateEnabled !== false;

  return (
    <div className="bg-white border border-gray-200 p-5 hp:p-4 rounded-lg sm:rounded-xl shadow-sm">
      <div className="grid grid-cols-1 gap-6">
        {/* ── Baseplate Mode: Ground Position & Lowest Height ── */}
        {isBaseplate ? (
          <AdaptiveGroundPositionInput
            value={lowestHeight ?? ""}
            groundPosition={groundPosition ?? "onGL"}
            onChange={({ lowestHeight: nextH, groundPosition: nextPos }) => {
              onUpdate({ lowestHeight: nextH, groundPosition: nextPos });
            }}
            error={errors.lowestHeight}
            label="Lowest Height"
            title="Baseplate"
            required={true}
          />
        ) : (
          /* ── Embedment Mode (matching baseplate mode white style) ── */
          <div className="flex flex-col gap-2 bg-white w-full">
            {/* Header: Title Only */}
            <div className="flex items-center justify-between pb-1">
              <p className="text-xs md:text-sm font-semibold text-[#0d3b66]">
                Embedment
              </p>
            </div>

            <div className="flex hp:flex-col flex-row items-center justify-center h-56 hp:h-auto gap-4 sm:gap-6">
              {/* Left Side: Standard Form Input Field */}
              <div className="w-44 sm:w-52 hp:w-full">
                <label className="block text-xs md:text-sm mb-2 text-gray-700 font-medium">
                  <span className="hidden hp:inline">Embedment Length (l)</span>
                  <span className="hp:hidden inline">Embedment Length</span>
                  <span className="text-red-500 ml-1 font-semibold">*</span>
                </label>
                <div className="relative">
                  <input
                    id="embedmentLength"
                    type="number"
                    min="0"
                    placeholder="Input Length"
                    value={embedmentLength ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdate({
                        embedmentLength: val,
                        lowestHeight: val ? `-${val}` : "0",
                        groundPosition: "embedment",
                      });
                    }}
                    onWheel={(e) => e.target.blur()}
                    className={`w-full pl-3 md:pl-4 pr-10 py-2 lg:py-2.5 rounded-lg hp:rounded-md text-xs md:text-sm outline-none transition-all border ${
                      errors?.embedmentLength
                        ? "border-red-500 bg-[#fff5f5] ring-1 ring-red-200"
                        : "border-gray-300 bg-white focus:border-[#3399cc] focus:ring-1 focus:ring-[#3399cc]"
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-400 pointer-events-none">
                    mm
                  </span>
                </div>
                {errors?.embedmentLength && (
                  <p className="text-[10px] text-red-500 mt-1">
                    *{errors.embedmentLength}
                  </p>
                )}
              </div>

              {/* Right Side: Diagram */}
              <div className="relative inline-flex items-center justify-center shrink-0">
                {/* Mobile Image */}
                <img
                  src="/images/embedment(l).svg"
                  alt="embedment"
                  className="hidden hp:block h-40 w-auto object-contain"
                />
                {/* Desktop Image */}
                <img
                  src="/images/embedment.svg"
                  alt="embedment"
                  className="block hp:hidden h-52 w-auto object-contain select-none shrink-0"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Overdesign Factor ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-start p-4 sm:p-5 bg-slate-50/50 border border-slate-200 rounded-xl hp:rounded-lg gap-4 sm:gap-8 xl:gap-16">
          <div>
            <label className="block text-xs md:text-sm font-semibold text-slate-700">
              Overdesign Factor <span className="text-red-500 ml-1 font-semibold">*</span>
            </label>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">
              Safety margin multiplier applied to the structural calculation
            </p>
          </div>
          <div className="relative w-full sm:w-[180px] xl:w-[200px]">
            <input
              id="overdesignFactor"
              type="number"
              min={0}
              value={overdesignFactor}
              onChange={(e) => onUpdate({ overdesignFactor: e.target.value })}
              onWheel={(e) => e.target.blur()}
              className={inputStyle(errors.overdesignFactor, false)}
            />
            {errors.overdesignFactor && (
              <p className="absolute text-[10px] text-red-500 mt-0.5">
                *{errors.overdesignFactor}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
