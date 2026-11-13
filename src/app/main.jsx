import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { initStorageScoping } from "../utils/storageScope.js";
import "../index.css";
import App from "./App.jsx";

// Initialize sessionStorage scoping so Project Tools and My Works never collide
initStorageScoping();

// Disable mouse wheel increment/decrement on number inputs globally
document.addEventListener(
  "wheel",
  () => {
    if (
      document.activeElement &&
      document.activeElement.tagName === "INPUT" &&
      document.activeElement.type === "number"
    ) {
      document.activeElement.blur();
    }
  },
  { passive: true }
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
