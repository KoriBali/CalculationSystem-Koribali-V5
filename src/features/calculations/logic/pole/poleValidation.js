import { validateWithYup } from "../../utils";
import { PoleConfigSchema } from "../../schemas/pole/custom/PoleConfigSchema";
import { PoleStructuralSchema } from "../../schemas/pole/custom/PoleStructuralSchema";
import { PoleFormSchema } from "../../schemas/pole/custom/PoleFormSchema";
import { DirectObjectSchema } from "../../schemas/pole/custom/DirectObjectSchema";
import { OverheadWireSchema } from "../../schemas/pole/custom/OverheadWireSchema";
import { ArmSchema } from "../../schemas/pole/custom/ArmSchema";
import { ArmObjectSchema } from "../../schemas/pole/custom/ArmObjectSchema";
import { PoleTypeSchema } from "../../schemas/pole/standard/PoleTypeSchema";
import { StraightTypeSchema } from "../../schemas/pole/standard/StraightTypeSchema";
import { TaperTypeSchema } from "../../schemas/pole/standard/TaperTypeSchema";
import { StandardDirectObjectSchema } from "../../schemas/pole/standard/StandardDirectObjectSchema";

import STANDARD_POLE_DATA from "../../data/specStandardPole.json";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const resolveData = ({
  condition,
  poleTypeStandard,
  taperPoleStandard,
  straightPoleStandard,
  poles,
  directObjects,
  arms,
  overheadWires,
}) => {
  const empty = { poles: [], directObjects: [], arms: [], overheadWires: [] };

  if (condition.poleType !== "standard") {
    return { poles, directObjects, arms, overheadWires };
  }

  const type = poleTypeStandard.type;

  if (type === "taper" || type === "tapered") {
    const isEmbedment =
      !condition.baseplateEnabled && taperPoleStandard.groundPosition === "underGL";

    // In Embedment mode the height dropdown shows the plain onGL-style
    // values (the +0.3m embedment allowance is entered separately via
    // Embedment Length) — but specStandardPole.json's underGL entries are
    // still keyed by the elongated height (e.g. "8.3"), since that's a
    // physically longer pole with different structural data. Translate
    // back to that key only for this lookup.
    const rawH = Number(taperPoleStandard.height);
    const mHeight = rawH > 100 ? rawH / 1000 : rawH;
    const heightKey = isEmbedment
      ? (mHeight + 0.3).toFixed(1)
      : String(Math.round(mHeight * 10) / 10);

    const dataTaper = STANDARD_POLE_DATA?.tapered || STANDARD_POLE_DATA?.taper;
    const group =
      dataTaper?.[taperPoleStandard.poleType]?.[
        taperPoleStandard.groundPosition
      ] || {};
    const isTypeWith100 =
      taperPoleStandard.poleType !== "IS" &&
      taperPoleStandard.poleType !== "IA";
    const nominalKey = isTypeWith100
      ? String(Math.round((Number(heightKey) - 0.1) * 10) / 10)
      : String(Math.round((Number(heightKey) + 0.1) * 10) / 10);

    const selectedPole =
      group[heightKey] ||
      group[nominalKey] ||
      group[String(rawH)] ||
      group[String(mHeight)];

    if (!selectedPole)
      return { error: "Standard taper pole data not found.", ...empty };

    if (isEmbedment) {
      if (!taperPoleStandard.embedmentLength) {
        return { error: "Please complete the embedment length.", ...empty };
      }
    }

    let resolvedDirectObjects = [];
    let resolvedArms = selectedPole.arms
      ? JSON.parse(JSON.stringify(selectedPole.arms))
      : [];

    // Merge user-edited arms specification when in standard mode with arms
    if (arms && arms.length > 0 && selectedPole.arms?.length > 0) {
      resolvedArms = resolvedArms.map((defArm, idx) => {
        const userArm =
          arms[idx] ||
          arms.find(
            (a) => a.idArm === String(idx + 1) || a.name === defArm.name,
          );
        if (!userArm) return defArm;

        const mergedArm = {
          ...defArm,
          idArm: userArm.idArm || String(idx + 1),
          name: userArm.name ?? defArm.name,
          material: userArm.material ?? defArm.material,
          diameter: userArm.diameter ?? defArm.diameter,
          thickness: userArm.thickness ?? defArm.thickness,
          length: userArm.length ?? defArm.length,
          expLength: userArm.expLength ?? defArm.expLength,
          zHeight: userArm.zHeight ?? defArm.zHeight,
          hDistance: userArm.hDistance ?? defArm.hDistance,
          fixAngle: userArm.fixAngle ?? defArm.fixAngle,
          nnC: userArm.nnC ?? defArm.nnC,
          quantity: userArm.quantity ?? defArm.quantity,
        };

        if (Array.isArray(userArm.armObjects) && userArm.armObjects.length > 0) {
          mergedArm.armObjects = (defArm.armObjects || []).map(
            (defAo, aoIdx) => {
              const userAo =
                userArm.armObjects[aoIdx] ||
                userArm.armObjects.find((o) => o.idAo === String(aoIdx + 1));
              if (!userAo) return defAo;
              return {
                ...defAo,
                idAo: userAo.idAo || String(aoIdx + 1),
                name: userAo.name ?? defAo.name,
                type: userAo.type ?? defAo.type,
                frontArea: userAo.frontArea ?? defAo.frontArea,
                sideArea: userAo.sideArea ?? defAo.sideArea,
                weight: userAo.weight ?? defAo.weight,
                zHeight:
                  userAo.zHeight ?? userAo.hDistance ?? defAo.zHeight,
                hDistance:
                  userAo.hDistance ?? userAo.zHeight ?? defAo.hDistance,
                fixAngle: userAo.fixAngle ?? defAo.fixAngle,
                nnC: userAo.nnC ?? defAo.nnC,
                quantity: userAo.quantity ?? defAo.quantity,
              };
            },
          );
        }
        return mergedArm;
      });
    }

    if (directObjects && directObjects.length > 0) {
      directObjects.forEach((obj) => {
        if (obj.sourceType === "direct") {
          resolvedDirectObjects.push({
            ...obj,
            sideArea: obj.sideArea || obj.frontArea || "0.1",
            fixAngle: obj.fixAngle ?? "0",
          });
        } else if (obj.sourceType === "arm") {
          const armIdx = obj.armIndex ?? 0;
          const aoIdx = obj.armObjectIndex ?? 0;
          if (
            resolvedArms[armIdx] &&
            resolvedArms[armIdx].armObjects &&
            resolvedArms[armIdx].armObjects[aoIdx]
          ) {
            resolvedArms[armIdx].armObjects[aoIdx] = {
              ...resolvedArms[armIdx].armObjects[aoIdx],
              name: obj.name,
              type: obj.type,
              frontArea: obj.frontArea,
              sideArea: obj.sideArea || obj.frontArea || "0.1",
              weight: obj.weight,
              zHeight: obj.zHeight,
              nnC: obj.nnC,
              quantity: obj.quantity,
              fixAngle:
                obj.fixAngle ??
                resolvedArms[armIdx].armObjects[aoIdx].fixAngle ??
                "0",
            };
          }
        } else {
          if (selectedPole.directObjects?.length) {
            resolvedDirectObjects.push({
              ...obj,
              sideArea: obj.sideArea || obj.frontArea || "0.1",
              fixAngle: obj.fixAngle ?? "0",
            });
          }
        }
      });
    } else {
      resolvedDirectObjects = selectedPole.directObjects || [];
    }

    const resolvedOverheadWires = (overheadWires || []).slice(0, 4);

    return {
      poles: selectedPole.poles || [],
      directObjects: resolvedDirectObjects,
      arms: resolvedArms,
      overheadWires: resolvedOverheadWires,
    };
  }

  if (type === "straight") {
    const key = straightPoleStandard.combination;
    if (!key) return { error: "Please select pole combination.", ...empty };

    const selectedPole = STANDARD_POLE_DATA?.straight?.[key];
    if (!selectedPole)
      return { error: "Standard straight pole data not found.", ...empty };

    const lengths = [
      Number(straightPoleStandard.upperLength || 0),
      Number(straightPoleStandard.lowerLength || 0),
    ];

    const heights = lengths.map((_, i) =>
      lengths.slice(i).reduce((sum, val) => sum + val, 0),
    );

    const resolvedPoles = selectedPole.poles.map((sec, index) => {
      const thickness =
        index === 0
          ? straightPoleStandard.upperThickness
          : straightPoleStandard.lowerThickness;

      return {
        ...sec,
        lowerThickness: thickness,
        upperThickness: thickness,
        zHeight: heights[index],
      };
    });

    return {
      poles: resolvedPoles,
      directObjects: [],
      arms: [],
      overheadWires: [],
    };
  }

  return empty;
};

// ─── MAIN VALIDATOR ───────────────────────────────────────────────────────────
export async function validatePoleForm({
  condition,
  poleTypeStandard,
  taperPoleStandard,
  straightPoleStandard,
  poleConfig,
  poles,
  directObjects,
  overheadWires,
  arms,
}) {
  const isCustom = condition.poleType !== "standard";
  const isStandard = condition.poleType === "standard";
  const isStraight = poleTypeStandard?.type === "straight";

  // ── 1. Structural Design (custom only) ──
  if (isCustom) {
    const schema =
      typeof PoleConfigSchema === "function"
        ? PoleConfigSchema(condition)
        : PoleConfigSchema;
    const { isValid, errors } = await validateWithYup(
      schema,
      poleConfig,
    );

    if (!isValid) {
      return {
        isValid: false,
        poleConfigErrors: errors,
        message: "Please correct the errors in Structural Design fields.",
      };
    }
  }

  // ── 2. Pole Type Standard (standard only) ──
  if (isStandard) {
    const { isValid } = await validateWithYup(PoleTypeSchema, poleTypeStandard);
    if (!isValid) {
      return { isValid: false, message: "Please select the pole type first." };
    }
  }

  // ── 3. Step Pole Standard (straight standard) ──
  if (isStandard && isStraight) {
    const { isValid, errors } = await validateWithYup(
      StraightTypeSchema(condition),
      straightPoleStandard,
    );

    if (!isValid) {
      return {
        isValid: false,
        straightPoleStandardErrors: errors,
        message:
          "Please correct the errors in Stepped Pole Type Specifications fields.",
      };
    }
  }

  // ── 3b. Taper Pole Standard (taper standard) ──
  if (isStandard && !isStraight) {
    const { isValid, errors } = await validateWithYup(
      TaperTypeSchema(condition),
      taperPoleStandard,
    );

    if (!isValid) {
      return {
        isValid: false,
        taperPoleStandardErrors: errors,
        message: "Please correct the errors in Taper Pole Type Specifications fields.",
      };
    }
  }

  // ── 4. Resolve data source ──
  const resolved = resolveData({
    condition,
    poleTypeStandard,
    taperPoleStandard,
    straightPoleStandard,
    poles,
    directObjects,
    arms,
    overheadWires,
  });

  if (resolved.error) {
    return { isValid: false, message: resolved.error };
  }

  if (isStandard && (!resolved.poles || resolved.poles.length === 0)) {
    return {
      isValid: false,
      message: "Please complete all required standard selections.",
    };
  }

  // ── 5. Validate poles (custom only) ──
  if (isCustom) {
    // ── 5a. PoleFormSchema — validasi semua poles, kumpulkan semua error ──
    const allFormErrors = {};
    let hasFormError = false;

    await Promise.all(
      (resolved.poles || []).map(async (pole, index) => {
        const { isValid, errors } = await validateWithYup(PoleFormSchema, pole);
        if (!isValid) {
          hasFormError = true;
          // key berdasarkan id pole, value adalah errors per field
          allFormErrors[pole.id] = errors;
        }
      }),
    );

    if (hasFormError) {
      return {
        isValid: false,
        polesErrors: allFormErrors,
        message: "Please correct the errors in Pole Specification fields.",
      };
    }

    // ── 5b. PoleStructuralSchema — validasi array poles sekaligus ──
    const structuralSchema = PoleStructuralSchema(poleConfig);
    const { isValid: isStructuralValid, errors: structuralErrors } =
      await validateWithYup(structuralSchema, resolved.poles);

    if (!isStructuralValid) {
      const groupedErrors = {};

      Object.entries(structuralErrors).forEach(([path, message]) => {
        const match = path.match(/^\[?(\d+)\]?\.(.+)$/);
        if (match) {
          const index = Number(match[1]);
          const field = match[2];
          const pole = resolved.poles[index];
          if (pole) {
            if (!groupedErrors[pole.id]) groupedErrors[pole.id] = {};
            // true = field merah, tapi tidak tampilkan teks error di bawah field
            // pesan error sudah ditampilkan via toast
            groupedErrors[pole.id][field] = true;
          }
        }
      });

      if (Object.keys(groupedErrors).length === 0) {
        const firstMessage = Object.values(structuralErrors)[0];
        console.warn(
          "[PoleStructural] Unmatched error path:",
          structuralErrors,
        );
        return {
          isValid: false,
          polesErrors: {},
          message:
            firstMessage ||
            "Please correct the errors in Pole Specification fields.",
        };
      }

      return {
        isValid: false,
        polesErrors: groupedErrors,
        // Ambil pesan pertama dari structuralErrors untuk toast
        message: Object.values(structuralErrors)[0],
      };
    }
  }

  // ── 6. Validate Objects (custom direct objects OR standard taper objects) ──
  const isStandardTaper = isStandard && !isStraight;
  const objectsToValidate = isStandardTaper
    ? directObjects || []
    : resolved.directObjects || [];
  const shouldValidateDo =
    isCustom || (isStandardTaper && objectsToValidate.length > 0);

  if (shouldValidateDo && objectsToValidate.length > 0) {
    const allDoErrors = {};
    let hasDoError = false;
    const schemaToUse = isCustom
      ? DirectObjectSchema
      : StandardDirectObjectSchema;

    await Promise.all(
      objectsToValidate.map(async (directObject) => {
        const { isValid, errors } = await validateWithYup(
          schemaToUse,
          directObject,
        );
        if (!isValid) {
          hasDoError = true;
          allDoErrors[directObject.idDo] = errors;
        }
      }),
    );

    if (hasDoError) {
      return {
        isValid: false,
        doErrors: allDoErrors,
        message: "Please correct the errors in Object fields.",
      };
    }
  }

  // ── 7. Validate Overhead Wires ──
  const shouldValidateOhw = isCustom || (isStandard && !isStraight);
  if (shouldValidateOhw && resolved.overheadWires && resolved.overheadWires.length > 0) {
    const allOhwErrors = {};
    let hasOhwError = false;

    await Promise.all(
      (resolved.overheadWires || []).map(async (ohw) => {
        const { isValid, errors } = await validateWithYup(
          OverheadWireSchema,
          ohw,
        );
        if (!isValid) {
          hasOhwError = true;
          allOhwErrors[ohw.idOhw] = errors;
        }
      }),
    );

    if (hasOhwError) {
      return {
        isValid: false,
        ohwErrors: allOhwErrors,
        message: "Please correct the errors in Overhead Wire fields.",
      };
    }
  }

  // ── 8. Validate Arms + Arm Objects (custom only) ──
  if (isCustom) {
    const allArmsErrors = {};
    const allAoErrors = {};
    let hasArmError = false;

    await Promise.all(
      (resolved.arms || []).map(async (arm) => {
        // Validasi arm
        const { isValid, errors } = await validateWithYup(ArmSchema, arm);
        if (!isValid) {
          hasArmError = true;
          allArmsErrors[arm.idArm] = errors;
        }

        // Validasi semua arm objects dalam arm ini
        await Promise.all(
          (arm.armObjects || []).map(async (ao) => {
            const { isValid: aoValid, errors: aoErrors } =
              await validateWithYup(ArmObjectSchema, ao);
            if (!aoValid) {
              hasArmError = true;
              allAoErrors[ao.idAo] = aoErrors;
              allAoErrors[`${arm.idArm}_${ao.idAo}`] = aoErrors;
            }
          }),
        );
      }),
    );

    if (hasArmError) {
      const hasArmFieldError = Object.keys(allArmsErrors).length > 0;
      const hasAoFieldError = Object.keys(allAoErrors).length > 0;

      const message =
        hasArmFieldError && hasAoFieldError
          ? "Please correct the errors in Arm and Arm Object fields."
          : hasArmFieldError
            ? "Please correct the errors in Arm Specification fields."
            : "Please correct the errors in Arm Object fields.";

      return {
        isValid: false,
        armsErrors: allArmsErrors,
        aoErrors: allAoErrors,
        message,
      };
    }
  }

  return {
    isValid: true,
    resolvedPoles: resolved.poles,
    resolvedDirectObjects: resolved.directObjects,
    resolvedOverheadWires: resolved.overheadWires,
    resolvedArms: resolved.arms,
  };
}

// ─── REPORT VALIDATOR ─────────────────────────────────────────────────────────
export async function validatePoleReport(params) {
  const { results, isCoverComplete } = params;

  if (!results || results.length === 0) {
    return {
      isValid: false,
      message: "No calculation results available. Please calculate first.",
    };
  }

  if (!isCoverComplete()) {
    return {
      isValid: false,
      message: "Please complete the Cover Information fields.",
    };
  }

  return validatePoleForm(params);
}
