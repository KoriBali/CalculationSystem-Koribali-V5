import * as yup from "yup";

// Reusable transform: konversi string kosong → undefined, lainnya → Number
const toNumber = (_, val) =>
  val === "" || val === null ? undefined : Number(val);

export const PoleConfigSchema = (condition = {}) => {
  const isEmbedment = condition?.baseplateEnabled === false;

  return yup.object({
    // ===== lowestHeight: gabungan underGL & upperGL (baseplate mode) =====
    lowestHeight: yup
      .number()
      .transform(toNumber)
      .typeError("Must be a number")
      .when("groundPosition", {
        is: "underGL",
        then: (schema) =>
          !isEmbedment
            ? schema
                .required("Required field")
                .lessThan(0, "Value must be less than 0")
            : schema.notRequired(),
      })
      .when("groundPosition", {
        is: "upperGL",
        then: (schema) =>
          !isEmbedment
            ? schema
                .required("Required field")
                .moreThan(0, "Must be greater than 0")
            : schema.notRequired(),
      }),

    // ===== embedmentLength: embedment mode =====
    embedmentLength: yup
      .number()
      .transform(toNumber)
      .typeError("Embedment Length must be a number")
      .when([], {
        is: () => isEmbedment,
        then: (schema) =>
          schema
            .required("Embedment Length is required")
            .min(0, "Embedment Length must be positive"),
        otherwise: (schema) => schema.notRequired(),
      }),

    // ===== overdesignFactor =====
    overdesignFactor: yup
      .number()
      .transform(toNumber)
      .typeError("Must be a number")
      .required("Required field")
      .min(0, "Must be positive"),
  });
};
