import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw, ArrowLeft, X, Copy, Check } from "lucide-react";

export function ReportErrorModal({
  open,
  onClose,
  title = "Unable to Generate Report",
  message = "An error occurred while preparing your calculation report from the server.",
  details = null,
  status = null,
  onRetry = null,
  onBackToCalculation = null,
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const formattedDetails =
    typeof details === "object" && details !== null
      ? JSON.stringify(details, null, 2)
      : String(details || "");

  const handleCopy = () => {
    if (!formattedDetails) return;
    navigator.clipboard.writeText(formattedDetails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 flex flex-col"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-3.5 pr-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base text-slate-800 leading-tight">
                  {title}
                </h3>
                {status && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    HTTP {status}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          {/* Collapsible Details */}
          {details && (
            <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium transition-colors"
              >
                <span>{showDetails ? "Hide technical details" : "Show technical details"}</span>
                {showDetails ? (
                  <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                )}
              </button>

              {showDetails && (
                <div className="p-3 bg-slate-900 text-slate-200 relative">
                  <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <pre className="text-[11px] font-mono leading-relaxed overflow-x-auto max-h-40 whitespace-pre-wrap pr-14 text-slate-300">
                    {formattedDetails}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
            {onBackToCalculation && (
              <button
                type="button"
                onClick={onBackToCalculation}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Calculation
              </button>
            )}

            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            )}

            {!onRetry && !onBackToCalculation && (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default ReportErrorModal;
