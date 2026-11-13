import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";

export function ReportErrorModal({
  open,
  onClose,
  title = "Calculation Notice",
  message = "An error occurred while preparing your calculation report.",
  onRetry = null,
  onBackToCalculation = null,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && open) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleBack = () => {
    onClose?.();
    onBackToCalculation?.();
  };

  const handleRetry = () => {
    onClose?.();
    onRetry?.();
  };

  const content = (
    <AnimatePresence>
      <div className="fixed z-[1000] flex inset-0 items-center justify-center px-4">
        {/* Blurred backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 8 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative bg-white shadow-[0_24px_50px_-12px_rgba(15,23,42,0.18)] border border-slate-100/80 w-full max-w-[420px] rounded-2xl p-6 sm:p-7 z-10"
        >
          {/* Header with Icon and Title */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl shadow-xs bg-rose-50 text-rose-600 border border-rose-200/70">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-slate-900 font-bold text-sm sm:text-base tracking-tight mb-1">
                {title}
              </h4>
              <p className="text-slate-600 font-normal leading-relaxed text-xs sm:text-sm">
                {message}
              </p>
            </div>
          </div>

          {/* Footer Action */}
          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            {onRetry ? (
              <>
                <button
                  type="button"
                  onClick={onBackToCalculation ? handleBack : onClose}
                  className="px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  {onBackToCalculation ? "Back to Calculation" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="min-w-[96px] px-6 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-xs active:scale-98 bg-[#0d3b66] text-white hover:bg-[#0a2e50] cursor-pointer"
                >
                  Retry
                </button>
              </>
            ) : onBackToCalculation ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBack}
                  className="min-w-[96px] px-6 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-xs active:scale-98 bg-[#0d3b66] text-white hover:bg-[#0a2e50] cursor-pointer"
                >
                  Back to Calculation
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="min-w-[96px] px-6 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-xs active:scale-98 bg-[#0d3b66] text-white hover:bg-[#0a2e50] cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}

export default ReportErrorModal;
