import React from "react";
import { AlertTriangle, PaintBucket, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { clearSmartPreserveWarning, saveCalculationSnapshot } from "../../utils/coreLogic";

export function SmartPreserveModal({ open, onClose }) {
  const { type: projectType, draftId } = useParams();
  const navigate = useNavigate();
  if (!open) return null;

  const handleProceed = () => {
    // Navigate to drawing setup and re-baseline
    clearSmartPreserveWarning(projectType);
    saveCalculationSnapshot(projectType);
    
    // Mark drawing as started/active
    sessionStorage.setItem(`${projectType}_drawing_started`, "true");
    
    onClose();
    navigate(`/projects/${projectType}/${draftId}/drawing/drawing-setup`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-100 px-5 py-4 flex items-center justify-between">
          <h2 className="text-amber-800 font-bold text-base flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Calculation Data Modified
          </h2>
          <button 
            onClick={onClose}
            className="text-amber-600/60 hover:text-amber-800 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-600 text-sm mb-4">
            We detected changes in your calculation inputs since you last visited the Drawing phase.
          </p>
          <p className="text-slate-600 text-sm font-medium">
            Please make sure to review your Drawing configurations and CAD generation, as they might need to be updated to match the new calculation data.
          </p>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg font-semibold text-sm text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-colors shadow-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleProceed}
            className="flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm text-white bg-[#0d3b66] hover:bg-[#154b7d] transition-colors shadow-sm cursor-pointer"
          >
            <PaintBucket className="w-4 h-4" />
            Proceed to Drawing
          </button>
        </div>
      </div>
    </div>
  );
}
