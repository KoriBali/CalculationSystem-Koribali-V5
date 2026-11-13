import { useEffect } from "react";
import { AlertCircle, Check } from "lucide-react";
import { createPortal } from "react-dom";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";

// Displays a dismissible alert message overlaying the screen.
export const ToastModal = ({
  toast, // { message: string, type?: "success" | "error" } | null
  onClose,
}) => {
  // Auto-dismiss for success toasts
  useEffect(() => {
    if (toast && toast.type === "success") {
      const timer = setTimeout(() => {
        onClose();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  return createPortal(
    <AnimatePresence>
      {toast && (
        <div className="fixed z-[1000] flex inset-0 items-center justify-center px-4">
          {/* Blurred backdrop — click anywhere to close */}
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
            className={`
              relative bg-white shadow-[0_24px_50px_-12px_rgba(15,23,42,0.18)] border border-slate-100/80
              ${toast.type === "success"
                ? "w-full max-w-[320px] sm:max-w-[360px] rounded-3xl p-8 flex flex-col items-center text-center"
                : "w-full max-w-[420px] rounded-2xl p-6 sm:p-7"
              }
            `}
          >
            {toast.type === "success" ? (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: 0.1,
                  }}
                  className="w-20 h-20 sm:w-24 sm:h-24 mb-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center relative shadow-xs"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.2 }}
                  >
                    <Check className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-600 stroke-[3]" />
                  </motion.div>
                </motion.div>
                <motion.h3 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-slate-900 font-bold text-lg sm:text-xl mb-2"
                >
                  Success!
                </motion.h3>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-slate-600 font-medium text-sm sm:text-base leading-relaxed"
                >
                  {toast.message}
                </motion.p>
              </>
            ) : (
              <>
                {/* Header with Icon and Title */}
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl shadow-xs ${
                      toast.type === "error"
                        ? "bg-rose-50 text-rose-600 border border-rose-200/70"
                        : "bg-amber-50 text-amber-600 border border-amber-200/70"
                    }`}
                  >
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-slate-900 font-bold text-sm sm:text-base tracking-tight mb-1">
                      {toast.title || (toast.type === "error" ? "Calculation Notice" : "Notice")}
                    </h4>
                    <p className="text-slate-600 font-normal leading-relaxed text-xs sm:text-sm">
                      {toast.message}
                    </p>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={onClose}
                    className="w-full sm:w-auto min-w-[96px] px-6 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-xs active:scale-98 bg-[#0d3b66] text-white hover:bg-[#0a2e50] cursor-pointer"
                  >
                    OK
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
