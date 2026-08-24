const BASE_URL = "https://autorace.jp";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// Be polite: never hit the upstream site more than once every ~1.2s.
let lastRequestAt = 0;
async function throttle() {
  const minGapMs = 1200;
  const wait = lastRequestAt + minGapMs - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

// autorace.jp is a Laravel app: every write needs the XSRF-TOKEN cookie
// echoed back as an X-XSRF-TOKEN header, alongside the session cookie.
// Both cookies rotate on every response, so we keep them in memory and
// refresh from whichever response we last saw.
interface CookieJar {
  xsrfToken?: string;
  session?: string;
}
const cookieJar: CookieJar = {};

function absorbSetCookies(headers: Headers) {
  const setCookies =
    typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  for (const sc of setCookies) {
    const pair = sc.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const name = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    if (name === "XSRF-TOKEN") cookieJar.xsrfToken = decodeURIComponent(value);
    if (name === "race_info_session") cookieJar.session = value;
  }
}

function cookieHeader(): string {
  const parts: string[] = [];
  if (cookieJar.xsrfToken)
    parts.push(`XSRF-TOKEN=${encodeURIComponent(cookieJar.xsrfToken)}`);
  if (cookieJar.session) parts.push(`race_info_session=${cookieJar.session}`);
  return parts.join("; ");
}

async function ensureSession() {
  if (cookieJar.xsrfToken && cookieJar.session) return;
  const res = await fetch(`${BASE_URL}/race_info/Live/iizuka`, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });
  absorbSetCookies(res.headers);
}

interface ApiEnvelope<T> {
  result: string;
  errors: { code?: string; message?: string }[];
  body: T;
}

/** Thrown when autorace.jp reports "no data" for the requested race (code 4101). */
export class NoRaceDataError extends Error {}

// Serialize every request against autorace.jp: the XSRF/session cookie pair
// rotates on each response, so concurrent requests racing to read/write the
// shared cookie jar can end up mixing a stale token with a newer session
// (or vice versa) and get rejected with 419. A single in-flight chain avoids
// that entirely and also gives us a natural place to enforce the throttle.
let requestChain: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = requestChain.then(task);
  requestChain = result.catch(() => undefined);
  return result;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  return enqueue(() => doPostJson<T>(path, body));
}

async function doPostJson<T>(path: string, body: unknown): Promise<T> {
  await throttle();
  await ensureSession();

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      Referer: `${BASE_URL}/race_info/Live/iizuka`,
      "X-Requested-With": "XMLHttpRequest",
      "X-XSRF-TOKEN": cookieJar.xsrfToken ?? "",
      Cookie: cookieHeader(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  absorbSetCookies(res.headers);
  if (!res.ok) {
    throw new Error(`autorace.jp ${path} returned ${res.status}`);
  }
  const envelope = (await res.json()) as ApiEnvelope<T>;
  if (envelope.result !== "Success") {
    if (envelope.errors.some((e) => e.code === "4101")) {
      throw new NoRaceDataError(`No data for ${path} ${JSON.stringify(body)}`);
    }
    throw new Error(
      `autorace.jp ${path} returned non-success result: ${JSON.stringify(envelope.errors)}`,
    );
  }
  return envelope.body;
}

export interface ProgramPlayer {
  carNo: number;
  playerCode: string;
  playerName: string;
  placeKey: string;
  placeName: string;
  graduationCode: string;
  age: number;
  bikeClass: number;
  bikeName: string;
  rank: string;
  handicap: number;
  trialRunTime: string;
  raceDev: string;
  rate2: string;
  rate3: string;
}

export interface RecentRaceEntry {
  raceDate: string;
  placeName: string;
  raceNo: number;
  order: string;
  raceTime: string;
  trialTime: string;
  stTime: string;
}

export interface ProgramResponse {
  playerList: ProgramPlayer[];
  latest3List: Record<string, RecentRaceEntry[]>;
}

export interface RaceResultEntry {
  order: number;
  carNo: number;
  playerName: string;
  raceTime: string;
  st: string;
}

export interface RaceResultResponse {
  raceResult: RaceResultEntry[];
}

interface RaceQuery {
  placeCode: number;
  raceDate: string; // YYYY-MM-DD
  raceNo: number;
}

export async function fetchProgram(query: RaceQuery): Promise<ProgramResponse> {
  return postJson<ProgramResponse>("/race_info/Program", query);
}

export async function fetchRaceResult(
  query: RaceQuery,
): Promise<RaceResultResponse> {
  return postJson<RaceResultResponse>("/race_info/RaceResult", query);
}

export interface OtherRaceInfoResponse {
  distance: number; // meters
  weather: string;
  raceStartTime: string;
}

export async function fetchOtherRaceInfo(
  query: RaceQuery,
): Promise<OtherRaceInfoResponse> {
  return postJson<OtherRaceInfoResponse>("/race_info/OtherRaceInfo", query);
}
