import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { NextResponse } from "next/server";

import { requireApiAdmin, route } from "@/lib/http";
import { supabaseAdmin } from "@/data/supabase/supabase-admin";
import { ProblemRepo } from "@/domain/problem/ProblemRepo";
import { StuffRepo, type CreateStuffData, } from "@/data/supabase/repositories/StuffRepo";
import { OutputComparison } from "@/domain/problem/version/OutputComparison";
import { ProblemVersionStatus } from "@/domain/problem/version/ProblemVersionStatus";
import { isAllowedAttachment } from "@/lib/attachment-validation";
import { isUuid } from "@/lib/isUuid";

export const runtime = "nodejs";

const BUCKET = "problem-files";
const MAX_FILES = 10;
const MAX_TOTAL_SIZE = 4 * 1024 * 1024;

const problemRepo = new ProblemRepo();
const stuffRepo = new StuffRepo();

type Props = {
	params: Promise<{ id: string }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeFilename(filename: string): string {
	const basename = filename.replace(/\\/g, "/").split("/").pop() ?? "";
	const cleaned = basename
		.replace(/[\u0000-\u001f\u007f]/g, "")
		.replace(/[<>:"|?*]/g, "_")
		.trim();

	return cleaned && cleaned !== "." && cleaned !== ".."
		? cleaned
		: "attachment";
}

export const PUT = route<Props>(async (request: Request, { params }) => {
	const user = await requireApiAdmin();

	const { id } = await params;
	const problemId = id;

	if (!isUuid(problemId)) {
		return NextResponse.json(
			{ error: "Invalid problem ID." },
			{ status: 400 },
		);
	}

	let body: Record<string, unknown>;
	let files: File[];

	try {
		const formData = await request.formData();
		const payload = formData.get("payload");
		const rawFiles = formData.getAll("files");

		if (typeof payload !== "string") {
			throw new Error("Missing problem data.");
		}

		const parsed: unknown = JSON.parse(payload);

		if (!isRecord(parsed)) {
			throw new Error("Invalid problem data.");
		}

		if (!rawFiles.every(value => value instanceof File)) {
			throw new Error("Invalid uploaded files.");
		}

		body = parsed;
		files = rawFiles as File[];
	} catch {
		return NextResponse.json(
			{ error: "Invalid multipart request." },
			{ status: 400 },
		);
	}

	const versionNumber = body.versionNumber;
	const name = typeof body.name === "string" ? body.name.trim() : "";
	const description =
		typeof body.description === "string" ? body.description : null;
	const difficulty =
		typeof body.difficulty === "string"
			? body.difficulty.trim() || null
			: null;
	const timeLimitMs = body.timeLimitMs;
	const memoryLimitKb = body.memoryLimitKb;
	const outputComparison = body.outputComparison;
	const languageIds = body.languageIds;
	const testCases = body.testCases;
	const existingStuffIds = body.existingStuffIds;

	if (
		typeof versionNumber !== "number" ||
		!Number.isSafeInteger(versionNumber) ||
		versionNumber <= 0
	) {
		return NextResponse.json(
			{ error: "Invalid draft version." },
			{ status: 400 },
		);
	}

	if (!name) {
		return NextResponse.json(
			{ error: "Problem name is required." },
			{ status: 400 },
		);
	}

	if (
		typeof timeLimitMs !== "number" ||
		!Number.isSafeInteger(timeLimitMs) ||
		timeLimitMs < 0 ||
		typeof memoryLimitKb !== "number" ||
		!Number.isSafeInteger(memoryLimitKb) ||
		memoryLimitKb < 0
	) {
		return NextResponse.json(
			{ error: "Time and memory limits must be non-negative integers." },
			{ status: 400 },
		);
	}

	if (
		typeof outputComparison !== "string" ||
		!Object.values(OutputComparison).includes(
			outputComparison as OutputComparison,
		)
	) {
		return NextResponse.json(
			{ error: "Invalid output comparison." },
			{ status: 400 },
		);
	}

	if (
		!Array.isArray(languageIds) ||
		languageIds.length === 0 ||
		!languageIds.every(
			value =>
				typeof value === "number" &&
				Number.isSafeInteger(value) &&
				value > 0,
		)
	) {
		return NextResponse.json(
			{ error: "Select at least one valid language." },
			{ status: 400 },
		);
	}

	if (
		!Array.isArray(testCases) ||
		testCases.length === 0 ||
		!testCases.every(
			value =>
				isRecord(value) &&
				typeof value.input === "string" &&
				typeof value.expectedOutput === "string",
		)
	) {
		return NextResponse.json(
			{ error: "At least one valid test case is required." },
			{ status: 400 },
		);
	}

	if (
		!Array.isArray(existingStuffIds) ||
		!existingStuffIds.every(value => typeof value === "string")
	) {
		return NextResponse.json(
			{ error: "Invalid attachment selection." },
			{ status: 400 },
		);
	}

	if (existingStuffIds.length + files.length > MAX_FILES) {
		return NextResponse.json(
			{ error: `You can attach at most ${MAX_FILES} files.` },
			{ status: 400 },
		);
	}

	let totalSize = 0;
	const filenames: string[] = [];

	for (const file of files) {
		const filename = sanitizeFilename(file.name);
		const extension = extname(filename).toLowerCase();
		if (!isAllowedAttachment(filename, file.type)) {
			return NextResponse.json(
				{ error: `Unsupported file type: ${filename}` },
				{ status: 400 },
			);
		}

		totalSize += file.size;
		filenames.push(filename);
	}

	if (totalSize > MAX_TOTAL_SIZE) {
		return NextResponse.json(
			{ error: "The combined size of new files must not exceed 4 MiB." },
			{ status: 413 },
		);
	}

	const problem = await problemRepo.findById(problemId);

	if (!problem) {
		return NextResponse.json(
			{ error: "Problem not found." },
			{ status: 404 },
		);
	}

	if (problem.draftVersionNumber !== versionNumber) {
		return NextResponse.json(
			{ error: "This is no longer the current draft. Reopen the editor." },
			{ status: 409 },
		);
	}

	const draft = problem.draft?.versionNumber === versionNumber ? problem.draft : null;

	if (!draft || draft.status !== ProblemVersionStatus.DRAFT) {
		return NextResponse.json(
			{ error: "Only the current draft can be edited." },
			{ status: 409 },
		);
	}

	const allowedExistingIds = new Set(draft.stuffs.map(stuff => stuff.id));

	if (
		!existingStuffIds.every(
			id => allowedExistingIds.has(id),
		)
	) {
		return NextResponse.json(
			{ error: "The attachment selection contains an invalid file." },
			{ status: 400 },
		);
	}

	const uploadedPaths: string[] = [];
	const stuffRecords: CreateStuffData[] = [];
	let metadataCreated = false;

	try {
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const filename = filenames[i];
			const fileId = randomUUID();
			const storagePath = `${user.id}/${fileId}/${filename}`;

			const { error } = await supabaseAdmin.storage
				.from(BUCKET)
				.upload(storagePath, file, {
					contentType: file.type,
					upsert: false,
				});

			if (error) {
				console.error("Draft attachment upload error:", error);
				throw new Error("Unable to upload attachments.");
			}

			uploadedPaths.push(storagePath);

			stuffRecords.push({
				id: fileId,
				fileExtension: extname(filename).slice(1).toLowerCase(),
				bucket: BUCKET,
				storagePath,
				uploadedById: user.id,
			});
		}

		await stuffRepo.createMany(stuffRecords);
		metadataCreated = stuffRecords.length > 0;

		const { data: removedFiles, error: saveError } =
			await supabaseAdmin.rpc("save_problem_draft", {
				p_problem_id: problemId,
				p_version_number: versionNumber,
				p_name: name,
				p_description: description,
				p_difficulty: difficulty,
				p_time_limit_ms: timeLimitMs,
				p_memory_limit_kb: memoryLimitKb,
				p_output_comparison: outputComparison,
				p_language_ids: [...new Set(languageIds as number[])],
				p_test_cases: testCases,
				p_stuff_ids: [
					...new Set([
						...(existingStuffIds as string[]),
						...stuffRecords.map(stuff => stuff.id),
					]),
				],
			});

		if (saveError) {
			console.error("Problem draft save RPC failed:", saveError);
			throw new Error("Unable to save the problem draft.");
		}

		// The database transaction succeeded. Remove obsolete physical files.
		for (const removed of removedFiles ?? []) {
			const { error: storageError } = await supabaseAdmin.storage
				.from(removed.bucket)
				.remove([removed.storage_path]);

			if (storageError) {
				// The database no longer references this file. Log an orphan
				// for later cleanup without reporting the successful save as failed.
				console.error("Removed attachment storage cleanup failed:", storageError);
			}
		}

		return NextResponse.json({
			problemId,
			versionNumber,
		});
	} catch (error) {
		console.error("Problem draft update failed:", error);

		if (metadataCreated) {
			try {
				await stuffRepo.deleteByIds(
					stuffRecords.map(stuff => stuff.id),
				);
			} catch (cleanupError) {
				console.error("New attachment metadata rollback failed:", cleanupError);
			}
		}

		if (uploadedPaths.length > 0) {
			const { error: cleanupError } = await supabaseAdmin.storage
				.from(BUCKET)
				.remove(uploadedPaths);

			if (cleanupError) {
				console.error("New attachment storage rollback failed:", cleanupError);
			}
		}

		return NextResponse.json(
			{ error: "Unable to save the problem draft." },
			{ status: 500 },
		);
	}
});
