-- AlterTable
ALTER TABLE "players" ADD COLUMN     "careerSyncedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "player_career_teams" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamApiId" INTEGER NOT NULL,
    "teamName" TEXT NOT NULL,
    "teamLogo" TEXT,
    "seasons" INTEGER[],
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "player_career_teams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "player_career_teams_playerId_teamApiId_key" ON "player_career_teams"("playerId", "teamApiId");

-- AddForeignKey
ALTER TABLE "player_career_teams" ADD CONSTRAINT "player_career_teams_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

