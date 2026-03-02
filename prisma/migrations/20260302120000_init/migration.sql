-- CreateEnum
CREATE TYPE "IntelSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BriefCardType" AS ENUM ('EXECUTIVE_SUMMARY', 'VULNERABILITY', 'THREAT_ACTIVITY', 'RECOMMENDATION');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "FeedSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "baseUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pollingMins" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "FeedSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelItem" (
    "id" TEXT NOT NULL,
    "feedSourceId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "severity" "IntelSeverity" NOT NULL,
    "publishedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "IntelItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vulnerability" (
    "id" TEXT NOT NULL,
    "intelItemId" TEXT NOT NULL,
    "cveId" TEXT NOT NULL,
    "vendor" TEXT,
    "product" TEXT,
    "cvssScore" DECIMAL(4,1),
    "exploited" BOOLEAN NOT NULL DEFAULT false,
    "patched" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Vulnerability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyBrief" (
    "id" TEXT NOT NULL,
    "briefDate" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DailyBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefCard" (
    "id" TEXT NOT NULL,
    "dailyBriefId" TEXT NOT NULL,
    "cardType" "BriefCardType" NOT NULL,
    "title" TEXT NOT NULL,
    "summaryBullets" JSONB NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "suggestedAction" TEXT,
    "confidence" "ConfidenceLevel" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BriefCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "feedSourceId" TEXT NOT NULL,
    "subscriberKey" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastDeliveredAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "digestHourUtc" INTEGER NOT NULL DEFAULT 8,
    "minimumSeverity" "IntelSeverity" NOT NULL DEFAULT 'MEDIUM',
    "includeRecommendations" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedSource_slug_key" ON "FeedSource"("slug");

-- CreateIndex
CREATE INDEX "FeedSource_isActive_idx" ON "FeedSource"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "IntelItem_feedSourceId_externalId_key" ON "IntelItem"("feedSourceId", "externalId");

-- CreateIndex
CREATE INDEX "IntelItem_severity_publishedAt_idx" ON "IntelItem"("severity", "publishedAt");

-- CreateIndex
CREATE INDEX "IntelItem_publishedAt_idx" ON "IntelItem"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vulnerability_cveId_key" ON "Vulnerability"("cveId");

-- CreateIndex
CREATE INDEX "Vulnerability_intelItemId_idx" ON "Vulnerability"("intelItemId");

-- CreateIndex
CREATE INDEX "Vulnerability_exploited_patched_idx" ON "Vulnerability"("exploited", "patched");

-- CreateIndex
CREATE UNIQUE INDEX "DailyBrief_briefDate_key" ON "DailyBrief"("briefDate");

-- CreateIndex
CREATE INDEX "DailyBrief_createdAt_idx" ON "DailyBrief"("createdAt");

-- CreateIndex
CREATE INDEX "BriefCard_dailyBriefId_sortOrder_idx" ON "BriefCard"("dailyBriefId", "sortOrder");

-- CreateIndex
CREATE INDEX "BriefCard_cardType_idx" ON "BriefCard"("cardType");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_feedSourceId_subscriberKey_channel_key" ON "Subscription"("feedSourceId", "subscriberKey", "channel");

-- CreateIndex
CREATE INDEX "Subscription_subscriberKey_idx" ON "Subscription"("subscriberKey");

-- CreateIndex
CREATE INDEX "Subscription_isActive_idx" ON "Subscription"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_subscriptionId_key" ON "UserPreference"("subscriptionId");

-- CreateIndex
CREATE INDEX "UserPreference_minimumSeverity_digestHourUtc_idx" ON "UserPreference"("minimumSeverity", "digestHourUtc");

-- AddForeignKey
ALTER TABLE "IntelItem" ADD CONSTRAINT "IntelItem_feedSourceId_fkey" FOREIGN KEY ("feedSourceId") REFERENCES "FeedSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vulnerability" ADD CONSTRAINT "Vulnerability_intelItemId_fkey" FOREIGN KEY ("intelItemId") REFERENCES "IntelItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefCard" ADD CONSTRAINT "BriefCard_dailyBriefId_fkey" FOREIGN KEY ("dailyBriefId") REFERENCES "DailyBrief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_feedSourceId_fkey" FOREIGN KEY ("feedSourceId") REFERENCES "FeedSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
