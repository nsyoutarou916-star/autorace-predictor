-- CreateTable
CREATE TABLE "Venue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Race" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "venueId" INTEGER NOT NULL,
    "raceDate" TEXT NOT NULL,
    "raceNo" INTEGER NOT NULL,
    "distance" TEXT,
    "weather" TEXT,
    "trackCondition" TEXT,
    "postTime" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Race_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "raceId" INTEGER NOT NULL,
    "carNo" INTEGER NOT NULL,
    "playerCode" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "branch" TEXT,
    "age" INTEGER,
    "bikeClass" INTEGER,
    "bikeName" TEXT,
    "rank" TEXT,
    "handicap" INTEGER NOT NULL,
    "trialTime" TEXT,
    "raceDev" TEXT,
    "rate2" TEXT,
    "rate3" TEXT,
    "recentJson" TEXT,
    CONSTRAINT "Entry_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResultEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "raceId" INTEGER NOT NULL,
    "carNo" INTEGER NOT NULL,
    "order" INTEGER,
    "playerName" TEXT,
    "raceTime" TEXT,
    "st" TEXT,
    CONSTRAINT "ResultEntry_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Venue_code_key" ON "Venue"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_key_key" ON "Venue"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Race_venueId_raceDate_raceNo_key" ON "Race"("venueId", "raceDate", "raceNo");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_raceId_carNo_key" ON "Entry"("raceId", "carNo");

-- CreateIndex
CREATE UNIQUE INDEX "ResultEntry_raceId_carNo_key" ON "ResultEntry"("raceId", "carNo");
