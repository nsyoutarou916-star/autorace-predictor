/*
  Warnings:

  - You are about to alter the column `distance` on the `Race` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Race" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "venueId" INTEGER NOT NULL,
    "raceDate" TEXT NOT NULL,
    "raceNo" INTEGER NOT NULL,
    "distance" INTEGER,
    "weather" TEXT,
    "trackCondition" TEXT,
    "postTime" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Race_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Race" ("distance", "fetchedAt", "id", "postTime", "raceDate", "raceNo", "trackCondition", "venueId", "weather") SELECT "distance", "fetchedAt", "id", "postTime", "raceDate", "raceNo", "trackCondition", "venueId", "weather" FROM "Race";
DROP TABLE "Race";
ALTER TABLE "new_Race" RENAME TO "Race";
CREATE UNIQUE INDEX "Race_venueId_raceDate_raceNo_key" ON "Race"("venueId", "raceDate", "raceNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
