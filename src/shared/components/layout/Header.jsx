import { motion, AnimatePresence } from "framer-motion";
import { Menu, ChevronRight } from "lucide-react";
import { ProfileDropdown } from "./ProfileDropdown";

// Top header bar
// Shows breadcrumb/page title and user profile
export function Header({
  isMobile,
  currentTitle,
  rootLabel = "My Works",
  userData,
  onRootCrumbClick,
  onProjectCrumbClick,
  onSetupCrumbClick,
  onOpenMobileSidebar,
  onLogout,
}) {
  const animationKey =
    typeof currentTitle === "string"
      ? currentTitle
      : `${currentTitle.global}-${currentTitle.stage}-${currentTitle.substage ?? ""}`;

  return (
    <header
      className="
        sticky top-0 z-40
        h-16
        bg-white/90 backdrop-blur-md
        border-b border-slate-200
        flex items-center justify-between
        px-4 lg:px-8
      "
    >
      {/* ─────────────────────────────────────────────
          LEFT SIDE
      ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Mobile menu */}
        {isMobile && (
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label="Open navigation menu"
            className="
              shrink-0
              flex items-center justify-center
              w-9 h-9
              bg-slate-100
              text-[#0d3b66]
              hover:bg-slate-200
              active:bg-slate-300
              rounded-lg
              transition-colors
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#3399cc]/40
            "
          >
            <Menu size={19} />
          </button>
        )}

        {/* Page title / Breadcrumb */}
        <AnimatePresence mode="wait">
          <motion.div
            key={animationKey}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="min-w-0 flex items-center"
          >
            {typeof currentTitle === "string" ? (
              /* Normal page title */
              <h1
                className="
                    truncate
                    text-[13px] sm:text-sm lg:text-[15px]
                    leading-[1.4]
                    font-semibold
                    tracking-normal
                    text-slate-800
                  "
              >
                {currentTitle}
              </h1>
            ) : (
              /* Breadcrumb */
              <nav
                aria-label="Breadcrumb"
                className="
                  flex items-center
                  min-w-0
                  gap-1.5
                  text-[13px] sm:text-sm lg:text-[15px]
                  leading-[1.4]
                  tracking-normal
                "
              >
                {/* Root: Design Calculation */}
                <button
                  type="button"
                  onClick={onRootCrumbClick}
                  title="Go to Requests"
                  className="
                    hidden sm:block
                    shrink-0
                    font-medium
                    text-slate-500
                    rounded
                    hover:text-[#0d3b66]
                    transition-colors
                    focus:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#3399cc]/40
                  "
                >
                  {rootLabel}
                </button>

                <ChevronRight
                  size={14}
                  strokeWidth={2.5}
                  className="hidden sm:block shrink-0 text-slate-400"
                  aria-hidden="true"
                />

                {!currentTitle.stage ? (
                  /* NEW: Project Type landing page (e.g. Drafts) —
                     "global" is the final crumb: bold, non-clickable.
                     No separate "Drafts" text, no second chevron. */
                  <span
                    className="
                      shrink-0
                      truncate
                      max-w-[160px] lg:max-w-[240px]
                      whitespace-nowrap
                      font-semibold
                      text-slate-900
                    "
                    aria-current="page"
                  >
                    {currentTitle.global}
                  </span>
                ) : (
                  <>
                    {/* Project Type (e.g. Lighting Project) */}
                    <button
                      type="button"
                      onClick={onProjectCrumbClick}
                      title={`Go to ${currentTitle.global} drafts`}
                      className="
                        hidden sm:block
                        max-w-[120px] lg:max-w-[200px]
                        truncate
                        font-medium
                        text-slate-500
                        rounded
                        hover:text-[#0d3b66]
                        transition-colors
                        focus:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-[#3399cc]/40
                      "
                    >
                      {currentTitle.global}
                    </button>

                    <ChevronRight
                      size={14}
                      strokeWidth={2.5}
                      className="hidden sm:block shrink-0 text-slate-400"
                      aria-hidden="true"
                    />

                    {/* Project Setup — clickable when there's a substage */}
                    {currentTitle.substage ? (
                      <>
                        <button
                          type="button"
                          onClick={onSetupCrumbClick}
                          title="Go to case start"
                          className="
                            hidden sm:block
                            shrink-0
                            font-medium
                            text-slate-500
                            rounded
                            hover:text-[#0d3b66]
                            transition-colors
                            whitespace-nowrap
                            focus:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-[#3399cc]/40
                          "
                        >
                          {currentTitle.stage}
                        </button>

                        <ChevronRight
                          size={14}
                          strokeWidth={2.5}
                          className="hidden sm:block shrink-0 text-slate-400"
                          aria-hidden="true"
                        />

                        {/* Current sub-step (Initial / Pole / Opening / etc.) */}
                        <span
                          className="
                            shrink-0
                            truncate
                            max-w-[140px] lg:max-w-[220px]
                            font-semibold
                            text-slate-900
                          "
                          aria-current="page"
                        >
                          {currentTitle.substage}
                        </span>
                      </>
                    ) : (
                      /* No substage — stage is the final crumb (e.g. "Project Setup") */
                      <span
                        className="
                          shrink-0
                          whitespace-nowrap
                          font-semibold
                          text-slate-900
                        "
                        aria-current="page"
                      >
                        {currentTitle.stage}
                      </span>
                    )}
                  </>
                )}
              </nav>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─────────────────────────────────────────────
          RIGHT SIDE - PROFILE
      ───────────────────────────────────────────── */}
      <div
        className="
          shrink-0
          h-full
          flex items-center
          justify-end
          ml-4
        "
      >
        <ProfileDropdown userData={userData} onLogout={onLogout} />
      </div>
    </header>
  );
}
