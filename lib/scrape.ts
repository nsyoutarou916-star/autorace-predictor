import { prisma } from "@/lib/db";
import { venueByKey } from "@/lib/venues";
import {
  fetchProgram,
  fetchRaceResult,
  fetchOtherRaceInfo,
  NoRaceDataError,
} from "@/lib/autorace-client";

export class RaceNotFoundError extends Error {}

export async function getOrFetchRace(
  venueKey: string,
  raceDate: string,
  raceNo: number,
) {
  const venue = venueByKey(venueKey);
  if (!venue) throw new RaceNotFoundError(`Unknown venue: ${venueKey}`);

  const venueRow = await prisma.venue.upsert({
    where: { code: venue.code },
    update: {},
    create: { code: venue.code, key: venue.key, name: venue.name },
  });

  const cached = await prisma.race.findUnique({
    where: {
      venueId_raceDate_raceNo: {
        venueId: venueRow.id,
        raceDate,
        raceNo,
      },
    },
    include: { entries: true, results: true },
  });
  if (cached && cached.entries.length > 0) return cached;

  let program;
  try {
    program = await fetchProgram({ placeCode: venue.code, raceDate, raceNo });
  } catch (e) {
    if (e instanceof NoRaceDataError) {
      throw new RaceNotFoundError(
        `No race found for ${venueKey} ${raceDate} race ${raceNo}`,
      );
    }
    throw e;
  }

  if (!program.playerList || program.playerList.length === 0) {
    throw new RaceNotFoundError(
      `No race found for ${venueKey} ${raceDate} race ${raceNo}`,
    );
  }

  // Race distance/weather are best-effort: used to scale how much a trial-time
  // advantage compounds over the full race, but their absence shouldn't block
  // showing the entry list.
  let otherInfo;
  try {
    otherInfo = await fetchOtherRaceInfo({
      placeCode: venue.code,
      raceDate,
      raceNo,
    });
  } catch {
    otherInfo = undefined;
  }

  const race = await prisma.race.upsert({
    where: {
      venueId_raceDate_raceNo: {
        venueId: venueRow.id,
        raceDate,
        raceNo,
      },
    },
    update: {
      distance: otherInfo?.distance,
      weather: otherInfo?.weather,
    },
    create: {
      venueId: venueRow.id,
      raceDate,
      raceNo,
      distance: otherInfo?.distance,
      weather: otherInfo?.weather,
    },
  });

  await prisma.entry.deleteMany({ where: { raceId: race.id } });
  await prisma.entry.createMany({
    data: program.playerList.map((p) => ({
      raceId: race.id,
      carNo: p.carNo,
      playerCode: p.playerCode,
      playerName: p.playerName,
      branch: p.placeName,
      age: p.age,
      bikeClass: p.bikeClass,
      bikeName: p.bikeName,
      rank: p.rank,
      handicap: p.handicap,
      trialTime: p.trialRunTime,
      raceDev: p.raceDev,
      rate2: p.rate2,
      rate3: p.rate3,
      recentJson: JSON.stringify(program.latest3List[p.playerCode] ?? []),
    })),
  });

  // Results are best-effort: races that haven't run yet will fail here.
  try {
    const result = await fetchRaceResult({
      placeCode: venue.code,
      raceDate,
      raceNo,
    });
    if (result.raceResult && result.raceResult.length > 0) {
      await prisma.resultEntry.deleteMany({ where: { raceId: race.id } });
      await prisma.resultEntry.createMany({
        data: result.raceResult.map((r) => ({
          raceId: race.id,
          carNo: r.carNo,
          order: r.order,
          playerName: r.playerName,
          raceTime: r.raceTime,
          st: r.st,
        })),
      });
    }
  } catch {
    // No confirmed result yet (race hasn't run) — not an error for our purposes.
  }

  return prisma.race.findUniqueOrThrow({
    where: { id: race.id },
    include: { entries: true, results: true },
  });
}
