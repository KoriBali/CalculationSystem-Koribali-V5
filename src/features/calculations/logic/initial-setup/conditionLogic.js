// Auto-fill defaults for specific design standards
export const STANDARD_DEFAULTS = {
  v60: { designWindSpeed: "60", designAirDensity: "1.23" },
  jil: { designWindSpeed: "60", designAirDensity: "1.23" },
  old_jil: { designWindSpeed: "60", designAirDensity: "1.23" },
  old_lighting_pole: { designWindSpeed: "60", designAirDensity: "1.23" },
  new_jil: {
    designWindSpeed: "60",
    designAirDensity: "1.23",
    horizontalAcceleration: "4.71",
    responseRatio: "1.00",
  },
};

// Returns updated object with auto-filled values if standard has defaults
export function applyStandardDefaults(updates) {
  if (updates.designStandard && STANDARD_DEFAULTS[updates.designStandard]) {
    return {
      ...updates,
      ...STANDARD_DEFAULTS[updates.designStandard],
    };
  }
  return updates;
}

// Returns list of component names that were enabled but are now disabled
export function getDisabledComponents(prev, next) {
  const disabled = [];

  if (prev.openingEnabled && !next.openingEnabled) disabled.push("Opening");
  if (prev.baseplateEnabled && !next.baseplateEnabled)
    disabled.push("Baseplate");
  if (prev.foundationEnabled && !next.foundationEnabled)
    disabled.push("Foundation");

  return disabled;
}

// Saves calculation config to sessionStorage — used by header nav to determine visible steps
export function saveCalculationConfig(projectType, condition) {
  const config = {
    pole: true,
    opening: !!condition.openingEnabled,
    baseplate: !!condition.baseplateEnabled,
    foundation: !!condition.foundationEnabled,
  };
  sessionStorage.setItem(
    `${projectType}_calculation_config`,
    JSON.stringify(config),
  );
}

export function cleanupDisabledComponents(projectType, condition) {
  if (!condition.openingEnabled) {
    sessionStorage.removeItem(`${projectType}_openingType`);
    sessionStorage.removeItem(`${projectType}_boxType`);
    sessionStorage.removeItem(`${projectType}_rType`);
    sessionStorage.removeItem(`${projectType}_calculatedOp`);
    sessionStorage.removeItem(`${projectType}_showResultsOp`);
  }

  if (!condition.baseplateEnabled) {
    sessionStorage.removeItem(`${projectType}_baseplateType`);
    sessionStorage.removeItem(`${projectType}_fourRibType`);
    sessionStorage.removeItem(`${projectType}_eightRibType`);
    sessionStorage.removeItem(`${projectType}_calculatedBaseplate`);
    sessionStorage.removeItem(`${projectType}_showResultsBaseplate`);
  }

  if (!condition.foundationEnabled) {
    sessionStorage.removeItem(`${projectType}_foundationType`);
    sessionStorage.removeItem(`${projectType}_squareCaisson`);
    sessionStorage.removeItem(`${projectType}_roundCaisson`);
    sessionStorage.removeItem(`${projectType}_calculatedFoundation`);
    sessionStorage.removeItem(`${projectType}_showResultsFoundation`);
  }
}
