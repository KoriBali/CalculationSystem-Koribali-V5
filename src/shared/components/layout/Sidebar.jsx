import { motion, AnimatePresence } from "framer-motion";
import { NavLink, useLocation } from "react-router-dom";
import {
  Calculator,
  FileText,
  ChevronLeft,
  X,
  Database,
  LayoutDashboard,
  Building2,
  Users,
  ClipboardCheck,
  Briefcase,
  SendHorizontal,
  Wrench,
  DraftingCompass,
  PencilRuler,
  FolderKanban,
  PenTool,
  Ruler,
  Component,
  Shapes,
  SlidersHorizontal,
} from "lucide-react";

import { MENU_ITEMS, SPRING_TRANSITION } from "../../constants/layoutConstants";

// ─────────────────────────────────────────────────────────────────────────────
// ICON MAP
// ─────────────────────────────────────────────────────────────────────────────

const ICON_MAP = {
  LayoutDashboard,
  Building2,
  Users,
  Calculator,
  FileText,
  Database,
  ClipboardCheck,
  Briefcase,
  SendHorizontal,
  Wrench,
  DraftingCompass,
  PencilRuler,
  FolderKanban,
  PenTool,
  Ruler,
  Component,
  Shapes,
  SlidersHorizontal,
};

// ─────────────────────────────────────────────────────────────────────────────
// NAV ITEM
// Used by both desktop and mobile sidebar
// ─────────────────────────────────────────────────────────────────────────────

function NavItem({ item, path, isActive, isCollapsed, layoutId }) {
  return (
    <NavLink
      to={path}
      title={isCollapsed ? item.name : undefined}
      className={`
        group
        relative
        flex items-center
        h-[46px]
        transition-colors duration-200

        ${
          isCollapsed
            ? "justify-center w-11 mx-auto rounded-lg"
            : "gap-3 px-3 mx-1 rounded-lg"
        }

        ${isActive ? "text-white" : "text-white/65 hover:text-white"}
      `}
    >
      {/* Active background */}
      {isActive && (
        <motion.div
          layoutId={layoutId}
          className="
            absolute inset-0
            bg-white/15
            rounded-lg
            z-0
          "
          transition={SPRING_TRANSITION}
        />
      )}

      {/* Inactive hover background */}
      {!isActive && (
        <div
          className="
            absolute inset-0
            rounded-lg
            bg-transparent
            group-hover:bg-white/[0.07]
            transition-colors duration-200
            z-0
          "
        />
      )}

      {/* Icon */}
      <item.icon
        size={20}
        strokeWidth={1.9}
        className={`
          relative z-10
          shrink-0
          transition-transform duration-200

          ${!isActive ? "group-hover:translate-x-[1px]" : ""}
        `}
      />

      {/* Label */}
      {!isCollapsed && (
        <span
          className={`
            relative z-10
            whitespace-nowrap

            text-[13px]
            lg:text-sm

            leading-5
            tracking-normal

            transition-transform duration-200

            ${
              isActive
                ? "font-semibold"
                : "font-medium group-hover:translate-x-[1px]"
            }
          `}
        >
          {item.name}
        </span>
      )}
    </NavLink>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR LOGO
// Shared between desktop and mobile
// ─────────────────────────────────────────────────────────────────────────────

function SidebarLogo({ isCollapsed, onClose, onLogoClick }) {
  const handleClick = () => {
    onLogoClick?.();
    onClose?.();
  };

  return (
    <div
      className={`
        flex items-center
        h-16 md:h-20
        border-b border-white/10

        ${isCollapsed ? "justify-center px-0" : "px-4"}
      `}
    >
      {/* Brand */}
      <button
        type="button"
        onClick={handleClick}
        aria-label="Go to home"
        className={`
          flex items-center
          min-w-0

          rounded-lg
          py-1.5

          transition-colors
          hover:bg-white/[0.05]

          ${isCollapsed ? "justify-center px-1" : "gap-3 px-1.5 pr-2"}
        `}
      >
        {/* Logo */}
        <span
          className="
            w-9 h-9
            md:w-10 md:h-10

            shrink-0

            flex items-center
            justify-center

            rounded-full

            bg-white/95
            p-1

            shadow-sm
            ring-1 ring-white/20
          "
        >
          <img
            src="/images/koribali-logo.webp"
            alt="KORI BALI logo"
            width={34}
            height={34}
            className="object-contain"
          />
        </span>

        {/* Company name */}
        {!isCollapsed && (
          <motion.div
            initial={{
              opacity: 0,
              x: -8,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              duration: 0.2,
            }}
            className="
              min-w-0
              flex flex-col
              items-start
              justify-center
            "
          >
            <span
              className="
                text-[15px]
                lg:text-base

                leading-tight
                font-bold
                tracking-[0.01em]

                text-white
                whitespace-nowrap
              "
            >
              KORIBALI
            </span>

            <span
              className="
                mt-1

                text-[10px]
                lg:text-[11px]

                leading-none
                font-medium
                tracking-[0.02em]

                text-white/50
                whitespace-nowrap
              "
            >
              Calculation System
            </span>
          </motion.div>
        )}
      </button>

      {/* Mobile close button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="
            ml-auto

            flex items-center
            justify-center

            w-9 h-9

            rounded-lg

            text-white/60
            hover:text-white
            hover:bg-white/[0.08]

            transition-colors
          "
        >
          <X size={19} />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────

export function MobileSidebar({
  isOpen,
  onClose,
  onLogoClick,
  getMenuPath,
  userRole,
}) {
  const location = useLocation();

  const visibleMenuItems = MENU_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(userRole || "drafter"),
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="
              fixed inset-0
              bg-slate-900/60
              backdrop-blur-sm
              z-[100]
            "
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={SPRING_TRANSITION}
            className="
              fixed
              top-0 left-0 bottom-0

              w-[250px]

              bg-gradient-to-b
              from-[#0d3b66]
              to-[#0a2c4c]

              text-white

              z-[101]

              flex flex-col

              shadow-2xl
              border-r border-[#08223d]
            "
          >
            <SidebarLogo
              isCollapsed={false}
              onClose={onClose}
              onLogoClick={onLogoClick}
            />

            {/* Navigation */}
            <nav className="flex-1 px-2.5 pt-4 space-y-1">
              {visibleMenuItems.map((item) => {
                const path = getMenuPath(item.path);

                const isActive = location.pathname.startsWith(item.path);

                const Icon = ICON_MAP[item.icon] || FileText;

                return (
                  <NavItem
                    key={item.path}
                    item={{
                      ...item,
                      icon: Icon,
                    }}
                    path={path}
                    isActive={isActive}
                    isCollapsed={false}
                    layoutId="activeNavMobile"
                  />
                );
              })}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DESKTOP SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────

export function DesktopSidebar({
  isCollapsed,
  onToggleCollapse,
  onLogoClick,
  getMenuPath,
  userRole,
}) {
  const location = useLocation();

  const visibleMenuItems = MENU_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(userRole || "drafter"),
  );

  return (
    <motion.aside
      animate={{
        width: isCollapsed ? 72 : 224,
      }}
      transition={SPRING_TRANSITION}
      className="
        sticky top-0

        h-screen

        shrink-0

        flex flex-col

        bg-gradient-to-b
        from-[#0d3b66]
        to-[#0a2c4c]

        border-r border-[#08223d]

        text-white

        shadow-xl

        z-50
      "
    >
      {/* Logo */}
      <SidebarLogo isCollapsed={isCollapsed} onLogoClick={onLogoClick} />

      {/* Navigation */}
      <nav className="flex-1 px-2.5 pt-4 space-y-1">
        {visibleMenuItems.map((item) => {
          const path = getMenuPath(item.path);

          const isActive = location.pathname.startsWith(item.path);

          const Icon = ICON_MAP[item.icon] || FileText;

          return (
            <NavItem
              key={item.path}
              item={{
                ...item,
                icon: Icon,
              }}
              path={path}
              isActive={isActive}
              isCollapsed={isCollapsed}
              layoutId="activeNavDesktop"
            />
          );
        })}
      </nav>

      {/* Collapse button */}
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="
          flex items-center
          justify-center

          h-12
          shrink-0

          border-t border-white/10

          text-white/45

          hover:text-white
          hover:bg-white/[0.08]

          transition-colors

          group
        "
      >
        <ChevronLeft
          size={18}
          strokeWidth={1.8}
          className={`
            transition-transform duration-300

            ${isCollapsed ? "rotate-180" : ""}
          `}
        />
      </button>
    </motion.aside>
  );
}
