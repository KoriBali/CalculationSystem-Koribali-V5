// Where the user last was inside the Requests menu (request list, project
// type, new request form, a calculation …), so the sidebar's Requests link
// takes them back there after visiting another menu. Per browser tab.
const STORAGE_KEY = "projects_last_path";
const PROJECTS_ROOT = "/projects";

const PROJECT_TOOLS_STORAGE_KEY = "project_tools_last_path";
const PROJECT_TOOLS_ROOT = "/project-tools";

export const rememberRequestsPath = (path) => {
  if (!path.startsWith(PROJECTS_ROOT) && !path.startsWith("/requests")) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, path.replace(/^\/requests/, "/projects"));
  } catch {
    // Not remembered - the link falls back to the project list.
  }
};

export const lastRequestsPath = () => {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const forgetRequestsPath = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to forget.
  }
};

export const rememberProjectToolsPath = (path) => {
  if (!path.startsWith(PROJECT_TOOLS_ROOT)) return;
  try {
    sessionStorage.setItem(PROJECT_TOOLS_STORAGE_KEY, path);
  } catch {
    // Not remembered - the link falls back to the project tools main page.
  }
};

export const lastProjectToolsPath = () => {
  try {
    return sessionStorage.getItem(PROJECT_TOOLS_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const forgetProjectToolsPath = () => {
  try {
    sessionStorage.removeItem(PROJECT_TOOLS_STORAGE_KEY);
  } catch {
    // Nothing to forget.
  }
};
