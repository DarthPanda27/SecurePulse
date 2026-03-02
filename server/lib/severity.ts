export const INTEL_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type IntelSeverity = (typeof INTEL_SEVERITIES)[number];
