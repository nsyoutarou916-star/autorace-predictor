"use server";

import { revalidatePath } from "next/cache";
import { fetchAllRacesForVenue } from "@/lib/scrape";

export async function fetchAllRacesAction(venueKey: string, raceDate: string) {
  const result = await fetchAllRacesForVenue(venueKey, raceDate);
  revalidatePath("/stats");
  return result;
}
