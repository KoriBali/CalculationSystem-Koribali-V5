import { Triangle, RectangleVertical, CheckCircle, Circle } from "lucide-react";

// ==== CONSTANTS ====
// Available pole type options
const POLE_TYPE_OPTIONS = [
  { id: "taper", label: "Taper Pole", icon: Triangle },
  { id: "straight", label: "Straight Pole", icon: RectangleVertical },
];

// === HELPERS ===

// Reusable section title with left accent bar
const SectionTitle = ({ children }) => (
  <h3 className="text-[#0d3b66] mb-4 flex items-center gap-2 text-sm font-medium hp:text-xs hp:gap-1">
    <div className="w-1 h-5 bg-[#3399cc] rounded-full hp:h-4" />
    {children}
  </h3>
);

// === COMPONENT ===
export function PoleTypeSelector({ poleTypeStandard, onUpdate, readOnly = false }) {
  return (
    <div className="mb-6 px-4 md:px-6">
      <SectionTitle>
        Select Pole Type <span className="text-red-500 ml-1 font-semibold">*</span>
      </SectionTitle>

      <div className="border border-slate-200 rounded-xl hp:rounded-lg p-4 md:p-6 bg-white shadow-sm">
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          {POLE_TYPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive =
              poleTypeStandard.type === option.id ||
              (option.id === "taper" && poleTypeStandard.type === "tapered");

            return (
              <button
                key={option.id}
                type="button"
                disabled={readOnly}
                onClick={readOnly ? undefined : () => onUpdate({ type: option.id })}
                className={`group w-full flex items-center justify-between px-3 xl:px-4 py-2 lg:py-3 relative overflow-hidden rounded-lg border transition-all duration-300
                  ${readOnly ? "cursor-default" : "cursor-pointer active:scale-[0.98]"}
                  ${
                    isActive
                      ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-50"
                      : readOnly
                        ? "border-slate-200 bg-slate-50/50 opacity-60"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
              >
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
                  <div
                    className={`p-1.5 rounded-md shrink-0 ${isActive ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}
                  >
                    <Icon size={16} />
                  </div>
                  <p
                    className={`text-[12px] md:text-sm font-medium ${isActive ? "text-slate-900" : "text-slate-700"}`}
                  >
                    {option.label}
                  </p>
                  {option.id === "straight" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] md:text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 shrink-0">
                      In Development
                    </span>
                  )}
                </div>
                <div className="shrink-0 ml-2 flex items-center">
                  {isActive ? (
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                  ) : (
                    <Circle className="w-4 h-4 md:w-5 md:h-5 text-slate-300 group-hover:text-slate-400" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
