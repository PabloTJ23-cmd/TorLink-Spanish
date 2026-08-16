import { fetchResilient, HttpError, USER_AGENT } from "../util/net";
import { buildMagnet } from "./magnet";
import type { SearchOptions, Source, TorrentResult } from "./types";
import parseTorrent from "parse-torrent";

// DonTorrent rotates domains almost weekly (blocked by ISPs/courts; the
// current one is announced on their Telegram channel, @dontorrent). Keep this
// list fresh: recently-announced domains first, older ones as fallback.
const DEFAULT_HOST = "dontorrent.science";
const KNOWN_HOSTS = [
  "dontorrent.science",
  "dontorrent.racing",
  "dontorrent.pink",
  "dontorrent.rocks",
  "dontorrent.band",
  "dontorrent.ninja",
  "dontorrent.lol",
  "dontorrent.uno",
];
let workingHostIndex = 0;

const MAX_RESULTS = 10;
const MAX_DETAIL_FETCHES = 5;
const TORRENT_TIMEOUT_MS = 10000;

interface SearchRow {
  name: string;
  detailUrl: string;
}

function parseSearchRows(html: string): SearchRow[] {
  const out: SearchRow[] = [];

  // Pattern: <a href="/pelicula/nombre-pelicula" class="...">Title</a>
  // DonTorrent search results typically have links to detail pages
  const linkRegex = /<a\s+href="(\/(?:pelicula|serie|episodio)\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    const detailUrl = match[1]!;
    const name = match[2]!.trim();

    // Filter out navigation/UI links
    if (
      name &&
      detailUrl &&
      !name.match(/^(inicio|peliculas|series|estrenos|generos|años|calidad|idioma|buscar)$/i) &&
      name.length > 3
    ) {
      out.push({ name, detailUrl });
    }
  }

  // Deduplicate by detailUrl
  const seen = new Set<string>();
  return out.filter((row) => {
    if (seen.has(row.detailUrl)) return false;
    seen.add(row.detailUrl);
    return true;
  }).slice(0, MAX_RESULTS);
}

async function fetchWithTimeout(url: string, opts: SearchOptions, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const signal = opts.signal
    ? AbortSignal.any([opts.signal, controller.signal])
    : controller.signal;

  try {
    return await fetchResilient(url, {
      headers: { "User-Agent": USER_AGENT },
      signal,
      retries: 1,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchTextWithTimeout(url: string, opts: SearchOptions, timeoutMs: number): Promise<string> {
  const res = await fetchWithTimeout(url, opts, timeoutMs);
  if (!res.ok) throw new HttpError(res.status, `DonTorrent returned ${res.status}`);
  return res.text();
}

async function fetchDetailPage(base: string, path: string, opts: SearchOptions): Promise<string> {
  return fetchTextWithTimeout(`${base}${path}`, opts, TORRENT_TIMEOUT_MS);
}

function parseTorrentDownloadLink(html: string, baseUrl: string): string | null {
  // Look for .torrent download links in the detail page
  // Pattern 1: <a href="/download/12345" class="download-torrent">Descargar</a>
  // Pattern 2: <a href="https://dontorrent.band/download/12345.torrent">Descargar torrent</a>
  // Pattern 3: Direct .torrent links
  const patterns = [
    /href="(\/download\/[^"]+\.torrent)"/i,
    /href="(\/download\/[^"]+)"/i,
    /href="([^"]+\.torrent)"/i,
    /href="([^"]*download[^"]*\.torrent)"/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const link = match[1]!;
      return link.startsWith("http") ? link : `${baseUrl}${link}`;
    }
  }
  return null;
}

async function downloadTorrentFile(torrentUrl: string, opts: SearchOptions): Promise<Uint8Array | null> {
  try {
    const res = await fetchWithTimeout(torrentUrl, opts, TORRENT_TIMEOUT_MS);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch {
    return null;
  }
}

async function processResult(base: string, row: SearchRow, opts: SearchOptions): Promise<TorrentResult | null> {
  try {
    const detailHtml = await fetchDetailPage(base, row.detailUrl, opts);
    const torrentUrl = parseTorrentDownloadLink(detailHtml, base);
    if (!torrentUrl) return null;

    const torrentBuffer = await downloadTorrentFile(torrentUrl, opts);
    if (!torrentBuffer) return null;

    const parsed = await parseTorrent(torrentBuffer);
    const infoHash = parsed?.infoHash?.toLowerCase();
    if (!infoHash) return null;

    const name = parsed.name || row.name;
    const sizeBytes = (parsed as any).length || 0;

    // DonTorrent doesn't provide seeders/leechers
    return {
      infoHash,
      name,
      sizeBytes,
      seeders: 0,
      leechers: 0,
      source: "dontorrent",
      magnet: buildMagnet(infoHash, name),
    };
  } catch {
    return null;
  }
}

async function search(query: string, opts: SearchOptions = {}): Promise<TorrentResult[]> {
  const q = query.trim();
  if (!q) return [];

  let base = "";
  let html = "";

  // Try multiple hosts in case the default is down
  for (let i = 0; i < KNOWN_HOSTS.length; i++) {
    const hostIdx = (workingHostIndex + i) % KNOWN_HOSTS.length;
    const host = KNOWN_HOSTS[hostIdx];
    try {
      const candidate = `https://${host}`;
      const searchUrl = `${candidate}/buscar?q=${encodeURIComponent(q)}`;
      html = await fetchTextWithTimeout(searchUrl, opts, TORRENT_TIMEOUT_MS);
      base = candidate;
      workingHostIndex = hostIdx;
      break;
    } catch (e) {
      if (opts.signal?.aborted) throw e;
    }
  }

  // Every host failed (dead domain, TLS/DNS block, or a Cloudflare Turnstile
  // challenge that answers 200 with a robot-check page and no search rows).
  // Fail gracefully as an empty column instead of crashing the search. Plain
  // fetch cannot pass the Turnstile challenge; bypassing it would need
  // cloudscraper, puppeteer, or similar (no new deps added without approval).
  if (!base) return [];

  const rows = parseSearchRows(html);
  if (rows.length === 0) return [];

  // Process detail pages concurrently but limit concurrency
  const results: TorrentResult[] = [];
  const detailRows = rows.slice(0, MAX_DETAIL_FETCHES);

  // Process in batches to limit concurrency
  const BATCH_SIZE = 3;
  for (let i = 0; i < detailRows.length; i += BATCH_SIZE) {
    if (opts.signal?.aborted) break;

    const batch = detailRows.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map((row) => processResult(base, row, opts))
    );

    for (const result of settled) {
      if (result.status === "fulfilled" && result.value) {
        results.push(result.value);
      }
    }
  }

  return results;
}

export const dontorrent: Source = {
  id: "dontorrent",
  label: "DonTorrent",
  groups: ["Movies", "TV"],
  homepage: `https://${DEFAULT_HOST}`,
  reportsHealth: false,
  search,
};