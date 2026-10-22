import { OutputComparison } from "./version/OutputComparison";
import { isRecord } from "@/domain/shared/isRecord";
import { isAllowedAttachment, MAX_FILES, MAX_TOTAL_SIZE, sanitizeFilename } from "@/domain/stuff/AttachmentRules";

export type ProblemDraftTestCaseInput = {
	input: string;
	expectedOutput: string;
};

export class ProblemDraftInputError extends Error {
	constructor(
		public readonly status: number,
		message: string,
	) {
		super(message);
	}
}

export class ProblemDraftInput {
	private constructor(
		public readonly name: string,
		public readonly description: string | null,
		public readonly difficulty: string | null,
		public readonly timeLimitMs: number,
		public readonly memoryLimitKb: number,
		public readonly outputComparison: OutputComparison,
		public readonly languageIds: number[],
		public readonly testCases: ProblemDraftTestCaseInput[],
		public readonly files: File[],
		public readonly filenames: string[],
		public readonly versionNumber: number | null,
		public readonly existingStuffIds: string[],
	) {}

	public static async fromFormData(
		formData: FormData,
		options: { mode: "create" | "update" },
	): Promise<ProblemDraftInput> {
		const payload = formData.get("payload");
		const rawFiles = formData.getAll("files");
		if (typeof payload !== "string" || !rawFiles.every(value => value instanceof File)) {
			throw new ProblemDraftInputError(400, "Invalid multipart request.");
		}

		let body: Record<string, unknown>;
		try {
			const parsed: unknown = JSON.parse(payload);
			if (!isRecord(parsed)) {
				throw new Error("Invalid data object.");
			}
			body = parsed;
		} catch {
			throw new ProblemDraftInputError(400, "Invalid multipart request.");
		}

		const versionNumber = body.versionNumber;
		if (options.mode === "update" && (
			typeof versionNumber !== "number" ||
			!Number.isSafeInteger(versionNumber) ||
			versionNumber <= 0
		)) {
			throw new ProblemDraftInputError(400, "Invalid draft version.");
		}

		const name = typeof body.name === "string" ? body.name.trim() : "";
		if (!name) throw new ProblemDraftInputError(400, "Problem name is required.");
		if (name.length > 200) throw new ProblemDraftInputError(400, "Problem name must not exceed 200 characters.");
		if (typeof body.description === "string" && body.description.length > 20_000) {
			throw new ProblemDraftInputError(400, "Problem description must not exceed 20,000 characters.");
		}

		const timeLimitMs = body.timeLimitMs;
		const memoryLimitKb = body.memoryLimitKb;
		if (
			typeof timeLimitMs !== "number" || !Number.isSafeInteger(timeLimitMs) || timeLimitMs < 1 || timeLimitMs > 60_000 ||
			typeof memoryLimitKb !== "number" || !Number.isSafeInteger(memoryLimitKb) || memoryLimitKb < 1 || memoryLimitKb > 1_048_576
		) {
			throw new ProblemDraftInputError(400, "Time must be 1–60,000 ms and memory must be 1–1,048,576 KB.");
		}

		const outputComparison = body.outputComparison;
		if (typeof outputComparison !== "string" || !Object.values(OutputComparison).includes(outputComparison as OutputComparison)) {
			throw new ProblemDraftInputError(400, "Invalid output comparison.");
		}

		const languageIds = body.languageIds;
		if (
			!Array.isArray(languageIds) || languageIds.length === 0 ||
			!languageIds.every(value => typeof value === "number" && Number.isSafeInteger(value) && value > 0)
		) {
			throw new ProblemDraftInputError(400, "Select at least one valid language.");
		}

		const rawTestCases = body.testCases;
		if (
			!Array.isArray(rawTestCases) || rawTestCases.length === 0 || rawTestCases.length > 100 ||
			!rawTestCases.every(value =>
				isRecord(value) && typeof value.input === "string" && value.input.length <= 100_000 &&
				typeof value.expectedOutput === "string" && value.expectedOutput.length <= 100_000,
			)
		) {
			throw new ProblemDraftInputError(400, "At least one valid test case is required.");
		}
		const testCases = rawTestCases.map(value => {
			const item = value as Record<string, unknown>;
			return { input: item.input as string, expectedOutput: item.expectedOutput as string };
		});

		const existingStuffIds = options.mode === "update" ? body.existingStuffIds : [];
		if (options.mode === "update" && (
			!Array.isArray(existingStuffIds) || !existingStuffIds.every(value => typeof value === "string")
		)) {
			throw new ProblemDraftInputError(400, "Invalid attachment selection.");
		}
		const normalizedStuffIds = existingStuffIds as string[];

		const files = rawFiles as File[];
		if (options.mode === "create" && files.length > MAX_FILES) {
			throw new ProblemDraftInputError(400, `You can upload at most ${MAX_FILES} files.`);
		}
		if (options.mode === "update" && normalizedStuffIds.length + files.length > MAX_FILES) {
			throw new ProblemDraftInputError(400, `You can attach at most ${MAX_FILES} files.`);
		}

		let totalSize = 0;
		const filenames: string[] = [];
		for (const file of files) {
			const filename = sanitizeFilename(file.name);
			if (!isAllowedAttachment(filename, file.type)) {
				throw new ProblemDraftInputError(400, `Unsupported file type: ${filename}`);
			}
			totalSize += file.size;
			filenames.push(filename);
		}
		if (totalSize > MAX_TOTAL_SIZE) {
			throw new ProblemDraftInputError(
				413,
				options.mode === "create"
					? "The combined file size must not exceed 4 MiB."
					: "The combined size of new files must not exceed 4 MiB.",
			);
		}

		return new ProblemDraftInput(
			name,
			typeof body.description === "string" ? body.description : null,
			typeof body.difficulty === "string" ? body.difficulty.trim() || null : null,
			timeLimitMs,
			memoryLimitKb,
			outputComparison as OutputComparison,
			[...new Set(languageIds as number[])],
			testCases,
			files,
			filenames,
			typeof versionNumber === "number" ? versionNumber : null,
			normalizedStuffIds,
		);
	}
}
