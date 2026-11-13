import { useState } from "react";
import { useProjectStorage } from "./useProjectStorage";
import * as Utils from "../utils";

// Manages standard pole selection state — pole type, taper, and straight (stepped) pole
export function usePoleStandardForm(projectType) {
  // Pole type selector — determines which standard form is shown (taper / straight)
  const [poleTypeStandard, setPoleTypeStandard] = useProjectStorage(
    projectType,
    "poleTypeStandard",
    { type: "" },
  );

  // Taper pole fields — poleType, groundPosition, height
  const [taperPoleStandard, setTaperPoleStandard] = useProjectStorage(
    projectType,
    "taperPoleStandard",
    {
      poleType: "",
      installationPole: "",
      groundPosition: "",
      height: "",
      embedmentLength: "",
    },
  );

  // Straight (stepped) pole fields
  const [straightPoleStandard, setStraightPoleStandard] = useProjectStorage(
    projectType,
    "straightPoleStandard",
    {
      poleType: "steppedPole",
      combinationGroup: "",
      combination: "",
      upperThickness: "",
      upperLength: "",
      lowerThickness: "",
      lowerLength: "",
      embedmentLength: "",
      groundPosition: "onGL",
      lowestHeight: "",
    },
  );

  const [straightPoleErrors, setStraightPoleErrors] = useState({});
  const [taperPoleErrors, setTaperPoleErrors] = useState({});

  // Updates pole type selection — resets downstream fields on type change
  const updatePoleTypeStandard = (updates) =>
    Utils.updatePoleTypeStandard(
      poleTypeStandard,
      updates,
      setPoleTypeStandard,
    );

  // Updates taper pole fields
  const updateTaperPoleStandard = (updates) => {
    Utils.updateTaperPoleStandard(
      taperPoleStandard,
      updates,
      setTaperPoleStandard,
    );

    // Clear errors for updated fields
    setTaperPoleErrors((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const newErrors = { ...prev };
      Object.keys(updates).forEach((key) => {
        delete newErrors[key];
      });
      return newErrors;
    });
  };

  const updateStraightPoleStandard = (updates) => {
    let next = { ...updates };

    if ("groundPosition" in updates && !("lowestHeight" in updates)) {
      next.lowestHeight = "";
    }

    Utils.updateStraightPoleStandard(
      straightPoleStandard,
      next,
      setStraightPoleStandard,
    );

    // Clear errors for updated fields
    setStraightPoleErrors((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const newErrors = { ...prev };
      Object.keys(next).forEach((key) => {
        delete newErrors[key];
      });
      return newErrors;
    });
  };

  return {
    // State
    poleTypeStandard,
    taperPoleStandard,
    straightPoleStandard,
    straightPoleErrors,
    taperPoleErrors,

    // Setters
    setStraightPoleErrors,
    setTaperPoleErrors,

    // Handlers
    updatePoleTypeStandard,
    updateTaperPoleStandard,
    updateStraightPoleStandard,
  };
}
