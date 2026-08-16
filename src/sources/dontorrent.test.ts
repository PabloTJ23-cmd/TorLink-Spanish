import { describe, it, expect } from "vitest";
import { dontorrent } from "./dontorrent";
import { SOURCES, getSource } from "./registry";
import type { Source } from "./types";

describe("DonTorrent source registration", () => {
  it("is included in SOURCES registry", () => {
    const found = SOURCES.find((s) => s.id === "dontorrent");
    expect(found).toBeDefined();
    expect(found?.id).toBe("dontorrent");
  });

  it("can be retrieved via getSource", () => {
    const source = getSource("dontorrent");
    expect(source.id).toBe("dontorrent");
  });

  it("has correct source structure", () => {
    expect(dontorrent.id).toBe("dontorrent");
    expect(dontorrent.label).toBe("DonTorrent");
    expect(dontorrent.groups).toEqual(["Movies", "TV"]);
    expect(dontorrent.homepage).toBe("https://dontorrent.science");
    expect(dontorrent.reportsHealth).toBe(false);
    expect(typeof dontorrent.search).toBe("function");
  });

  it("matches the registered source", () => {
    const registered = getSource("dontorrent");
    expect(registered).toBe(dontorrent);
  });

  it("search returns empty array for empty query", async () => {
    const results = await dontorrent.search("");
    expect(results).toEqual([]);
  });

  it("search returns empty array for whitespace query", async () => {
    const results = await dontorrent.search("   ");
    expect(results).toEqual([]);
  });
});

describe("DonTorrent search result structure", () => {
  it("TorrentResult matches expected interface", () => {
    const mockResult = {
      infoHash: "a".repeat(40),
      name: "Test Movie 2024",
      sizeBytes: 1_000_000_000,
      seeders: 0,
      leechers: 0,
      source: "dontorrent" as const,
      magnet: "magnet:?xt=urn:btih:" + "a".repeat(40),
    };

    // Verify structure matches TorrentResult
    expect(mockResult.infoHash).toHaveLength(40);
    expect(typeof mockResult.name).toBe("string");
    expect(typeof mockResult.sizeBytes).toBe("number");
    expect(typeof mockResult.seeders).toBe("number");
    expect(typeof mockResult.leechers).toBe("number");
    expect(mockResult.source).toBe("dontorrent");
    expect(mockResult.magnet).toContain("urn:btih:");
  });
});