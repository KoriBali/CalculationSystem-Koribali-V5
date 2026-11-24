import { useState, useEffect, useRef } from "react";
import { useProjectStorage } from "./useProjectStorage";
import * as Utils from "../utils";

// Manages arm + arm object state — add, remove, update, copy/paste, tab navigation
export function useArmForm(projectType) {
  const [arms, setArms] = useProjectStorage(projectType, "arms", []);
  const [armsErrors, setArmsErrors] = useState({});
  const [aoErrors, setAoErrors] = useState({});
  const [activeTabArm, setActiveTabArm] = useState("1");
  const [armClipboard, setArmClipboard] = useState(null);
  const [aoClipboard, setAoClipboard] = useState(null);
  const [aoInputValue, setAoInputValue] = useState("");
  const [confirmDeleteArm, setConfirmDeleteArm] = useState(null);
  const [confirmDeleteAo, setConfirmDeleteAo] = useState(null);
  const [confirmReduceAo, setConfirmReduceAo] = useState(null);

  // Persists max Arm ID to prevent conflicts after reload
  const armIdRef = useRef(1);
  useEffect(() => {
    const saved = sessionStorage.getItem(`${projectType}_arms`);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    const maxId = Math.max(0, ...parsed.map((a) => Number(a.idArm)));
    armIdRef.current = maxId + 1;
  }, [projectType]);

  // Persists max Arm Object ID across all arms
  const aoIdRef = useRef(1);
  useEffect(() => {
    const saved = sessionStorage.getItem(`${projectType}_arms`);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    const allAoIds = parsed.flatMap(
      (a) => a.armObjects?.map((o) => Number(o.idAo)) || [],
    );
    const maxId = Math.max(0, ...allAoIds);
    aoIdRef.current = maxId + 1;
  }, [projectType]);

  // Guards active tab — resets to first arm if active becomes invalid
  useEffect(() => {
    if (arms.length === 0) return;
    const isValid = arms.some((a) => a.idArm === activeTabArm);
    if (!isValid) setActiveTabArm(arms[0].idArm);
  }, [arms, activeTabArm]);

  // Derived state
  const activeArm = arms.find((a) => a.idArm === activeTabArm);
  const armObjects = activeArm?.armObjects || [];
  const currentIndex = arms.findIndex((a) => a.idArm === activeTabArm);
  const isNextDisabledArm =
    arms.length === 1 || currentIndex === arms.length - 1;
  const isBackDisabledArm = arms.length === 1 || currentIndex === 0;

  // Updates arm objects for the currently active arm only
  const updateActiveArmObjects = (newObjects) => {
    setArms((prev) =>
      prev.map((a) =>
        a.idArm === activeTabArm ? { ...a, armObjects: newObjects } : a,
      ),
    );
  };

  // ── Arm handlers ──

  const addArm = () => Utils.addArm(arms, setArms, setActiveTabArm, armIdRef);
  const copyArm = (arm) => Utils.copyArm(arm, setArmClipboard);

  const pasteArm = (idArm) => {
    Utils.pasteArm(idArm, setArms, armClipboard);

    if (!armClipboard) return;

    setArmsErrors((prev) => {
      if (!prev[idArm]) return prev;
      const updatedArmErrors = { ...prev[idArm] };
      Object.keys(armClipboard).forEach((key) => {
        const val = armClipboard[key];
        const isEmpty = val === "" || val === null || val === undefined;
        if (!isEmpty) delete updatedArmErrors[key];
      });
      return { ...prev, [idArm]: updatedArmErrors };
    });
  };

  const removeArm = (idArm) =>
    Utils.removeArm(idArm, setArms, activeTabArm, setActiveTabArm);

  const updateArm = (idArm, updates) => {
    Utils.updateArm(idArm, updates, setArms, arms);

    setArmsErrors((prev) => {
      if (!prev[idArm]) return prev;
      const updatedArmErrors = { ...prev[idArm] };
      Object.keys(updates).forEach((key) => delete updatedArmErrors[key]);
      return { ...prev, [idArm]: updatedArmErrors };
    });
  };

  const resetArm = () => {
    Utils.resetCurrentArm(setArms, arms, activeTabArm);

    setArmsErrors((prev) => {
      const clearedErrors = { ...prev };
      delete clearedErrors[activeTabArm];
      return clearedErrors;
    });
  };

  const goToNextArm = () => {
    if (!isNextDisabledArm) setActiveTabArm(arms[currentIndex + 1].idArm);
  };

  const goToPrevArm = () => {
    if (!isBackDisabledArm) setActiveTabArm(arms[currentIndex - 1].idArm);
  };

  // ── Arm Object handlers ──

  const addAoByInput = () => {
    Utils.syncAoByInput(
      aoInputValue,
      armObjects,
      updateActiveArmObjects,
      aoIdRef,
      setConfirmReduceAo,
    );
    setAoInputValue("");
  };

  const addAo = () => Utils.addAo(armObjects, updateActiveArmObjects, aoIdRef);
  const copyAo = (ao) => Utils.copyAo(ao, setAoClipboard);

  const pasteAo = (idAo) => {
    Utils.pasteAo(idAo, armObjects, updateActiveArmObjects, aoClipboard);

    if (!aoClipboard) return;

    setAoErrors((prev) => {
      if (!prev[idAo]) return prev;
      const updatedAoErrors = { ...prev[idAo] };
      Object.keys(aoClipboard).forEach((key) => {
        const val = aoClipboard[key];
        const isEmpty = val === "" || val === null || val === undefined;
        if (!isEmpty) delete updatedAoErrors[key];
      });
      return { ...prev, [idAo]: updatedAoErrors };
    });
  };

  const removeAo = (idAo) =>
    Utils.removeAo(idAo, armObjects, updateActiveArmObjects);

  const updateAo = (idAo, updates) => {
    Utils.updateAo(idAo, updates, armObjects, updateActiveArmObjects);

    setAoErrors((prev) => {
      if (!prev[idAo]) return prev;
      const updatedAoErrors = { ...prev[idAo] };
      Object.keys(updates).forEach((key) => delete updatedAoErrors[key]);
      return { ...prev, [idAo]: updatedAoErrors };
    });
  };

  const resetAo = (idAo) => {
    Utils.resetCurrentAo(idAo, armObjects, updateActiveArmObjects);

    setAoErrors((prev) => {
      const clearedErrors = { ...prev };
      delete clearedErrors[idAo];
      return clearedErrors;
    });
  };

  const confirmReduceArmObjects = () => {
    updateActiveArmObjects(armObjects.slice(0, confirmReduceAo.to));
    setConfirmReduceAo(null);
  };

  const cancelReduceArmObjects = () => {
    setAoInputValue(armObjects.length.toString());
    setConfirmReduceAo(null);
  };

  return {
    // State
    arms,
    armsErrors,
    aoErrors,
    activeTabArm,
    activeArm,
    armObjects,
    currentIndex,
    armClipboard,
    aoClipboard,
    aoInputValue,
    confirmDeleteArm,
    confirmDeleteAo,
    confirmReduceAo,
    isNextDisabledArm,
    isBackDisabledArm,

    // Setters
    setArms,
    setActiveTabArm,
    setArmsErrors,
    setAoErrors,
    setAoInputValue,
    setConfirmDeleteArm,
    setConfirmDeleteAo,

    // Arm handlers
    addArm,
    copyArm,
    pasteArm,
    removeArm,
    updateArm,
    resetArm,
    goToNextArm,
    goToPrevArm,

    // Arm Object handlers
    addAoByInput,
    addAo,
    copyAo,
    pasteAo,
    removeAo,
    updateAo,
    resetAo,
    confirmReduceArmObjects,
    cancelReduceArmObjects,
  };
}
