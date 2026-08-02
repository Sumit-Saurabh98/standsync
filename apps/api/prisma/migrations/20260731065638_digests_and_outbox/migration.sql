-- CreateEnum
CREATE TYPE "DigestStatus" AS ENUM ('GENERATED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "digests" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "digestDate" DATE NOT NULL,
    "content" JSONB NOT NULL,
    "submitted" INTEGER NOT NULL,
    "missing" INTEGER NOT NULL,
    "lateCount" INTEGER NOT NULL,
    "status" "DigestStatus" NOT NULL DEFAULT 'GENERATED',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "digestId" TEXT,
    "teamId" TEXT NOT NULL,
    "platform" "WebhookPlatform" NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_team_stats" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "statDate" DATE NOT NULL,
    "memberCount" INTEGER NOT NULL,
    "submittedCount" INTEGER NOT NULL,
    "missingCount" INTEGER NOT NULL,
    "lateCount" INTEGER NOT NULL,
    "participation" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_team_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "digests_teamId_idx" ON "digests"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "digests_teamId_digestDate_key" ON "digests"("teamId", "digestDate");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_deliveries_dedupeKey_key" ON "webhook_deliveries"("dedupeKey");

-- CreateIndex
CREATE INDEX "webhook_deliveries_teamId_status_idx" ON "webhook_deliveries"("teamId", "status");

-- CreateIndex
CREATE INDEX "daily_team_stats_teamId_statDate_idx" ON "daily_team_stats"("teamId", "statDate");

-- CreateIndex
CREATE UNIQUE INDEX "daily_team_stats_teamId_statDate_key" ON "daily_team_stats"("teamId", "statDate");

-- AddForeignKey
ALTER TABLE "digests" ADD CONSTRAINT "digests_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_digestId_fkey" FOREIGN KEY ("digestId") REFERENCES "digests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_team_stats" ADD CONSTRAINT "daily_team_stats_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
