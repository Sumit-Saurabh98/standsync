-- CreateTable
CREATE TABLE "standups" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "standupDate" DATE NOT NULL,
    "yesterday" TEXT NOT NULL,
    "today" TEXT NOT NULL,
    "blockers" TEXT,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "standups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "standups_teamId_standupDate_idx" ON "standups"("teamId", "standupDate");

-- CreateIndex
CREATE INDEX "standups_userId_standupDate_idx" ON "standups"("userId", "standupDate");

-- AddForeignKey
ALTER TABLE "standups" ADD CONSTRAINT "standups_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standups" ADD CONSTRAINT "standups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX standups_active_unique
  ON "standups" ("teamId", "userId", "standupDate")
  WHERE "deletedAt" IS NULL;
