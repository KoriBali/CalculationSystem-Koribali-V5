import * as yup from "yup";

export const TaperTypeSchema = (condition) => {
  return yup.object({
    poleType: yup.string().required("Please select a pole standard type"),
    installationPole: yup
      .string()
      .required("Please select an installation pole"),
    groundPosition: yup.string().when("installationPole", {
      is: "baseplate",
      then: (schema) => schema.required("Please select a ground position"),
      otherwise: (schema) => schema.notRequired(),
    }),
    height: yup.string().required("Please select a height"),
    embedmentLength: yup.string().when("installationPole", {
      is: "embedment",
      then: (schema) => schema.required("Embedment Length is required"),
      otherwise: (schema) => schema.notRequired(),
    }),
  });
};
