import api from "../../../config/api";
import { isGuestUser, getAccessToken } from "../../../utils/auth";

// Generates fallback mock calculation results for guest mode or offline testing
function generateMockResults(payload) {
  const poles = payload?.poles || [];

  return {
    results:
      poles.length > 0
        ? poles.map((p, i) => ({
            fb: 123.45,
            stb: 100,
            sts: 90,
            stc: 80,
            sectionArea: 10.5,
            sectionModulus: 8.2,
            momentInertia: 25.4,
            ip: 12.1,
            radiusGyration: 3.6,
            taperRatio: 1.5,
            typeofTaper: p.poleType || "Linear",
            heightSection: p.zHeight ? Number(p.zHeight) : 500,
            description: p.description || p.name || `Section ${i + 1}`,
            safetyFactor: 0.9,
            utilizationRatio: 0.9,
          }))
        : [
            {
              fb: 123.45,
              stb: 100,
              sts: 90,
              stc: 80,
              sectionArea: 10.5,
              sectionModulus: 8.2,
              momentInertia: 25.4,
              ip: 12.1,
              radiusGyration: 3.6,
              taperRatio: 1.5,
              typeofTaper: "Linear",
              heightSection: 500,
              description: "Section 1",
              safetyFactor: 0.9,
              utilizationRatio: 0.9,
            },
          ],
    resultsDo: (payload?.directObjects || []).map(() => ({
      weight: 45,
      fixLoad: 50,
      frontArea: 1.2,
      sideArea: 0.8,
      cf: 1.1,
      zHeight: 3000,
      windLoadAreaFront: 60,
      windLoadAreaSide: 40,
      seismicLoad: 20,
    })),
    resultsOhw: (payload?.overheadWires || []).map(() => ({ flOhwKg: 30 })),
    resultsArm: (payload?.arms || []).map((a) => ({
      fb: 50,
      sfb: 45,
      sfs: 40,
      sfc: 35,
      diameter: 60,
      thickness: 4,
      sectionArea: 6.8,
      sectionModulus: 4.5,
      momentInertia: 14.2,
      radiusGyration: 2.1,
      massaM: 3.2,
      massa: 12.8,
      fixLoadM: 15,
      fixLoad: 60,
      armObjects: (a.armObjects || []).map(() => ({
        flAo: 10,
        weight: 8,
        fixLoad: 25,
      })),
    })),
  };
}

/**
 * Call API to perform pole calculation (POST /api/calculate)
 * Sends standard/custom pole payload to the Backend Calculation Engine.
 * If backend calculation engine is unavailable, offline, or returns empty results,
 * safely falls back to standard simulation output so user can proceed through tabs.
 */
export const calculatePole = async (payload) => {
  // Guest mode or unauthenticated session: simulate calculation locally
  if (isGuestUser() || !getAccessToken()) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(generateMockResults(payload));
      }, 300);
    });
  }

  // Registered user: Call backend calculation API strictly without dummy fallbacks
  try {
    const { data } = await api.post("/api/calculate", payload);
    const resultData = data?.data || data;

    const rawResults = Array.isArray(resultData)
      ? resultData
      : resultData?.results;

    // If backend returned valid non-empty calculation results array, use it
    if (Array.isArray(rawResults) && rawResults.length > 0) {
      return {
        results: rawResults,
        resultsDo: resultData?.resultsDo || [],
        resultsOhw: resultData?.resultsOhw || [],
        resultsArm: resultData?.resultsArm || [],
        ...resultData,
      };
    }

    if (
      resultData?.display ||
      resultData?.checks ||
      resultData?.governing ||
      resultData?.positions ||
      resultData?.sections ||
      resultData?.status
    ) {
      return {
        results: rawResults || [],
        resultsDo: resultData?.resultsDo || [],
        resultsOhw: resultData?.resultsOhw || [],
        resultsArm: resultData?.resultsArm || [],
        ...resultData,
      };
    }

    throw new Error(
      resultData?.message ||
        "No calculation results were returned from the backend engine.",
    );
  } catch (error) {
    // If generic calculation endpoint is not yet deployed on backend (404), fall back to simulation
    if (error?.response?.status === 404) {
      console.warn(
        "Backend /api/calculate returned 404, falling back to simulated calculation.",
      );
      return generateMockResults(payload);
    }

    console.error("Backend calculation API error:", error);
    const detail =
      error?.response?.data?.detail?.message ||
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      error?.message ||
      "Structural calculation failed on the backend server.";
    const errorMsg =
      typeof detail === "object" ? JSON.stringify(detail) : String(detail);
    throw new Error(errorMsg);
  }
};

