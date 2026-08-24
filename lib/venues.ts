export type VenueKey =
  | "kawaguchi"
  | "isesaki"
  | "hamamatsu"
  | "iizuka"
  | "sanyou";

export const VENUES: { key: VenueKey; code: number; name: string }[] = [
  { key: "kawaguchi", code: 2, name: "川口" },
  { key: "isesaki", code: 3, name: "伊勢崎" },
  { key: "hamamatsu", code: 4, name: "浜松" },
  { key: "iizuka", code: 5, name: "飯塚" },
  { key: "sanyou", code: 6, name: "山陽" },
];

export function venueByKey(key: string) {
  return VENUES.find((v) => v.key === key);
}
