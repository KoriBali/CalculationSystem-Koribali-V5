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
  PencilRuler,
  AlertCircle,
  X,
  CheckCircle2,
} from "lucide-react";

const PROJECT_TOOLS_TYPES = [
  {
    id: "lighting-project",
    title: "Lighting Pole Project",
    category: "Lighting",
    icon: Lightbulb,
    description:
      "Structural integrity, wind load calculation, and drawing input for street and area lighting pole installations.",
    status: "ready",
    statusLabel: "Ready to Use",
  },
  {
    id: "disaster-prevention-project",
    title: "Disaster Prevention Project",
    category: "Disaster Warning",
    icon: Shield,
    description:
      "Safety factor evaluation, warning loudspeaker, and load capacity analysis for emergency alert systems.",
    status: "coming_soon",
    statusLabel: "In Development",
  },
  {
    id: "signboard-project",
    title: "Signboard Project",
    category: "Signage & Billboards",
    icon: Monitor,
    description:
      "Structural wind pressure analysis for standalone and building-mounted advertisement signboard poles.",
    status: "coming_soon",
    statusLabel: "In Development",
  },
  {
    id: "multi-purpose-project",
    title: "Multi-purpose Project",
    category: "Multi-equipment",
    icon: Layers,
    description:
      "Multi-load configuration for poles supporting telecom equipment, sensors, and surveillance cameras.",
    status: "coming_soon",
    statusLabel: "In Development",
  },
];

export default function ProjectToolsPage() {
  const navigate = useNavigate();
  const [selectedNotice, setSelectedNotice] = useState(null);

  const handleSelectType = (project) => {
    if (project.status === "ready") {
      navigate(`/projects/new/${project.id}`);
    } else {
      setSelectedNotice(project);
    }
  };

  return (
    <div className="min-h-full flex flex-col">
      <Helmet>
        <title>Project Tools - KORI BALI</title>
      </Helmet>

      <div className="mx-auto w-full max-w-[2800px] px-6 hp:px-3 lg:px-4 2xl:px-8 pt-0 pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#0d3b66]/10 text-[#0d3b66] flex items-center justify-center">
              <PencilRuler className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Project Tools
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Pilih jenis project untuk memulai proses kalkulasi struktur dan input drawing teknis.
              </p>
            </div>
          </div>
        </div>

        {/* Project Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl">
          {PROJECT_TOOLS_TYPES.map((project) => {
            const Icon = project.icon;
            const isReady = project.status === "ready";

            return (
              <div
                key={project.id}
                onClick={() => handleSelectType(project)}
                className={`
                  group relative bg-white rounded-2xl border p-6 transition-all duration-200 cursor-pointer
                  flex flex-col justify-between
                  ${
                    isReady
                      ? "border-slate-200 hover:border-[#0d3b66]/40 hover:shadow-md hover:-translate-y-0.5"
                      : "border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50"
                  }
                `}
              >
                <div>
                  {/* Card Top: Icon & Status Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`
                        w-12 h-12 rounded-xl flex items-center justify-center transition-colors
                        ${
                          isReady
                            ? "bg-amber-50 text-amber-600 group-hover:bg-[#0d3b66] group-hover:text-white"
                            : "bg-slate-100 text-slate-500"
                        }
                      `}
                    >
                      <Icon className="w-6 h-6 stroke-[1.8]" />
                    </div>

                    <span
                      className={`
                        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border
                        ${
                          isReady
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }
                      `}
                    >
                      {isReady && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      {project.statusLabel}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3
                    className={`
                      text-lg font-bold transition-colors
                      ${
                        isReady
                          ? "text-slate-900 group-hover:text-[#0d3b66]"
                          : "text-slate-800"
                      }
                    `}
                  >
                    {project.title}
                  </h3>
                  <p className="text-slate-500 text-xs sm:text-sm mt-1.5 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                {/* Card Footer: Action Link */}
                <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span
                    className={`
                      text-xs font-semibold
                      ${
                        isReady
                          ? "text-[#0d3b66] group-hover:underline"
                          : "text-slate-400"
                      }
                    `}
                  >
                    {isReady ? "Mulai Kalkulasi & Drawing" : "Lihat Informasi Modul"}
                  </span>
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center transition-all
                      ${
                        isReady
                          ? "bg-slate-100 text-slate-600 group-hover:bg-[#0d3b66] group-hover:text-white group-hover:translate-x-0.5"
                          : "bg-slate-50 text-slate-400"
                      }
                    `}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notice Modal for In-development modules */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4">
              <h3 className="text-base font-bold text-slate-900">
                {selectedNotice.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                Modul <strong>{selectedNotice.title}</strong> saat ini sedang dalam tahap pengembangan prototype.
              </p>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800">
                💡 Untuk prototype saat ini, silakan gunakan <strong>Lighting Pole Project</strong> yang telah siap dengan alur kalkulasi dan drawing lengkap.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedNotice(null);
                  navigate("/projects/new/lighting-project");
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0d3b66] hover:bg-[#0a2c4c] rounded-lg transition-colors shadow-xs"
              >
                Buka Lighting Pole
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
