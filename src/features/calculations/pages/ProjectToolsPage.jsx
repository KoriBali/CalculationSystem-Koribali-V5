import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import {
  Lightbulb,
  Shield,
  Monitor,
  Layers,
  ChevronRight,
  AlertCircle,
  X,
} from "lucide-react";

const PROJECT_TOOLS_TYPES = [
  {
    id: "lighting-project",
    title: "Lighting Project",
    icon: Lightbulb,
    description:
      "Calculate structural integrity and wind load for street and area lighting pole installations.",
    isInDevelopment: false,
  },
  {
    id: "signboard-project",
    title: "Signboard Project",
    icon: Monitor,
    description:
      "Analyze structural requirements for standalone and wall-mounted advertisement signboards.",
    isInDevelopment: true,
  },
  {
    id: "disaster-prevention-project",
    title: "Disaster Prevention Project",
    icon: Shield,
    description:
      "Evaluate safety factors and load capacities for emergency alert and disaster warning systems.",
    isInDevelopment: true,
  },
  {
    id: "multi-purpose-project",
    title: "Multi-purpose Project",
    icon: Layers,
    description:
      "Comprehensive analysis for structures supporting various multi-purpose load attachments.",
    isInDevelopment: true,
  },
];

export default function ProjectToolsPage() {
  const navigate = useNavigate();
  const [inDevModal, setInDevModal] = useState(null);

  const handleSelectProject = (project) => {
    if (project.isInDevelopment) {
      setInDevModal(project);
      return;
    }
    navigate(`/projects/new/${project.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Helmet>
        <title>Project Tools · KORI BALI</title>
      </Helmet>

      <div className="mx-auto w-full max-w-[1600px] px-6 hp:px-3 py-4 sm:py-6 lg:py-8">
        {/* Page header */}
        <div className="w-full max-w-[1400px] mx-auto text-left mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mb-2">
            Project Tools
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm">
            Choose the specific project module to begin the structural and load analysis configuration.
          </p>
        </div>

        {/* Project type cards - clean, professional horizontal layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 w-full max-w-[1400px] mx-auto">
          {PROJECT_TOOLS_TYPES.map((project) => {
            const Icon = project.icon;

            return (
              <div key={project.id} className="h-full">
                <button
                  type="button"
                  onClick={() => handleSelectProject(project)}
                  className="h-full group relative w-full text-left bg-white border border-slate-200 p-5 md:p-6 rounded-xl transition-all duration-200 hover:border-slate-300 hover:shadow-md flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-5"
                >
                  {/* Icon Container */}
                  <div className="flex-shrink-0 p-3.5 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors duration-300">
                    <Icon className="w-6 h-6 stroke-[1.5]" />
                  </div>

                  {/* Text Content */}
                  <div className="flex-grow">
                    <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                      <h3 className="text-base font-semibold text-slate-800 group-hover:text-blue-700 transition-colors duration-300">
                        {project.title}
                      </h3>
                      {project.isInDevelopment && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                          In Development
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed pr-4">
                      {project.description}
                    </p>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="flex-shrink-0 self-center hidden sm:flex items-center justify-center w-8 h-8 rounded-full group-hover:bg-blue-50 transition-colors duration-300">
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all duration-300" />
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notice modal for in-development project modules */}
      {inDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setInDevModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4">
              <h3 className="text-base font-bold text-slate-900">
                {inDevModal.title}
              </h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                The <strong>{inDevModal.title}</strong> module is currently in development.
              </p>
              <div className="mt-3.5 p-3.5 bg-blue-50/80 border border-blue-100 rounded-xl text-xs text-blue-900 leading-relaxed">
                💡 For the current prototype, please proceed with <strong>Lighting Project</strong> which has full calculation and drawing capabilities ready.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setInDevModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setInDevModal(null);
                  navigate("/projects/new/lighting-project");
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0d3b66] hover:bg-[#0a2c4c] rounded-lg transition-colors shadow-xs"
              >
                Open Lighting Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
