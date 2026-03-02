declare module "@prisma/client" {
  export enum BriefCardType {
    EXECUTIVE_SUMMARY = "EXECUTIVE_SUMMARY",
    VULNERABILITY = "VULNERABILITY",
    THREAT_ACTIVITY = "THREAT_ACTIVITY",
    RECOMMENDATION = "RECOMMENDATION",
  }

  export enum ConfidenceLevel {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
  }

  export enum IntelSeverity {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL",
  }

  export class PrismaClient {
    [key: string]: any;
    constructor(args?: any);
  }
}
