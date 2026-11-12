import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import {
  SendHorizontal,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Eye,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle,
  FolderOpen,
} from "lucide-react";

import { getRequests } from "../services/requestService";
import { getAllRequests } from "../data/requestStore";
import { getUser } from "../../../utils/auth";
import { formatDate, timeAgo } from "../utils/requestStatus";

// Tabs for submission statuses
const SUBMISSION_TABS = [
  { key: "all", label: "All Submissions" },
  { key: "ready_check", label: "Ready for Check" },
  { key: "in_review", label: "Under Review" },
  { key: "correction", label: "Needs Correction" },
  { key: "cleared", label: "Cleared / Completed" },
];

// Status badge styling and label mapping
function getSubmissionBadge(status) {
  const norm = String(status || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (norm.includes("ready_check") || norm === "ready_to_check" || norm === "waiting_checker") {
    return {
      label: "Ready for Check",
      color: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/10",
      dot: "bg-amber-500",
    };
  }
  if (norm.includes("review") || norm.includes("checking") || norm === "in_progress_review") {
    return {
      label: "Under Review",
      color: "bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/10",
      dot: "bg-blue-500",
    };
  }
  if (norm.includes("correction") || norm.includes("returned") || norm.includes("rework")) {
    return {
      label: "Needs Correction",
      color: "bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10",
      dot: "bg-rose-500",
    };
  }
  if (norm.includes("cleared") || norm.includes("approved") || norm.includes("done")) {
    return {
      label: "Cleared",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10",
      dot: "bg-emerald-500",
    };
  }
  if (norm.includes("ready_submit") || norm.includes("submitted")) {
    return {
      label: "Submitted to Japan",
      color: "bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/10",
      dot: "bg-indigo-500",
    };
  }
  return {
    label: "In Progress",
    color: "bg-slate-50 text-slate-700 border-slate-200 ring-slate-500/10",
    dot: "bg-slate-400",
  };
}

export default function MySubmissionsPage() {
  const navigate = useNavigate();
  const currentUser = getUser();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [workTypeFilter, setWorkTypeFilter] = useState("all");

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      let data = [];
      try {
        const res = await getRequests({ limit: 100 });
        if (Array.isArray(res)) {
          data = res;
        } else if (Array.isArray(res?.data)) {
          data = res.data;
        }
      } catch (err) {
        console.warn("Could not fetch remote requests for submissions, using local store:", err);
      }

      if (!data || data.length === 0) {
        data = getAllRequests();
      }

      setRequests(data || []);
    } catch (error) {
      console.error("Failed to load requests for submissions:", error);
      setRequests(getAllRequests());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  // Flatten requests into an array of submission items (cases or request items)
  const allSubmissions = useMemo(() => {
    const list = [];

    (requests || []).forEach((req) => {
      const reqNo =
        req.fields?.requestNo ||
        req.requestNo ||
        req.no ||
        req.code ||
        `REQ-${req.id?.slice(0, 6) || "001"}`;
      const projectName =
        req.fields?.projectName ||
        req.projectName ||
        req.fields?.subject ||
        "Untitled Project";
      const company =
        req.fields?.companyName ||
        req.companyName ||
        req.fields?.clientName ||
        "-";
      const projectType = req.projectType || "lighting-project";
      const cases = Array.isArray(req.cases) ? req.cases : [];

      if (cases.length > 0) {
        cases.forEach((c, idx) => {
          const caseStatus = c.status || c.state || req.status || "ready_check";
          const hasReport = Boolean(
            c.hasReport ||
            c.has_report ||
            c.reportSnapshot ||
            c.report_snapshot ||
            (Array.isArray(c.runs) && c.runs.length > 0) ||
            c.runCount > 0 ||
            c.run_count > 0 ||
            c.latestRunId
          );

          list.push({
            id: `${req.id}-${c.id || idx}`,
            requestId: req.id,
            requestNo: reqNo,
            projectName,
            company,
            projectType,
            caseId: c.id,
            caseNo: c.no || String(idx + 1).padStart(3, "0"),
            caseLabel: c.label || `Case ${c.no || String(idx + 1).padStart(3, "0")}`,
            workType: c.workType || "calc",
            poleType: c.poleType || "Standard Pole",
            status: caseStatus,
            submittedAt: c.submittedAt || c.updatedAt || c.createdAt || req.updatedAt || req.createdAt,
            checkedBy: c.checkedBy || c.checker || null,
            hasReport,
            rawCase: c,
            rawRequest: req,
          });
        });
      } else {
        // Fallback for requests without individual cases defined yet
        list.push({
          id: req.id,
          requestId: req.id,
          requestNo: reqNo,
          projectName,
          company,
          projectType,
          caseId: null,
          caseNo: "001",
          caseLabel: "Main Case",
          workType: "calc",
          poleType: "Standard Pole",
          status: req.status || "ready_check",
          submittedAt: req.updatedAt || req.createdAt,
          checkedBy: req.checkedBy || null,
          hasReport: false,
          rawCase: null,
          rawRequest: req,
        });
      }
    });

    // Sort by latest submission date descending
    return list.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  }, [requests]);

  // Tab counters
  const counts = useMemo(() => {
    let readyCheck = 0;
    let inReview = 0;
    let correction = 0;
    let cleared = 0;

    allSubmissions.forEach((item) => {
      const norm = String(item.status || "").toLowerCase().replace(/[\s-]+/g, "_");
      if (norm.includes("ready_check") || norm === "ready_to_check" || norm === "waiting_checker") {
        readyCheck++;
      } else if (norm.includes("review") || norm.includes("checking")) {
        inReview++;
      } else if (norm.includes("correction") || norm.includes("returned") || norm.includes("rework")) {
        correction++;
      } else if (norm.includes("cleared") || norm.includes("approved") || norm.includes("done")) {
        cleared++;
      }
    });

    return {
      all: allSubmissions.length,
      ready_check: readyCheck,
      in_review: inReview,
      correction: correction,
      cleared: cleared,
    };
  }, [allSubmissions]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return allSubmissions.filter((item) => {
      // Tab filter
      if (activeTab !== "all") {
        const norm = String(item.status || "").toLowerCase().replace(/[\s-]+/g, "_");
        if (activeTab === "ready_check" && !(norm.includes("ready_check") || norm === "ready_to_check" || norm === "waiting_checker")) {
          return false;
        }
        if (activeTab === "in_review" && !(norm.includes("review") || norm.includes("checking"))) {
          return false;
        }
        if (activeTab === "correction" && !(norm.includes("correction") || norm.includes("returned") || norm.includes("rework"))) {
          return false;
        }
        if (activeTab === "cleared" && !(norm.includes("cleared") || norm.includes("approved") || norm.includes("done"))) {
          return false;
        }
      }

      // Work type filter
      if (workTypeFilter !== "all" && item.workType !== workTypeFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const match =
          item.requestNo.toLowerCase().includes(query) ||
          item.projectName.toLowerCase().includes(query) ||
          item.company.toLowerCase().includes(query) ||
          item.caseLabel.toLowerCase().includes(query);
        if (!match) return false;
      }

      return true;
    });
  }, [allSubmissions, activeTab, workTypeFilter, searchQuery]);

  return (
    <div className="min-h-full flex flex-col">
      <Helmet>
        <title>My Submissions - KORI BALI</title>
      </Helmet>

      <div className="mx-auto w-full max-w-[2800px] px-6 hp:px-3 lg:px-4 2xl:px-8 pt-0 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <SendHorizontal className="w-7 h-7 text-[#0d3b66]" />
              My Submissions
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm">
              Track and monitor the status of calculation cases and drawings submitted for checking, review, or approval.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadSubmissions}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => navigate("/projects")}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0d3b66] rounded-lg hover:bg-[#0a2c4c] transition-colors shadow-sm"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Go to My Works
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <SendHorizontal className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Submissions</p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{counts.all}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Ready for Check</p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{counts.ready_check}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Needs Correction</p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{counts.correction}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Cleared / Approved</p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{counts.cleared}</h3>
            </div>
          </div>
        </div>

        {/* Tabs & Search Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-200 px-4 py-3 gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 lg:pb-0">
              {SUBMISSION_TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                const count = counts[tab.key] ?? 0;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
                      ${
                        isActive
                          ? "bg-[#0d3b66] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }
                    `}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`
                        text-[11px] px-1.5 py-0.2 rounded-full font-bold
                        ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-600"
                        }
                      `}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2.5">
              {/* Work Type selector */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={workTypeFilter}
                  onChange={(e) => setWorkTypeFilter(e.target.value)}
                  className="bg-transparent text-slate-700 text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="calc">Calculation</option>
                  <option value="drawing">Drawing</option>
                </select>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search project or case..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3399cc]/40 focus:border-[#3399cc] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Request & Project</th>
                  <th className="py-3 px-4">Case Detail</th>
                  <th className="py-3 px-4">Work Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4">Assigned Checker</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <SendHorizontal className="w-10 h-10 mb-2 stroke-[1.5] text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">No submissions found</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                          {searchQuery
                            ? "No submitted cases match your search criteria."
                            : "Once calculation cases are submitted for check, they will show up here."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((sub, index) => {
                    const badge = getSubmissionBadge(sub.status);
                    return (
                      <tr
                        key={sub.id}
                        className="hover:bg-blue-50/30 transition-colors group"
                      >
                        {/* Index */}
                        <td className="py-3.5 px-4 text-center font-mono text-slate-400 text-[11px]">
                          {index + 1}
                        </td>

                        {/* Request & Project */}
                        <td className="py-3.5 px-4 min-w-[200px]">
                          <button
                            type="button"
                            onClick={() => navigate(`/projects/detail/${sub.requestId}`)}
                            className="text-left group-hover:text-[#0d3b66] transition-colors"
                          >
                            <span className="font-semibold text-slate-900 block group-hover:underline">
                              {sub.requestNo}
                            </span>
                            <span className="text-slate-500 text-[11px] truncate block max-w-xs">
                              {sub.projectName}
                            </span>
                            {sub.company && sub.company !== "-" && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {sub.company}
                              </span>
                            )}
                          </button>
                        </td>

                        {/* Case */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800">
                              {sub.caseLabel}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {sub.poleType}
                          </span>
                        </td>

                        {/* Work Type */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`
                              inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold
                              ${
                                sub.workType === "drawing"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200/60"
                                  : "bg-sky-50 text-sky-700 border border-sky-200/60"
                              }
                            `}
                          >
                            {sub.workType === "drawing" ? "Drawing" : "Calculation"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`
                              inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ring-1
                              ${badge.color}
                            `}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                        </td>

                        {/* Submitted Date */}
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          <div>{formatDate(sub.submittedAt)}</div>
                          <div className="text-[10px] text-slate-400">
                            {timeAgo(sub.submittedAt)}
                          </div>
                        </td>

                        {/* Checker */}
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {sub.checkedBy ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                              <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold flex items-center justify-center text-slate-600">
                                {sub.checkedBy.slice(0, 1).toUpperCase()}
                              </span>
                              {sub.checkedBy}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Project Detail button */}
                            <button
                              type="button"
                              onClick={() => navigate(`/projects/detail/${sub.requestId}`)}
                              title="Open Project Details"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Details
                            </button>

                            {/* View Report button if available */}
                            {sub.caseId && (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/projects/${sub.projectType}/${sub.caseId}/report`)
                                }
                                title="View Calculation Report"
                                className={`
                                  inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors
                                  ${
                                    sub.hasReport
                                      ? "text-[#0d3b66] bg-blue-50 hover:bg-blue-100 border border-blue-200"
                                      : "text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200"
                                  }
                                `}
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Report
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

