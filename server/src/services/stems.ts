import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import {
  extractAssetIds,
  FadrAssetLike,
  getAssetId,
  getMidiStemType,
  normalizeStemType,
  TuneForgeStemType,
} from "./fadrHelpers.js";

export interface StemResult {
  type: "vocals" | "drums" | "bass" | "melody" | "instrumental" | "other";
  filePath: string;
  fileSize?: number;
}

export interface MidiAssetResult {
  stemType: string;
  midiPath: string;
  fileSize?: number;
}

export interface StemSeparationResult {
  success: boolean;
  stems?: StemResult[];
  midiFiles?: MidiAssetResult[];
  analysisData?: Record<string, unknown>;
  error?: string;
  provider?: string;
}

export interface StemProvider {
  name: string;
  isConfigured(): boolean;
  separateStems(
    audioPath: string,
    outputDir: string,
  ): Promise<StemSeparationResult>;
}

export class LalalAIProvider implements StemProvider {
  name = "lalal.ai";
  private apiKey: string | null = null;
  private apiUrl = "https://www.lalal.ai/api";

  configure(apiKey: string): void {
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async separateStems(
    audioPath: string,
    outputDir: string,
  ): Promise<StemSeparationResult> {
    if (!this.apiKey) {
      return { success: false, error: "LALAL.AI not configured" };
    }

    try {
      const formData = new FormData();
      formData.append("file", fs.createReadStream(audioPath));
      formData.append("filter_type", "2"); // Phoenix filter for best quality
      formData.append("stem", "all");

      const uploadResponse = await axios.post(
        `${this.apiUrl}/upload/`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `license ${this.apiKey}`,
          },
        },
      );

      const fileId = uploadResponse.data.id;

      await axios.post(
        `${this.apiUrl}/split/`,
        {
          id: fileId,
        },
        {
          headers: {
            Authorization: `license ${this.apiKey}`,
          },
        },
      );

      let status = "processing";
      let result: any;

      while (status === "processing") {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const statusResponse = await axios.get(`${this.apiUrl}/check/`, {
          params: { id: fileId },
          headers: {
            Authorization: `license ${this.apiKey}`,
          },
        });

        status = statusResponse.data.status;
        result = statusResponse.data;
      }

      if (status !== "done") {
        return {
          success: false,
          error: `Processing failed with status: ${status}`,
        };
      }

      const stems: StemResult[] = [];

      if (result.stems) {
        for (const [stemType, stemData] of Object.entries(result.stems) as [
          string,
          any,
        ][]) {
          const outputPath = path.join(outputDir, `${stemType}.wav`);

          const stemResponse = await axios.get(stemData.url, {
            responseType: "arraybuffer",
          });

          fs.writeFileSync(outputPath, stemResponse.data);

          stems.push({
            type: stemType as StemResult["type"],
            filePath: outputPath,
            fileSize: stemResponse.data.length,
          });
        }
      }

      return {
        success: true,
        stems,
        provider: this.name,
      };
    } catch (error) {
      console.error("LALAL.AI separation failed:", error);
      return { success: false, error: "Stem separation failed" };
    }
  }
}

export class FadrProvider implements StemProvider {
  name = "fadr";
  private apiKey: string | null = null;
  private apiUrl = process.env.FADR_API_URL || "https://api.fadr.com";

  configure(apiKey: string): void {
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  private get authHeaders(): { Authorization: string } {
    return {
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private getMimeType(filePath: string): string {
    const extension = path.extname(filePath).slice(1).toLowerCase();
    const mimeTypes: Record<string, string> = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      wave: "audio/wav",
      flac: "audio/flac",
      m4a: "audio/mp4",
      mp4: "audio/mp4",
      aac: "audio/aac",
      ogg: "audio/ogg",
    };

    return mimeTypes[extension] || "application/octet-stream";
  }

  private getExtension(filePath: string): string {
    return path.extname(filePath).slice(1).toLowerCase() || "mp3";
  }

  private async fetchAsset(assetId: string): Promise<FadrAssetLike> {
    const response = await axios.get(`${this.apiUrl}/assets/${assetId}`, {
      headers: this.authHeaders,
    });

    return response.data.asset;
  }

  private async pollTask(taskId: string): Promise<Record<string, any>> {
    const pollIntervalMs = Number(process.env.FADR_POLL_INTERVAL_MS || 5000);
    const timeoutMs = Number(
      process.env.FADR_POLL_TIMEOUT_MS || 10 * 60 * 1000,
    );
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const task = await this.getTask(taskId);
      if (task.status?.complete === true) {
        return task;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(
      `Fadr task ${taskId} timed out after ${Math.round(timeoutMs / 1000)} seconds`,
    );
  }

  private async getTask(taskId: string): Promise<Record<string, any>> {
    try {
      const response = await axios.get(`${this.apiUrl}/tasks/${taskId}`, {
        headers: this.authHeaders,
      });

      return response.data.task;
    } catch (error) {
      const response = await axios.post(
        `${this.apiUrl}/tasks/query`,
        { _ids: [taskId] },
        { headers: this.authHeaders },
      );

      const task = response.data.tasks?.[0];
      if (!task) {
        throw error;
      }

      return task;
    }
  }

  private async downloadAsset(
    assetId: string,
    outputPath: string,
    quality: "download" | "hqPreview" | "preview" = "download",
  ): Promise<number> {
    const urlResponse = await axios.get(
      `${this.apiUrl}/assets/download/${assetId}/${quality}`,
      {
        headers: this.authHeaders,
      },
    );

    const downloadUrl = urlResponse.data.url;
    if (!downloadUrl) {
      throw new Error(
        `Fadr did not return a download URL for asset ${assetId}`,
      );
    }

    const fileResponse = await axios.get(downloadUrl, {
      responseType: "arraybuffer",
    });

    const buffer = Buffer.from(fileResponse.data);
    fs.writeFileSync(outputPath, buffer);
    return buffer.length;
  }

  private extractAnalysisData(
    sourceAsset: FadrAssetLike,
    completedTask: Record<string, any>,
    stemAssetIds: string[],
    midiAssetIds: string[],
    chordAssetIds: string[],
  ): Record<string, unknown> {
    const taskAsset =
      typeof completedTask.asset === "object"
        ? (completedTask.asset as FadrAssetLike)
        : null;
    const sourceMeta = sourceAsset.metaData || {};
    const taskMeta = taskAsset?.metaData || {};

    return {
      provider: this.name,
      key: taskMeta.key || sourceMeta.key || null,
      tempo: taskMeta.tempo || sourceMeta.tempo || null,
      chordProgression:
        taskMeta.chords ||
        taskMeta.chordProgression ||
        sourceMeta.chords ||
        sourceMeta.chordProgression ||
        null,
      fadr: {
        sourceAssetId: getAssetId(sourceAsset),
        taskId: completedTask._id || completedTask.id || null,
        stemAssetIds,
        midiAssetIds,
        chordAssetIds,
      },
    };
  }

  async separateStems(
    audioPath: string,
    outputDir: string,
  ): Promise<StemSeparationResult> {
    if (!this.apiKey) {
      return { success: false, error: "Fadr not configured" };
    }

    try {
      const fileName = path.basename(audioPath);
      const extension = this.getExtension(audioPath);
      const mimeType = this.getMimeType(audioPath);
      const group = `tuneforge-${path.basename(outputDir)}-${Date.now()}`;

      const uploadUrlResponse = await axios.post(
        `${this.apiUrl}/assets/upload2`,
        {
          name: fileName,
          extension,
        },
        {
          headers: this.authHeaders,
        },
      );

      const uploadUrl = uploadUrlResponse.data.url;
      const s3Path =
        uploadUrlResponse.data.s3Path || uploadUrlResponse.data.s3path;
      if (!uploadUrl || !s3Path) {
        return {
          success: false,
          error: "Fadr did not return upload URL details",
        };
      }

      await axios.put(uploadUrl, fs.readFileSync(audioPath), {
        headers: {
          "Content-Type": mimeType,
        },
      });

      const assetResponse = await axios.post(
        `${this.apiUrl}/assets`,
        {
          name: fileName,
          extension,
          group,
          s3Path,
        },
        {
          headers: this.authHeaders,
        },
      );

      const sourceAsset = assetResponse.data.asset as FadrAssetLike;
      const sourceAssetId = getAssetId(sourceAsset);
      if (!sourceAssetId) {
        return {
          success: false,
          error: "Fadr did not return a source asset ID",
        };
      }

      const taskResponse = await axios.post(
        `${this.apiUrl}/assets/analyze/stem`,
        {
          _id: sourceAssetId,
          stemType: "main",
        },
        {
          headers: this.authHeaders,
        },
      );

      const taskId = taskResponse.data.task?._id || taskResponse.data.task?.id;
      if (!taskId) {
        return { success: false, error: "Fadr did not return a stem task ID" };
      }

      const completedTask = await this.pollTask(taskId);
      const completedSourceAsset = await this.fetchAsset(sourceAssetId);
      const taskAsset =
        typeof completedTask.asset === "object"
          ? (completedTask.asset as FadrAssetLike)
          : null;
      const outputAssetIds = extractAssetIds(completedTask.output?.assets);

      let stemAssetIds = Array.from(
        new Set([
          ...extractAssetIds(completedSourceAsset.stems),
          ...extractAssetIds(taskAsset?.stems),
        ]),
      );

      let midiAssetIds = Array.from(
        new Set([
          ...extractAssetIds(completedSourceAsset.midi),
          ...extractAssetIds(taskAsset?.midi),
        ]),
      );

      if (
        stemAssetIds.length === 0 &&
        midiAssetIds.length === 0 &&
        outputAssetIds.length > 0
      ) {
        const outputAssets = await Promise.all(
          outputAssetIds.map((id) => this.fetchAsset(id)),
        );
        stemAssetIds = outputAssets
          .filter(
            (asset) =>
              normalizeStemType(asset.metaData?.stemType || asset.name) !==
              null,
          )
          .map((asset) => getAssetId(asset))
          .filter((id): id is string => Boolean(id));
        midiAssetIds = outputAssets
          .filter((asset) => getMidiStemType(asset) !== null)
          .map((asset) => getAssetId(asset))
          .filter((id): id is string => Boolean(id));
      }

      const stems: StemResult[] = [];
      const stemAssets = await Promise.all(
        stemAssetIds.map((id) => this.fetchAsset(id)),
      );

      for (const stemAsset of stemAssets) {
        const stemAssetId = getAssetId(stemAsset);
        const stemType = normalizeStemType(
          stemAsset.metaData?.stemType || stemAsset.name,
        );
        if (!stemAssetId || !stemType) continue;

        const outputPath = path.join(outputDir, `${stemType}.wav`);
        const fileSize = await this.downloadAsset(
          stemAssetId,
          outputPath,
          "download",
        );

        stems.push({
          type: stemType,
          filePath: outputPath,
          fileSize,
        });
      }

      const midiFiles: MidiAssetResult[] = [];
      const chordAssetIds: string[] = [];
      const midiOutputDir = path.join(
        path.dirname(path.dirname(outputDir)),
        "midi",
        path.basename(outputDir),
      );

      if (!fs.existsSync(midiOutputDir)) {
        fs.mkdirSync(midiOutputDir, { recursive: true });
      }

      const midiAssets = await Promise.all(
        midiAssetIds.map((id) => this.fetchAsset(id)),
      );
      for (const midiAsset of midiAssets) {
        const midiAssetId = getAssetId(midiAsset);
        const midiType = getMidiStemType(midiAsset);
        if (!midiAssetId || !midiType) continue;

        if (midiType === "chords") {
          chordAssetIds.push(midiAssetId);
          continue;
        }

        const outputPath = path.join(midiOutputDir, `${midiType}.mid`);
        const fileSize = await this.downloadAsset(
          midiAssetId,
          outputPath,
          "download",
        );

        midiFiles.push({
          stemType: midiType,
          midiPath: outputPath,
          fileSize,
        });
      }

      if (stems.length === 0) {
        return {
          success: false,
          error: "Fadr completed but returned no downloadable stems",
        };
      }

      return {
        success: true,
        stems,
        midiFiles,
        analysisData: this.extractAnalysisData(
          completedSourceAsset,
          completedTask,
          stemAssetIds,
          midiAssetIds,
          chordAssetIds,
        ),
        provider: this.name,
      };
    } catch (error) {
      console.error("Fadr separation failed:", error);
      const message =
        error instanceof Error ? error.message : "Stem separation failed";
      return { success: false, error: message };
    }
  }
}

export class StemSeparationManager {
  private providers: StemProvider[] = [];

  constructor() {
    const fadrProvider = new FadrProvider();
    const lalalProvider = new LalalAIProvider();

    if (process.env.FADR_API_KEY) {
      fadrProvider.configure(process.env.FADR_API_KEY);
    }

    if (process.env.LALAL_API_KEY) {
      lalalProvider.configure(process.env.LALAL_API_KEY);
    }

    this.providers = [fadrProvider, lalalProvider];
  }

  configureProvider(name: string, apiKey: string): void {
    const provider = this.providers.find((p) => p.name === name);
    if (provider && "configure" in provider) {
      (provider as any).configure(apiKey);
    }
  }

  async separateStems(
    audioPath: string,
    outputDir: string,
    preferredProvider?: string,
  ): Promise<StemSeparationResult> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (preferredProvider) {
      const provider = this.providers.find(
        (p) => p.name === preferredProvider && p.isConfigured(),
      );
      if (provider) {
        return provider.separateStems(audioPath, outputDir);
      }
    }

    for (const provider of this.providers) {
      if (provider.isConfigured()) {
        const result = await provider.separateStems(audioPath, outputDir);
        if (result.success) {
          return result;
        }
      }
    }

    return {
      success: false,
      error:
        "No configured stem separation provider available. Configure FADR_API_KEY for TuneForge v1 processing.",
    };
  }
}

export const stemManager = new StemSeparationManager();
