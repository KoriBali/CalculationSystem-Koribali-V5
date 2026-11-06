import * as yup from "yup";

export const CoverSchema = yup.object({
  reportNumber: yup.string().required("Required field"),
  date: yup.string().required("Required field"),
  title1: yup.string().required("Required field"),
  title2: yup.string(),
  title3: yup.string(),
  region: yup.string().required("Required field"),
  author: yup.string().required("Required field"),
  responsibleDepartment: yup.string().required("Required field"),
});
