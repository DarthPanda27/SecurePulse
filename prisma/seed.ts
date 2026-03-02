import { prisma } from "../src/lib/prisma.ts";

async function main() {
  const feed = await prisma.feedSource.upsert({
    where: { id: "feed-cisa-kev" },
    update: {},
    create: {
      id: "feed-cisa-kev",
      name: "CISA KEV",
      type: "CISA_KEV",
      url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
      trustScore: 0.95,
      isEnabled: true,
    },
  });

  const intel = await prisma.intelItem.upsert({
    where: { normalizedHash: "kev-cve-2024-21893" },
    update: {},
    create: {
      sourceId: feed.id,
      kind: "CVE",
      title: "CVE-2024-21893 actively exploited in Ivanti Connect Secure",
      summary: "SSRF vulnerability in SAML component can enable auth bypass.",
      sourceUrl: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
      sourcePublishedAt: new Date(),
      normalizedHash: "kev-cve-2024-21893",
      confidenceRaw: 0.9,
      cvss: 8.2,
      epss: 0.92,
      kev: true,
      exploitObserved: true,
      metadata: { vendor: "Ivanti", product: "Connect Secure" },
    },
  });

  const vuln = await prisma.vulnerability.upsert({
    where: { cveId: "CVE-2024-21893" },
    update: {},
    create: {
      cveId: "CVE-2024-21893",
      cvssScore: 8.2,
      epssScore: 0.92,
      kevFlag: true,
      exploitStatus: "active exploitation",
      publishedAt: new Date(),
    },
  });

  await prisma.intelItem.update({
    where: { id: intel.id },
    data: { vulnerabilities: { connect: [{ id: vuln.id }] } },
  });

  const brief = await prisma.dailyBrief.create({
    data: {
      userId: "demo-user",
      briefDate: new Date(new Date().toDateString()),
      tldr: "Top risk is Ivanti CVE-2024-21893 with active exploitation.",
      cards: {
        create: {
          cardType: "Top Risk Today",
          title: intel.title,
          bullets: [intel.summary ?? "", "Known exploited vulnerability"],
          whyItMatters: "This is mapped to your subscribed products.",
          suggestedAction: "Patch immediately and review perimeter access logs.",
          confidence: 0.9,
          sourceLinks: [{ title: "CISA KEV", url: intel.sourceUrl }],
          score: 0.93,
          orderIndex: 0,
          intelItemId: intel.id,
        },
      },
    },
  });

  await prisma.subscription.upsert({
    where: { id: "sub-ivanti" },
    update: {},
    create: {
      id: "sub-ivanti",
      userId: "demo-user",
      vendor: "Ivanti",
      product: "Connect Secure",
      feedSourceId: feed.id,
    },
  });

  await prisma.userPreference.upsert({
    where: { userId: "demo-user" },
    update: {},
    create: {
      userId: "demo-user",
      topics: ["vulnerability", "threat-intel"],
      severityMin: 0.7,
      deliveryHourUtc: 7,
      channels: ["in_app"],
    },
  });

  console.log(`Seed complete. Created DailyBrief: ${brief.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
