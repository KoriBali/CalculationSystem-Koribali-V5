import * as yup from "yup";

export const ConditionSchema = yup.object({
  designStandard: yup.string().required("Condition Standard is required"),
  designWindSpeed: yup
    .number()
    .transform((val, orig) => (orig === "" ? undefined : val))
    .typeError("Wind speed must be a valid number")
    .positive("Wind speed must be greater than 0")
    .required("Wind speed is required"),
  designAirDensity: yup
    .number()
    .transform((val, orig) => (orig === "" ? undefined : val))
    .typeError("Air density must be a valid number")
    .positive("Air density must be greater than 0")
    .required("Air density is required"),
  horizontalAcceleration: yup
    .number()
    .transform((val, orig) => (orig === "" ? undefined : val))
    .when("designStandard", {
      is: "new_jil",
      then: (schema) =>
        schema
          .typeError("Horizontal Acceleration must be a valid number")
          .positive("Horizontal Acceleration must be greater than 0")
          .required("Horizontal Acceleration (EQa) is required"),
      otherwise: (schema) => schema.strip().notRequired(),
    }),
  responseRatio: yup
    .number()
    .transform((val, orig) => (orig === "" ? undefined : val))
    .when("designStandard", {
      is: "new_jil",
      then: (schema) =>
        schema
          .typeError("Response Ratio must be a valid number")
          .positive("Response Ratio must be greater than 0")
          .required("Response Ratio (EQr) is required"),
      otherwise: (schema) => schema.strip().notRequired(),
    }),
  poleType: yup.string().notRequired(),
  openingEnabled: yup.boolean(),
  baseplateEnabled: yup.boolean(),
  foundationEnabled: yup.boolean(),
});


