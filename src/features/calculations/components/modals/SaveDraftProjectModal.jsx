import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronDown,
  Info,
  Save,
  FolderPlus,
  FolderOpen,
  ChevronRight,
} from "lucide-react";
import { getAllRequests } from "../../data/requestStore";

// Predefined mock projects matching the exact Figma specifications
// and common existing projects across the application.
const DEFAULT_EXISTING_PROJECTS = [
  {
    pjNo: "777732",
    projectName: "Miyashita Park Lighting Project",
    requests: [
      { requestNo: "YSC-11-11017", casesCount: 1 },
      { requestNo: "YSC-10-10981", casesCount: 3 },
      { requestNo: "YSC-09-10874", casesCount: 2 },
    ],
  },
  {
    pjNo: "777880",
    projectName: "Shinjuku Station South District",
    requests: [
      { requestNo: "YSC-08-10650", casesCount: 2 },
      { requestNo: "YSC-07-10512", casesCount: 1 },
    ],
  },
  {
    pjNo: "777224",
    projectName: "Shibuya Crossing Lighting Upgrade",
    requests: [
      { requestNo: "YSC-06-10332", casesCount: 4 },
      { requestNo: "YSC-05-10219", casesCount: 1 },
    ],
  },
  {
    pjNo: "12345",
    projectName: "Tokyo Electric Distribution",
    requests: [
      { requestNo: "REQ-0001", casesCount: 2 },
    ],
  },
  {
    pjNo: "T-100234",
    projectName: "Yokohama Expressway Lighting",
    requests: [
      { requestNo: "REQ-0002", casesCount: 1 },
    ],
  },
];

// Input style — matches AddCaseModal / TransferOwnershipModal inputs
const inputStyle = (hasError = false) =>
  `w-full px-3 xl:px-4 py-2 lg:py-2.5 rounded-lg hp:rounded-md outline-none transition-all text-xs md:text-sm border text-slate-800 placeholder:text-slate-400
  ${hasError
    ? "border-red-500 bg-[#fff5f5] ring-1 ring-red-200"
    : "border-gray-300 bg-white focus:border-[#3399cc] focus:ring-1 focus:ring-[#3399cc]"
  }`;

const labelStyle =
  "block text-xs md:text-sm text-gray-700 mb-1.5 md:mb-2 font-medium";

// Selectable option card — 2-column card matching AddCaseModal & TransferOwnershipModal style
const ModeOption = ({ icon: Icon, title, desc, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group w-full flex flex-col justify-between p-4 sm:p-5 text-left relative overflow-hidden rounded-xl border transition-all duration-300 cursor-pointer active:scale-[0.98] ${active
      ? "border-blue-500 bg-blue-50/60 shadow-sm ring-1 ring-blue-500/20"
      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
      }`}
  >
    <div className="flex items-center justify-between w-full mb-3">
      <div
        className={`p-2 rounded-lg shrink-0 transition-colors ${active
          ? "bg-blue-100 text-blue-600"
          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/70"
          }`}
      >
        <Icon size={20} />
      </div>
      <div className="shrink-0 flex items-center">
        {active ? (
          <CheckCircle className="w-5 h-5 text-blue-500" />
        ) : (
          <Circle className="w-5 h-5 text-slate-300 group-hover:text-slate-400" />
        )}
      </div>
    </div>
    <div>
      <p
        className={`text-sm sm:text-base font-semibold ${active ? "text-slate-900" : "text-slate-700"
          }`}
      >
        {title}
      </p>
      <p
        className={`text-xs mt-1 leading-relaxed ${active ? "text-slate-500" : "text-slate-400"
          }`}
      >
        {desc}
      </p>
    </div>
  </button>
);

export function SaveDraftProjectModal({
  open,
  onClose,
  onNext,
  initialMode = "new",
  initialPjNo = "",
}) {
  const [mode, setMode] = useState(initialMode); // "new" | "existing"
  const [projectNo, setProjectNo] = useState(initialPjNo);
  const [selectedRequest, setSelectedRequest] = useState("");
  const [isPjnoDropdownOpen, setIsPjnoDropdownOpen] = useState(false);
  const [isRequestDropdownOpen, setIsRequestDropdownOpen] = useState(false);

  const pjnoDropdownRef = useRef(null);
  const requestDropdownRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setMode(initialMode || "new");
      setProjectNo(initialPjNo || "");
      setSelectedRequest("");
      setIsPjnoDropdownOpen(false);
      setIsRequestDropdownOpen(false);
    }
  }, [open, initialMode, initialPjNo]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        pjnoDropdownRef.current &&
        !pjnoDropdownRef.current.contains(e.target)
      ) {
        setIsPjnoDropdownOpen(false);
      }
      if (
        requestDropdownRef.current &&
        !requestDropdownRef.current.contains(e.target)
      ) {
        setIsRequestDropdownOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Aggregate projects from requestStore + defaults
  const existingProjects = useMemo(() => {
    const map = new Map();

    // 1. Seed with Figma default mock projects
    DEFAULT_EXISTING_PROJECTS.forEach((p) => {
      map.set(p.pjNo.toLowerCase(), { ...p });
    });

    // 2. Add projects from active requestStore
    try {
      const allReqs = getAllRequests();
      Object.values(allReqs || {}).forEach((req) => {
        const pj =
          req.pjNo ||
          req.fields?.projectNo ||
          req.projectNo ||
          "";
        if (!pj || pj === "—" || pj === "null") return;
        const key = pj.toLowerCase();
        const reqItem = {
          requestNo: req.requestNo || req.fields?.requestNo || `REQ-${req.id}`,
          casesCount: Array.isArray(req.cases) ? req.cases.length : 1,
        };

        if (map.has(key)) {
          const existing = map.get(key);
          const reqExists = existing.requests.some(
            (r) => r.requestNo === reqItem.requestNo
          );
          if (!reqExists) {
            existing.requests.push(reqItem);
          }
        } else {
          map.set(key, {
            pjNo: pj,
            projectName: req.fields?.projectName || req.subject || "Project",
            requests: [reqItem],
          });
        }
      });
    } catch {
      // Ignore reading error, fallback to defaults
    }

    return Array.from(map.values());
  }, []);

  if (!open) return null;

  const trimmedPj = projectNo.trim();
  const matchedExisting = existingProjects.find(
    (p) => p.pjNo.toLowerCase() === trimmedPj.toLowerCase()
  );
  const isPjExisting = Boolean(matchedExisting);

  // Suggestions for autocomplete in existing mode
  const matchingProjects = existingProjects.filter((p) =>
    !trimmedPj ? true : p.pjNo.toLowerCase().includes(trimmedPj.toLowerCase())
  );

  // Active requests for selected existing project
  const availableRequests = matchedExisting?.requests || [];

  const handleSwitchToExisting = (pNo) => {
    setMode("existing");
    setProjectNo(pNo);
    setIsPjnoDropdownOpen(false);
    setIsRequestDropdownOpen(false);
    setSelectedRequest("");
  };

  const handleSwitchToNew = (pNo) => {
    setMode("new");
    setProjectNo(pNo);
    setIsPjnoDropdownOpen(false);
    setIsRequestDropdownOpen(false);
    setSelectedRequest("");
  };

  const handleNextClick = () => {
    // "button nextnya ga berfungsi gpp"
    if (onNext) {
      onNext({
        mode,
        projectNo: trimmedPj,
        requestNo: selectedRequest,
      });
    }
    onClose?.();
  };

  const canProceed =
    trimmedPj.length > 0 &&
    (mode === "new" ? !isPjExisting : isPjExisting && Boolean(selectedRequest));

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg md:max-w-2xl bg-white rounded-2xl shadow-2xl overflow-visible flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0d3b66] to-[#1a5a92] px-6 sm:px-8 py-5 flex items-center justify-between shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3 text-white">
            <Save className="w-5 h-5 text-white shrink-0" />
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white">
                Save this draft?
              </h3>
              <p className="text-xs text-blue-100/80 font-normal">
                Save this calculation to a new project or an existing project
              </p>
            </div>
          </div>
        </div>

        {/* Info strip — matching TransferOwnershipModal & InitialAssignment notice */}
        <div className="px-6 sm:px-8 py-3.5 bg-blue-50/70 border-b border-blue-100/70 flex items-start gap-2.5 shrink-0">
          <Info className="w-4 h-4 text-[#3399cc] shrink-0 mt-0.5" />
          <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
            Project information is required before saving. You'll fill it in on the next page, and your draft is saved only after you complete it.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-5 sm:space-y-6">
          {/* Save destination */}
          <div>
            <label className={labelStyle}>
              Save Destination <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ModeOption
                icon={FolderPlus}
                title="New project"
                desc="Create a new project from this draft."
                active={mode === "new"}
                onClick={() => {
                  setMode("new");
                  setIsPjnoDropdownOpen(false);
                  setIsRequestDropdownOpen(false);
                }}
              />
              <ModeOption
                icon={FolderOpen}
                title="Add to existing project"
                desc="Add this draft as a new case in an existing project."
                active={mode === "existing"}
                onClick={() => {
                  setMode("existing");
                  setIsPjnoDropdownOpen(false);
                  setIsRequestDropdownOpen(false);
                }}
              />
            </div>
          </div>

          {/* ─── MODE: NEW PROJECT ─── */}
          {mode === "new" && (
            <div>
              <label className={labelStyle}>
                Project No. (PJNO) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={projectNo}
                onChange={(e) => setProjectNo(e.target.value)}
                placeholder="e.g. 555532"
                className={inputStyle(false)}
              />

              {trimmedPj.length === 0 && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Enter a new, unused project number.
                </p>
              )}

              {trimmedPj.length > 0 && !isPjExisting && (
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] md:text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{trimmedPj} is available</span>
                </div>
              )}

              {trimmedPj.length > 0 && isPjExisting && (
                <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-amber-900">
                        Project {trimmedPj} already exists. Add this draft to
                        that project instead?
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSwitchToExisting(trimmedPj)}
                        className="mt-2 px-3 py-1.5 rounded-md text-xs font-medium bg-[#eef2f6] text-[#0d3b66] ring-1 ring-inset ring-[#d0d7e2] hover:bg-[#e2e8f0] transition-colors"
                      >
                        Use existing project
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── MODE: ADD TO EXISTING PROJECT ─── */}
          {mode === "existing" && (
            <div className="space-y-5">
              {/* Project No. Autocomplete */}
              <div className="relative" ref={pjnoDropdownRef}>
                <label className={labelStyle}>
                  Project No. (PJNO) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={projectNo}
                  onFocus={() => setIsPjnoDropdownOpen(true)}
                  onChange={(e) => {
                    setProjectNo(e.target.value);
                    setIsPjnoDropdownOpen(true);
                    setSelectedRequest("");
                  }}
                  placeholder="Search or enter Project No."
                  className={inputStyle(false)}
                />

                {isPjnoDropdownOpen && matchingProjects.length > 0 && (
                  <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-44 overflow-y-auto scrollbar-soft">
                    {matchingProjects.map((p) => (
                      <button
                        key={p.pjNo}
                        type="button"
                        onClick={() => {
                          setProjectNo(p.pjNo);
                          setIsPjnoDropdownOpen(false);
                          setSelectedRequest("");
                        }}
                        className="w-full text-left px-3.5 py-2.5 text-xs md:text-sm hover:bg-blue-50 text-slate-800 transition-colors border-b border-slate-100 last:border-b-0 flex items-center justify-between gap-3"
                      >
                        <span className="font-medium">{p.pjNo}</span>
                        {p.projectName && (
                          <span className="text-[11px] md:text-xs text-slate-400 truncate max-w-[220px]">
                            {p.projectName}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {trimmedPj.length > 0 && !isPjExisting && !isPjnoDropdownOpen && (
                  <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs">
                    <div className="flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-blue-900">
                          Project {trimmedPj} does not exist in the list.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleSwitchToNew(trimmedPj)}
                          className="mt-2 px-3 py-1.5 rounded-md text-xs font-medium bg-gradient-to-r from-[#0d3b66] to-[#3399cc] text-white hover:brightness-110 shadow-sm transition-all"
                        >
                          Create as new project
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Request No. Dropdown (visible once project is recognized) */}
              {isPjExisting && (
                <div className="relative" ref={requestDropdownRef}>
                  <label className={labelStyle}>
                    Request No. <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsRequestDropdownOpen((prev) => !prev)}
                    className={`${inputStyle(false)} flex items-center justify-between text-left hover:border-slate-400`}
                  >
                    <span
                      className={
                        selectedRequest ? "text-slate-800 font-medium" : "text-slate-400"
                      }
                    >
                      {selectedRequest === "new_request"
                        ? "New Request"
                        : selectedRequest || "Select a request"}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${isRequestDropdownOpen ? "rotate-180" : ""
                        }`}
                    />
                  </button>

                  {isRequestDropdownOpen && (
                    <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-56 overflow-y-auto scrollbar-soft">
                      {availableRequests.map((req) => {
                        const isSelected = selectedRequest === req.requestNo;
                        return (
                          <div
                            key={req.requestNo}
                            onClick={() => {
                              setSelectedRequest(req.requestNo);
                              setIsRequestDropdownOpen(false);
                            }}
                            className={`flex items-center justify-between px-3.5 py-2.5 text-xs md:text-sm cursor-pointer transition-colors border-b border-slate-100 ${isSelected
                              ? "bg-blue-50 text-blue-700 font-medium"
                              : "text-slate-800 hover:bg-slate-50"
                              }`}
                          >
                            <span>{req.requestNo}</span>
                            <span className="text-[11px] px-2 py-0.5 bg-slate-100 rounded text-slate-500 font-normal">
                              {req.casesCount || 1} cases
                            </span>
                          </div>
                        );
                      })}

                      <div
                        onClick={() => {
                          setSelectedRequest("new_request");
                          setIsRequestDropdownOpen(false);
                        }}
                        className={`flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs md:text-sm cursor-pointer transition-colors ${selectedRequest === "new_request"
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "hover:bg-blue-50/60"
                          }`}
                      >
                        <span className="font-semibold text-[#0d3b66]">
                          + New request
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Create a new request in this project
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="mt-1 text-[11px] text-slate-500">
                    Pick an existing request, or choose + New request.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 sm:px-8 py-4 border-t border-slate-200 flex items-center justify-between gap-4 rounded-b-2xl shrink-0">
          <span className="hidden sm:flex items-start gap-1.5 text-xs text-slate-500 leading-snug">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>Saved after project info is completed</span>
          </span>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg hp:rounded-md font-medium text-xs sm:text-sm bg-[#eef2f6] text-[#0d3b66] ring-1 ring-inset ring-[#d0d7e2] hover:bg-[#e2e8f0] transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleNextClick}
              disabled={!canProceed}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg hp:rounded-md font-medium text-xs sm:text-sm bg-gradient-to-r from-[#0d3b66] to-[#3399cc] text-white hover:brightness-110 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all whitespace-nowrap"
            >
              <span>Next: Project Information</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

