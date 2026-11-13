import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const RoleGuard = ({ allowedRoles = [] }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Allow access if no roles are explicitly required, or if the user's role is in the allowed list
  // Fallback to "drafter" if role is undefined, adjust as necessary for default assumption
  const userRole = user?.role || "drafter";
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return <Navigate to="/project-tools" replace />;
  }

  return <Outlet />;
};

export default RoleGuard;
