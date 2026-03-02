import { BriefCardType, ConfidenceLevel, IntelSeverity, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cisa = await prisma.feedSource.upsert({
    where: { slug: "cisa-kev" },
    update: {},
    create: {
      name: "CISA Known Exploited Vulnerabilities",
      slug: "cisa-kev",
      baseUrl: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
      pollingMins: 120,
    },
  });

  const vendorFeed = await prisma.feedSource.upsert({
    where: { slug: "vendor-advisories" },
    update: {},
    create: {
      name: "Vendor Security Advisories",
      slug: "vendor-advisories",
      baseUrl: "https://security.example.com/advisories",
      pollingMins: 60,
    },
  });

  const intel = await prisma.intelItem.upsert({
    where: {
      feedSourceId_externalId: {
        feedSourceId: cisa.id,
        externalId: "KEV-2024-21893",
      },
    },
    update: {},
    create: {
      feedSourceId: cisa.id,
      externalId: "KEV-2024-21893",
      title: "Ivanti Connect Secure command injection actively exploited",
      summary: "A command injection vulnerability in Ivanti Connect Secure is under active exploitation.",
      sourceUrl: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
      severity: IntelSeverity.CRITICAL,
      publishedAt: new Date("2026-02-15T12:00:00.000Z"),
    },
  });

  await prisma.vulnerability.upsert({
    where: { cveId: "CVE-2024-21893" },
    update: { intelItemId: intel.id, exploited: true },
    create: {
      intelItemId: intel.id,
      cveId: "CVE-2024-21893",
      vendor: "Ivanti",
      product: "Connect Secure",
      cvssScore: "9.1",
      exploited: true,
      patched: false,
      publishedAt: new Date("2026-02-15T12:00:00.000Z"),
    },
  });

  const brief = await prisma.dailyBrief.upsert({
    where: { briefDate: new Date("2026-02-16") },
    update: {},
    create: {
      briefDate: new Date("2026-02-16"),
      title: "Daily Cybersecurity Brief - 2026-02-16",
    },
  });

  await prisma.briefCard.createMany({
    data: [
      {
        dailyBriefId: brief.id,
        cardType: BriefCardType.EXECUTIVE_SUMMARY,
        title: "Critical perimeter risk remains high",
        summaryBullets: [
          "CVE-2024-21893 exploitation activity persists.",
          "Public exploit chains continue targeting unpatched edge devices.",
        ],
        whyItMatters: "Internet-exposed remote access systems are high-value targets and likely entry points.",
        suggestedAction: "Prioritize patching and block risky management interfaces.",
        confidence: ConfidenceLevel.HIGH,
        sortOrder: 1,
      },
      {
        dailyBriefId: brief.id,
        cardType: BriefCardType.RECOMMENDATION,
        title: "Harden external attack surface",
        summaryBullets: [
          "Run external exposure scan against VPN assets.",
          "Verify EDR telemetry from remote access appliances.",
        ],
        whyItMatters: "Rapid controls can lower compromise likelihood before patch windows close.",
        suggestedAction: "Apply temporary access restrictions for high-risk endpoints.",
        confidence: ConfidenceLevel.MEDIUM,
        sortOrder: 2,
      },
    ],
    skipDuplicates: true,
  });

  const sub = await prisma.subscription.upsert({
    where: {
      feedSourceId_subscriberKey_channel: {
        feedSourceId: vendorFeed.id,
        subscriberKey: "secops@example.com",
        channel: "email",
      },
    },
    update: {},
    create: {
      feedSourceId: vendorFeed.id,
      subscriberKey: "secops@example.com",
      channel: "email",
      endpoint: "secops@example.com",
    },
  });

  await prisma.userPreference.upsert({
    where: { subscriptionId: sub.id },
    update: {},
    create: {
      subscriptionId: sub.id,
      timezone: "America/New_York",
      digestHourUtc: 13,
      minimumSeverity: IntelSeverity.HIGH,
      includeRecommendations: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
