// guards/SessionGuard.jsx
import { useParams, Outlet } from "react-router-dom";

// Memastikan sessionStorage projectType selalu tersinkronisasi dengan :type di URL
// agar tidak melempar 404 saat bernavigasi antar menu (Database, Project Tools, My Works)
export default function SessionGuard() {
  const { type } = useParams();

  if (type && sessionStorage.getItem("projectType") !== type) {
    sessionStorage.setItem("projectType", type);
  }

  return <Outlet />;
}
