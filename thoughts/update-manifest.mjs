import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const recordingsDir = path.join(__dirname, "recordings");
const manifestPath = path.join(recordingsDir, "index.json");

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

const AUDIO_FILE_PATTERN = /\.(mp3|m4a)$/i;
const TRANSCRIBE_MODEL =
  process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";
const TRANSCRIBE_LANGUAGE = process.env.OPENAI_TRANSCRIBE_LANGUAGE || "en";
const TRANSCRIBE_PROMPT =
  process.env.OPENAI_TRANSCRIBE_PROMPT ||
  "Transcribe this short spoken thought accurately. Preserve casing and punctuation where possible.";

async function loadLocalEnv() {
  const envPath = path.join(__dirname, ".env.local");

  try {
    const raw = await readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, equalsIndex).trim();
      let value = trimmed.slice(equalsIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

function prettyTitleFromFilename(fileName) {
  const base = fileName
    .replace(AUDIO_FILE_PATTERN, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!base) {
    return "Untitled thought";
  }

  return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
}

function getFileTypeLabel(fileName) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension ? extension.toUpperCase() : "Audio";
}

async function readExistingManifest() {
  try {
    const raw = await readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw);
    const files = Array.isArray(parsed?.files) ? parsed.files : [];
    const byFile = new Map();

    for (const entry of files) {
      if (entry && typeof entry === "object" && typeof entry.file === "string") {
        byFile.set(entry.file, entry);
      } else if (typeof entry === "string") {
        byFile.set(entry, { file: entry });
      }
    }

    return byFile;
  } catch {
    return new Map();
  }
}

async function getAudioFiles() {
  const entries = await readdir(recordingsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && AUDIO_FILE_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => collator.compare(a, b));
}

async function getProbeData(filePath) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);

  return JSON.parse(stdout);
}

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

function normalizeTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function extractMetadataFromProbe(probe, fileName) {
  const formatTags = probe?.format?.tags || {};
  const streamTags = probe?.streams?.find((stream) => stream.codec_type === "audio")?.tags || {};
  const title = firstNonEmpty(
    formatTags.title,
    streamTags.title,
    formatTags["\u00a9nam"],
    streamTags["\u00a9nam"],
  );
  const text = firstNonEmpty(
    formatTags.comment,
    streamTags.comment,
    formatTags.description,
    streamTags.description,
    formatTags.lyrics,
    streamTags.lyrics,
    formatTags.synopsis,
    streamTags.synopsis,
  );
  const recordedAt = normalizeTimestamp(
    firstNonEmpty(
      formatTags.creation_time,
      streamTags.creation_time,
      formatTags.date,
      streamTags.date,
      formatTags["\u00a9day"],
      streamTags["\u00a9day"],
    ),
  );
  const durationValue = Number(probe?.format?.duration);
  const duration = Number.isFinite(durationValue) ? durationValue : null;

  return {
    title: title || prettyTitleFromFilename(fileName),
    text: text || "",
    recordedAt,
    duration,
    fileType: getFileTypeLabel(fileName),
  };
}

async function transcribeFile(filePath, fileName) {
  if (!process.env.OPENAI_API_KEY) {
    return "";
  }

  const fileBuffer = await readFile(filePath);
  const file = new File([fileBuffer], fileName);
  const formData = new FormData();
  formData.set("file", file);
  formData.set("model", TRANSCRIBE_MODEL);
  formData.set("language", TRANSCRIBE_LANGUAGE);
  formData.set("prompt", TRANSCRIBE_PROMPT);
  formData.set("response_format", "json");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transcription failed for ${fileName}: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  return typeof payload?.text === "string" ? payload.text.trim() : "";
}

function canReuseTranscript(existingEntry, fileStats) {
  return (
    existingEntry &&
    existingEntry.size === fileStats.size &&
    existingEntry.mtimeMs === fileStats.mtimeMs &&
    typeof existingEntry.text === "string" &&
    existingEntry.text.trim().length > 0
  );
}

async function buildManifestEntry(fileName, existingEntries) {
  const filePath = path.join(recordingsDir, fileName);
  const fileStats = await stat(filePath);
  const existing = existingEntries.get(fileName);
  const probe = await getProbeData(filePath);
  const metadata = extractMetadataFromProbe(probe, fileName);

  let text = metadata.text;
  let transcriptSource = text ? "embedded-metadata" : "none";

  if (canReuseTranscript(existing, fileStats)) {
    text = existing.text.trim();
    transcriptSource = existing.transcriptSource || "cached";
  } else if (!text && process.env.OPENAI_API_KEY) {
    text = await transcribeFile(filePath, fileName);
    transcriptSource = text ? "openai" : "none";
  }

  return {
    file: fileName,
    title: metadata.title,
    text,
    recordedAt: metadata.recordedAt,
    duration: metadata.duration,
    fileType: metadata.fileType,
    transcriptSource,
    size: fileStats.size,
    mtimeMs: fileStats.mtimeMs,
  };
}

async function main() {
  await loadLocalEnv();
  const existingEntries = await readExistingManifest();
  const files = await getAudioFiles();
  const items = [];

  for (const fileName of files) {
    const entry = await buildManifestEntry(fileName, existingEntries);
    items.push(entry);
    console.log(
      `${fileName}: ${entry.text ? `transcript via ${entry.transcriptSource}` : "no transcript"}`,
    );
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    files: items,
  };

  await writeFile(manifestPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${items.length} recording${items.length === 1 ? "" : "s"} to ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
