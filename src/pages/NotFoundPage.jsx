import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronLeft } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  // Cek apakah user punya project aktif di session
  const activeProject = sessionStorage.getItem("projectType");
  const activeDraftId = activeProject ? sessionStorage.getItem(`${activeProject}_active_draft_id`) : null;

  const backPath = activeDraftId
    ? `/projects/${activeProject}/${activeDraftId}`
    : "/project-tools";

  const buttonLabel = activeDraftId ? "Back to Calculation" : "Back to Main Menu";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6">
      <div className="max-w-xl w-full text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 text-[#0d3b66] p-4 rounded-xl shadow-sm">
            <AlertTriangle className="w-12 h-12" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-5xl font-bold text-slate-800 mb-3">404</h1>

        {/* Subtitle */}
        <h2 className="text-xl text-slate-600 mb-2 font-semibold">
          Page Not Found
        </h2>

        {/* Description */}
        <p className="text-base text-slate-500 mb-10 lg:mb-12 leading-relaxed mx-auto">
          The page you are looking for might have been removed, had its name
          changed, or is temporarily unavailable.
        </p>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => navigate(backPath)}
            className="
                  flex items-center gap-2 px-8 py-3 
                  bg-gradient-to-r from-[#0d3b66] to-[#3399cc] text-white rounded-lg shadow-sm 
                  hover:brightness-110 transition-all duration-200
                  font-medium text-base
                  focus:outline-none focus:ring-2 focus:ring-[#3399cc]/50
                "
          >
            <ChevronLeft className="w-5 h-5" />
            {buttonLabel}
          </button>
        </div>

        {/* Footer hint */}
        <p className="text-xs text-slate-600 mt-10">
          Error code: 404 | Resource not found
        </p>
      </div>
    </div>
  );
}
