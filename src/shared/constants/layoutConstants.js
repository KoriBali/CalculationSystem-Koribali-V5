export const MENU_ITEMS = [
  // Super Admin specific routes
  { name: "Dashboard", icon: "LayoutDashboard", path: "/superadmin/dashboard", roles: ["superadmin"] },
  { name: "Departments", icon: "Building2", path: "/superadmin/departments", roles: ["superadmin"] },
  { name: "Users", icon: "Users", path: "/superadmin/users", roles: ["superadmin"] },

  // Shared routes
  {
    name: "My Works",
    icon: "Briefcase",
    path: "/projects",
    roles: ["superadmin", "admin", "drafter", "drafter_checker", "admin_department"],
  },
  {
    name: "My Submissions",
    icon: "SendHorizontal",
    path: "/submissions",
    roles: ["superadmin", "admin", "drafter", "drafter_checker", "admin_department"],
  },
  {
    name: "Project Tools",
    icon: "Wrench",
    path: "/project-tools",
    roles: ["superadmin", "admin", "drafter", "drafter_checker", "admin_department"],
  },
  {
    name: "Checking Queue",
    icon: "ClipboardCheck",
    path: "/checking-queue",
    roles: ["superadmin", "admin", "drafter_checker", "admin_department"],
  },
  {
    name: "Project Database",
    icon: "Database",
    path: "/database",
    roles: ["superadmin", "admin", "drafter", "drafter_checker", "admin_department"],
  },
];

// Shared spring animation config — used across sidebar and nav animations
export const SPRING_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1,
};
