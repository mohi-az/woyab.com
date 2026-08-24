import { readFile } from "node:fs/promises";
import { inflateRawSync } from "node:zlib";

import { PrismaPg } from "@prisma/adapter-pg";
import { LocationCatalogKind, PrismaClient } from "@woyab/database";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const GEONAMES_URL = process.env.GEONAMES_DE_URL ?? "https://download.geonames.org/export/dump/DE.zip";
const GEONAMES_FILE = process.env.GEONAMES_DE_FILE;
const SOURCE = "GEONAMES";
const BATCH_SIZE = 1_000;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const admin1Names: Record<string, string> = {
  "01": "Baden-Württemberg",
  "02": "Bayern",
  "03": "Bremen",
  "04": "Hamburg",
  "05": "Hessen",
  "06": "Niedersachsen",
  "07": "Nordrhein-Westfalen",
  "08": "Rheinland-Pfalz",
  "09": "Saarland",
  "10": "Schleswig-Holstein",
  "11": "Brandenburg",
  "12": "Mecklenburg-Vorpommern",
  "13": "Sachsen",
  "14": "Sachsen-Anhalt",
  "15": "Thüringen",
  "16": "Berlin",
};

const includedFeatureCodes = new Set([
  "PPL", "PPLA", "PPLA2", "PPLA3", "PPLA4", "PPLC", "PPLF", "PPLG", "PPLL", "PPLR", "PPLS", "PPLX",
]);

type CatalogRow = {
  source: string;
  sourceId: string;
  name: string;
  asciiName: string | null;
  alternateNames: string[];
  searchText: string;
  featureCode: string;
  kind: typeof LocationCatalogKind[keyof typeof LocationCatalogKind];
  countryCode: string;
  admin1Code: string | null;
  admin1Name: string | null;
  parentName: string | null;
  latitude: number;
  longitude: number;
  population: bigint;
};

function findEndOfCentralDirectory(zip: Buffer) {
  const minimumOffset = Math.max(0, zip.length - 65_557);
  for (let offset = zip.length - 22; offset >= minimumOffset; offset -= 1) {
    if (zip.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error("Invalid ZIP: central directory was not found");
}

function extractDeText(zip: Buffer) {
  const endOffset = findEndOfCentralDirectory(zip);
  const entryCount = zip.readUInt16LE(endOffset + 10);
  let centralOffset = zip.readUInt32LE(endOffset + 16);

  for (let index = 0; index < entryCount; index += 1) {
    if (zip.readUInt32LE(centralOffset) !== 0x02014b50) throw new Error("Invalid ZIP central directory");
    const compressionMethod = zip.readUInt16LE(centralOffset + 10);
    const compressedSize = zip.readUInt32LE(centralOffset + 20);
    const fileNameLength = zip.readUInt16LE(centralOffset + 28);
    const extraLength = zip.readUInt16LE(centralOffset + 30);
    const commentLength = zip.readUInt16LE(centralOffset + 32);
    const localOffset = zip.readUInt32LE(centralOffset + 42);
    const fileName = zip.subarray(centralOffset + 46, centralOffset + 46 + fileNameLength).toString("utf8");

    if (fileName === "DE.txt") {
      if (zip.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("Invalid ZIP local header");
      const localNameLength = zip.readUInt16LE(localOffset + 26);
      const localExtraLength = zip.readUInt16LE(localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = zip.subarray(dataOffset, dataOffset + compressedSize);
      if (compressionMethod === 0) return compressed.toString("utf8");
      if (compressionMethod === 8) return inflateRawSync(compressed).toString("utf8");
      throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`);
    }

    centralOffset += 46 + fileNameLength + extraLength + commentLength;
  }

  throw new Error("DE.txt was not found in the GeoNames archive");
}

async function loadGeoNamesText() {
  if (GEONAMES_FILE) {
    const file = await readFile(GEONAMES_FILE);
    return GEONAMES_FILE.toLowerCase().endsWith(".zip") ? extractDeText(file) : file.toString("utf8");
  }

  console.log(`Downloading ${GEONAMES_URL}`);
  const response = await fetch(GEONAMES_URL);
  if (!response.ok) throw new Error(`GeoNames download failed with HTTP ${response.status}`);
  return extractDeText(Buffer.from(await response.arrayBuffer()));
}

function normalizedSearchText(values: string[]) {
  const text = values.join(" ").toLocaleLowerCase("de-DE");
  return `${text} ${text.normalize("NFKD").replace(/\p{M}/gu, "")}`;
}

function catalogKind(featureCode: string, population: bigint) {
  if (featureCode === "PPLX") return LocationCatalogKind.DISTRICT;
  if (featureCode.startsWith("PPLA") || featureCode === "PPLC" || population >= 10_000n) {
    return LocationCatalogKind.CITY;
  }
  return LocationCatalogKind.LOCALITY;
}

function parseRows(text: string) {
  const rows: CatalogRow[] = [];
  for (const line of text.split("\n")) {
    if (!line) continue;
    const columns = line.replace(/\r$/, "").split("\t");
    const featureCode = columns[7];
    if (columns[6] !== "P" || !includedFeatureCodes.has(featureCode)) continue;

    const latitude = Number(columns[4]);
    const longitude = Number(columns[5]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const population = BigInt(columns[14] || "0");
    const alternateNames = [...new Set((columns[3] ?? "").split(",").map((name) => name.trim()).filter(Boolean))].slice(0, 80);
    const name = columns[1];
    const asciiName = columns[2] || null;
    const admin1Code = columns[10] || null;

    rows.push({
      source: SOURCE,
      sourceId: columns[0],
      name,
      asciiName,
      alternateNames,
      searchText: normalizedSearchText([name, asciiName ?? "", ...alternateNames]),
      featureCode,
      kind: catalogKind(featureCode, population),
      countryCode: "DE",
      admin1Code,
      admin1Name: admin1Code ? admin1Names[admin1Code] ?? null : null,
      parentName: null,
      latitude,
      longitude,
      population,
    });
  }
  return rows;
}

function distanceKm(a: CatalogRow, b: CatalogRow) {
  const latitudeDistance = (b.latitude - a.latitude) * Math.PI / 180;
  const longitudeDistance = (b.longitude - a.longitude) * Math.PI / 180;
  const aLatitude = a.latitude * Math.PI / 180;
  const bLatitude = b.latitude * Math.PI / 180;
  const haversine = Math.sin(latitudeDistance / 2) ** 2
    + Math.cos(aLatitude) * Math.cos(bLatitude) * Math.sin(longitudeDistance / 2) ** 2;
  return 6_371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function assignDistrictParents(rows: CatalogRow[]) {
  const citiesByAdmin1 = new Map<string, CatalogRow[]>();
  for (const row of rows) {
    if (row.kind !== LocationCatalogKind.CITY || row.population < 20_000n || !row.admin1Code) continue;
    const cities = citiesByAdmin1.get(row.admin1Code) ?? [];
    cities.push(row);
    citiesByAdmin1.set(row.admin1Code, cities);
  }

  for (const district of rows) {
    if (district.kind !== LocationCatalogKind.DISTRICT || !district.admin1Code) continue;
    let nearest: CatalogRow | null = null;
    let nearestDistance = 40;
    for (const city of citiesByAdmin1.get(district.admin1Code) ?? []) {
      const distance = distanceKm(district, city);
      if (distance < nearestDistance) {
        nearest = city;
        nearestDistance = distance;
      }
    }
    district.parentName = nearest?.name ?? null;
  }
}

async function main() {
  const rows = parseRows(await loadGeoNamesText());
  assignDistrictParents(rows);
  if (rows.length === 0) throw new Error("GeoNames archive did not contain usable German places");

  const pool = new Pool({ connectionString: DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
  try {
    await prisma.locationCatalogEntry.deleteMany({ where: { source: SOURCE } });
    for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
      await prisma.locationCatalogEntry.createMany({ data: rows.slice(offset, offset + BATCH_SIZE) });
      console.log(`Imported ${Math.min(offset + BATCH_SIZE, rows.length)} / ${rows.length}`);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }

  const districtCount = rows.filter((row) => row.kind === LocationCatalogKind.DISTRICT).length;
  console.log(`GeoNames import complete: ${rows.length} places, including ${districtCount} districts.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
