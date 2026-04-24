export type TuneForgeStemType =
  | "vocals"
  | "drums"
  | "bass"
  | "melody"
  | "instrumental"
  | "other";
export type FadrMidiType = TuneForgeStemType | "chords";

export interface FadrAssetLike {
  _id?: string;
  id?: string;
  name?: string;
  metaData?: {
    stemType?: string;
    sourceType?: string;
    key?: string;
    tempo?: number;
    chords?: unknown;
    chordProgression?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const STEM_ALIASES: Array<[TuneForgeStemType, RegExp]> = [
  ["vocals", /\b(vocal|vocals|voice|lead vocal|main vocal)\b/i],
  ["drums", /\b(drum|drums|percussion|kick|snare|hat|cymbal)\b/i],
  ["bass", /\b(bass|bassline|bass line)\b/i],
  [
    "melody",
    /\b(melody|melodies|melodic|piano|guitar|synth|strings|wind|lead)\b/i,
  ],
  ["instrumental", /\b(instrumental|accompaniment|no vocals|minus vocal)\b/i],
  ["other", /\b(other)\b/i],
];

export function normalizeStemType(value: unknown): TuneForgeStemType | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;

  for (const [stemType, pattern] of STEM_ALIASES) {
    if (pattern.test(normalized)) {
      return stemType;
    }
  }

  return null;
}

export function getAssetId(asset: unknown): string | null {
  if (typeof asset === "string" && asset.trim()) {
    return asset;
  }

  if (!asset || typeof asset !== "object") {
    return null;
  }

  const candidate = asset as FadrAssetLike;
  return candidate._id || candidate.id || null;
}

export function extractAssetIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => getAssetId(item))
    .filter((id): id is string => Boolean(id));
}

export function getMidiStemType(asset: FadrAssetLike): FadrMidiType | null {
  const label = [
    asset.metaData?.stemType,
    asset.metaData?.sourceType,
    asset.name,
  ]
    .filter(Boolean)
    .join(" ");

  if (/\b(chord|chords|progression)\b/i.test(label)) {
    return "chords";
  }

  return normalizeStemType(label);
}
