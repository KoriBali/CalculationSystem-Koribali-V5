import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet";
import {
  Lightbulb,
  Monitor,
  Shield,
  Layers,
  ChevronRight,
  ChevronLeft,
  FilePen,
  AlertCircle,
  X,
} from "lucide-react";
import { PROJECT_TYPES } from "../constants/projectTypes";
import { DISCARD_NEW_REQUEST_COPY } from "../constants/requestFormOptions";
import { ConfirmResetAllModal } from "../components/modals/ConfirmResetAllModal";
import {
  clearNewRequestDraft,
  unfinishedNewRequest,
} from "../utils/newRequestDraft";

import {
  getMasterPoleCategories,
  getCachedPoleCategories,
} from "../services/masterDataService";

// === CONSTANTS ===
const HEADER_ANIMATION = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const cardAnimation = (index) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: index * 0.05 },
});

// Professional descriptions and icons mapping (retains all rich explanations as requested)
const PROJECT_METADATA = {
  "lighting-project": {
    id: "lighting-project",
    title: "Lighting Project",
    icon: Lightbulb,
    description:
      "Calculate structural integrity and wind load for street and area lighting pole installations.",
  },
  lighting: {
    id: "lighting-project",
    title: "Lighting Project",
    icon: Lightbulb,
    description:
      "Calculate structural integrity and wind load for street and area lighting pole installations.",
  },
  "signboard-project": {
    id: "signboard-project",
    title: "Signboard Project",
    icon: Monitor,
    description:
      "Analyze structural requirements for standalone and wall-mounted advertisement signboards.",
  },
  signboard: {
    id: "signboard-project",
    title: "Signboard Project",
    icon: Monitor,
    description:
      "Analyze structural requirements for standalone and wall-mounted advertisement signboards.",
  },
  "disaster-prevention-project": {
    id: "disaster-prevention-project",
    title: "Disaster Prevention Project",
    icon: Shield,
    description:
      "Evaluate safety factors and load capacities for emergency alert and disaster warning systems.",
  },
  "disaster-prevention": {
    id: "disaster-prevention-project",
    title: "Disaster Prevention Project",
    icon: Shield,
    description:
      "Evaluate safety factors and load capacities for emergency alert and disaster warning systems.",
  },
  disaster_prevention: {
    id: "disaster-prevention-project",
    title: "Disaster Prevention Project",
    icon: Shield,
    description:
      "Evaluate safety factors and load capacities for emergency alert and disaster warning systems.",
  },
  acemast: {
    id: "disaster-prevention-project",
    title: "Disaster Prevention Project",
    icon: Shield,
    description:
      "Evaluate safety factors and load capacities for emergency alert and disaster warning systems.",
  },
  "multi-purpose-project": {
    id: "multi-purpose-project",
    title: "Multi-purpose Project",
    icon: Layers,
    description:
      "Comprehensive analysis for structures supporting various multi-purpose load attachments.",
  },
  "multi-purpose": {
    id: "multi-purpose-project",
    title: "Multi-purpose Project",
    icon: Layers,
    description:
      "Comprehensive analysis for structures supporting various multi-purpose load attachments.",
  },
  multi_purpose: {
    id: "multi-purpose-project",
    title: "Multi-purpose Project",
    icon: Layers,
    description:
      "Comprehensive analysis for structures supporting various multi-purpose load attachments.",
  },
  multiple: {
    id: "multi-purpose-project",
    title: "Multi-purpose Project",
    icon: Layers,
    description:
      "Comprehensive analysis for structures supporting various multi-purpose load attachments.",
  },
};

// Preferred visual display order: Lighting first, then Signboard, Disaster Prevention, Multi-purpose
const PREFERRED_PROJECT_ORDER = [
  "lighting-project",
  "signboard-project",
  "disaster-prevention-project",
  "multi-purpose-project",
];

const getProjectPriority = (id) => {
  const index = PREFERRED_PROJECT_ORDER.indexOf(id);
  return index === -1 ? 99 : index;
};

const mapCategories = (apiCategories) => {
  if (!Array.isArray(apiCategories) || apiCategories.length === 0) {
    return PROJECT_TYPES.map((pt) => ({
      ...pt,
      icon: PROJECT_METADATA[pt.id]?.icon || Layers,
      description:
        PROJECT_METADATA[pt.id]?.description ||
        "Standard structural calculation module.",
      isInDevelopment: pt.id !== "lighting-project",
    })).sort((a, b) => getProjectPriority(a.id) - getProjectPriority(b.id));
  }

  return apiCategories
    .filter((cat) => cat.isActive !== false)
    .map((cat) => {
      const rawKey = String(cat.name || "").toLowerCase().trim();
      const normalizedKey = rawKey.replace(/_/g, "-");
      const meta =
        PROJECT_METADATA[rawKey] ||
        PROJECT_METADATA[normalizedKey] ||
        PROJECT_METADATA[`${normalizedKey}-project`] ||
        PROJECT_METADATA[`${rawKey}-project`];

      if (meta) {
        return {
          id: meta.id,
          title: meta.title,
          icon: meta.icon,
          description: meta.description, // Crucial: preserved explanation per user request
          isInDevelopment: meta.id !== "lighting-project",
          backendCategory: cat,
        };
      }

      const words = String(cat.name || "Pole")
        .replace(/[_-]+/g, " ")
        .trim()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
      const title = words.toLowerCase().endsWith("project")
        ? words
        : `${words} Project`;

      return {
        id: `${normalizedKey}-project`,
        title,
        icon: Layers,
        description: `Comprehensive analysis and structural configuration for ${words.toLowerCase()} installations.`,
        isInDevelopment: true,
        backendCategory: cat,
      };
    })
    .sort((a, b) => getProjectPriority(a.id) - getProjectPriority(b.id));
};

// === COMPONENT ===
export default function ProjectSelectPage() {
  const navigate = useNavigate();

  // Load from master data or cached categories, with graceful fallback
  const [projectTypesList, setProjectTypesList] = useState(() => {
    const cached = getCachedPoleCategories();
    return mapCategories(cached);
  });

  // A New Request left with entries (e.g. via the browser's Back button):
  // offered to continue or discard before starting another one.
  const [unfinishedType, setUnfinishedType] = useState(unfinishedNewRequest);
  const unfinishedTitle = projectTypesList.find(
    (p) => p.id === unfinishedType,
  )?.title || PROJECT_TYPES.find((p) => p.id === unfinishedType)?.title;
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [inDevModal, setInDevModal] = useState(null);

  useEffect(() => {
    let isMounted = true;
    sessionStorage.removeItem("projectType");

    getMasterPoleCategories().then((apiCategories) => {
      if (isMounted && Array.isArray(apiCategories) && apiCategories.length > 0) {
        setProjectTypesList(mapCategories(apiCategories));
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectProject = (projectId) => {
    const isLighting =
      projectId === "lighting-project" || projectId === "lighting";
    if (!isLighting) {
      const selected =
        projectTypesList.find((p) => p.id === projectId) ||
        PROJECT_TYPES.find((p) => p.id === projectId);
      setInDevModal(selected || { title: "This Project" });
      return;
    }

    const isValid =
      projectTypesList.some((p) => p.id === projectId) ||
      PROJECT_TYPES.some((p) => p.id === projectId);
    if (!isValid) {
      navigate("/404");
      return;
    }
    navigate(`/projects/new/${projectId}`);
  };

  return (
    <div className="min-h-full flex flex-col">
      <Helmet>
        <title>Select Project Type — New Project · KORI BALI</title>
      </Helmet>
      <div className="mx-auto w-full max-w-[1600px] px-6 hp:px-3 py-4 sm:py-6 lg:py-8 pt-0">
        {/* ── Page header ── */}
        <motion.div
          {...HEADER_ANIMATION}
          className="w-full max-w-[1400px] mx-auto text-left mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Select Project Type
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm">
              Choose the specific project module to begin structural calculation and technical drawing configuration.
            </p>
          </div>

          {/* Same Back style as the calculation steps. */}
          <button
            onClick={() => navigate("/projects")}
            className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap px-5 py-2.5 md:px-6 rounded-lg hp:rounded-md font-medium text-xs sm:text-sm bg-[#eef2f6] hover:bg-[#e2e8f0] text-[#0d3b66] ring-1 ring-inset ring-[#d0d7e2] hover:ring-[#b8c2d1] shadow-sm transition-colors"
          >
            <ChevronLeft className="w-4 lg:w-4.5 h-4 lg:h-4.5" />
            Back to My Works
          </button>
        </motion.div>

        {/* ── Unfinished request ── */}
        {unfinishedTitle && (
          <motion.div
            {...HEADER_ANIMATION}
            className="w-full max-w-[1400px] mx-auto mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 sm:px-5 sm:py-4"
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="shrink-0 p-2 rounded-lg bg-white text-[#0d3b66] border border-blue-100">
                <FilePen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  You have an unfinished project
                </p>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Your <span className="font-medium">{unfinishedTitle}</span>{" "}
                  project hasn&apos;t been saved yet. Continue where you left
                  off, or discard it. Opening another project type also discards
                  it.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setConfirmDiscard(true)}
                className="h-9 px-4 rounded-lg hp:rounded-md text-xs sm:text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => navigate(`/projects/new/${unfinishedType}`)}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg hp:rounded-md text-xs sm:text-sm font-medium bg-[#0d3b66] text-white hover:bg-[#0b3157] shadow-sm transition-colors"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Project type cards ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 w-full max-w-[1400px] mx-auto">
          {projectTypesList.map((project, index) => {
            const Icon = project.icon || Layers;

            return (
              <motion.div
                key={project.id}
                {...cardAnimation(index)}
                className="h-full"
              >
                <button
                  onClick={() => handleSelectProject(project.id)}
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
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
              </motion.div>
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

      <ConfirmResetAllModal
        {...DISCARD_NEW_REQUEST_COPY}
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onReset={() => {
          clearNewRequestDraft();
          setUnfinishedType(null);
        }}
      />
    </div>
  );
}
