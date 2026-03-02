-- CreateEnum
CREATE TYPE "FeedType" AS ENUM ('RSS', 'API', 'VENDOR_ADVISORY', 'NVD', 'CISA_KEV', 'EPSS', 'BLOG');

-- CreateEnum
CREATE TYPE "IntelKind" AS ENUM ('CVE', 'ADVISORY', 'CAMPAIGN', 'THREAT');

-- CreateTable
CREATE TABLE "FeedSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FeedType" NOT NULL,
    "url" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "pollIntervalMin" INTEGER NOT NULL DEFAULT 60,
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeedSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelItem" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "kind" "IntelKind" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "sourcePublishedAt" TIMESTAMP(3),
    "normalizedHash" TEXT NOT NULL,
    "confidenceRaw" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "cvss" DOUBLE PRECISION,
    "epss" DOUBLE PRECISION,
    "kev" BOOLEAN NOT NULL DEFAULT false,
    "exploitObserved" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IntelItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vulnerability" (
    "id" TEXT NOT NULL,
    "cveId" TEXT NOT NULL,
    "cvssScore" DOUBLE PRECISION,
    "epssScore" DOUBLE PRECISION,
    "kevFlag" BOOLEAN NOT NULL DEFAULT false,
    "exploitStatus" TEXT,
    "publishedAt" TIMESTAMP(3),
    "modifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Vulnerability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyBrief" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "briefDate" TIMESTAMP(3) NOT NULL,
    "tldr" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefCard" (
    "id" TEXT NOT NULL,
    "dailyBriefId" TEXT NOT NULL,
    "intelItemId" TEXT,
    "cardType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bullets" JSONB NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "suggestedAction" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "sourceLinks" JSONB NOT NULL,
    "score" DOUBLE PRECISION,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BriefCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vendor" TEXT,
    "product" TEXT,
    "category" TEXT,
    "keyword" TEXT,
    "feedSourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topics" JSONB,
    "sectors" JSONB,
    "geos" JSONB,
    "severityMin" DOUBLE PRECISION DEFAULT 0.5,
    "deliveryHourUtc" INTEGER DEFAULT 7,
    "channels" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_IntelItemToVulnerability" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "FeedSource_type_isEnabled_idx" ON "FeedSource"("type", "isEnabled");
CREATE UNIQUE INDEX "IntelItem_normalizedHash_key" ON "IntelItem"("normalizedHash");
CREATE INDEX "IntelItem_kind_sourcePublishedAt_idx" ON "IntelItem"("kind", "sourcePublishedAt");
CREATE INDEX "IntelItem_sourceId_sourcePublishedAt_idx" ON "IntelItem"("sourceId", "sourcePublishedAt");
CREATE UNIQUE INDEX "Vulnerability_cveId_key" ON "Vulnerability"("cveId");
CREATE INDEX "Vulnerability_kevFlag_epssScore_idx" ON "Vulnerability"("kevFlag", "epssScore");
CREATE UNIQUE INDEX "DailyBrief_userId_briefDate_key" ON "DailyBrief"("userId", "briefDate");
CREATE INDEX "DailyBrief_briefDate_idx" ON "DailyBrief"("briefDate");
CREATE INDEX "BriefCard_dailyBriefId_orderIndex_idx" ON "BriefCard"("dailyBriefId", "orderIndex");
CREATE INDEX "BriefCard_intelItemId_idx" ON "BriefCard"("intelItemId");
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX "Subscription_feedSourceId_idx" ON "Subscription"("feedSourceId");
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");
CREATE INDEX "UserPreference_deliveryHourUtc_idx" ON "UserPreference"("deliveryHourUtc");
CREATE UNIQUE INDEX "_IntelItemToVulnerability_AB_unique" ON "_IntelItemToVulnerability"("A", "B");
CREATE INDEX "_IntelItemToVulnerability_B_index" ON "_IntelItemToVulnerability"("B");

-- AddForeignKey
ALTER TABLE "IntelItem" ADD CONSTRAINT "IntelItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "FeedSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BriefCard" ADD CONSTRAINT "BriefCard_dailyBriefId_fkey" FOREIGN KEY ("dailyBriefId") REFERENCES "DailyBrief"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BriefCard" ADD CONSTRAINT "BriefCard_intelItemId_fkey" FOREIGN KEY ("intelItemId") REFERENCES "IntelItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_feedSourceId_fkey" FOREIGN KEY ("feedSourceId") REFERENCES "FeedSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "_IntelItemToVulnerability" ADD CONSTRAINT "_IntelItemToVulnerability_A_fkey" FOREIGN KEY ("A") REFERENCES "IntelItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_IntelItemToVulnerability" ADD CONSTRAINT "_IntelItemToVulnerability_B_fkey" FOREIGN KEY ("B") REFERENCES "Vulnerability"("id") ON DELETE CASCADE ON UPDATE CASCADE;
