import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireApiAdmin, route } from "@/lib/http";
import { ProblemRepository } from "@/domain/problem/ProblemRepository";
import { StuffRepository, type CreateStuffData } from "@/domain/stuff/StuffRepository";
import { TestCase } from "@/domain/problem/TestCase";
import { OutputComparison } from "@/domain/problem/version/OutputComparison";
import { isAllowedAttachment } from "@/lib/attachment-validation";

export const runtime = "nodejs";

const BUCKET = "problem-files";
const MAX_FILES = 10;
const MAX_TOTAL_SIZE = 4 * 1024 * 1024;

const problemRepository = new ProblemRepository();
const stuffRepository = new StuffRepository();

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

export const POST = route(async (request: Request) => {
	const currentUser = await requireApiAdmin();

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
	const rawTestCases = body.testCases;

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
		!languageIds.every(id => Number.isSafeInteger(id) && id > 0)
	) {
		return NextResponse.json(
			{ error: "Select at least one valid language." },
			{ status: 400 },
		);
	}

	if (
		!Array.isArray(rawTestCases) ||
		rawTestCases.length === 0 ||
		!rawTestCases.every(
			testCase =>
				isRecord(testCase) &&
				typeof testCase.input === "string" &&
				typeof testCase.expectedOutput === "string",
		)
	) {
		return NextResponse.json(
			{ error: "At least one valid test case is required." },
			{ status: 400 },
		);
	}

	if (files.length > MAX_FILES) {
		return NextResponse.json(
			{ error: `You can upload at most ${MAX_FILES} files.` },
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
			{ error: "The combined file size must not exceed 4 MiB." },
			{ status: 413 },
		);
	}

	const uploadedPaths: string[] = [];
	const stuffRecords: CreateStuffData[] = [];
	let metadataCreated = false;

	try {
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const filename = filenames[i];
			const id = randomUUID();
			const storagePath =
				`${currentUser.id}/${id}/${filename}`;

			const { error } = await supabaseAdmin.storage
				.from(BUCKET)
				.upload(storagePath, file, {
					contentType: file.type,
					upsert: false,
				});

			if (error) {
				console.error("Storage upload error:", error);
				throw new Error("Unable to upload attachments.");
			}

			uploadedPaths.push(storagePath);

			stuffRecords.push({
				id,
				fileExtension: extname(filename).slice(1).toLowerCase(),
				bucket: BUCKET,
				storagePath,
				uploadedById: currentUser.id,
			});
		}

		await stuffRepository.createMany(stuffRecords);
		metadataCreated = stuffRecords.length > 0;

		const created = await problemRepository.createDraft({
			createdById: currentUser.id,
			name,
			description,
			difficulty,
			timeLimitMs,
			memoryLimitKb,
			outputComparison: outputComparison as OutputComparison,
			languageIds: [...new Set(languageIds as number[])],
			testCases: rawTestCases.map( testCase =>
				new TestCase(
					testCase.input as string,
					testCase.expectedOutput as string,
				)
			),
			stuffIds: stuffRecords.map(stuff => stuff.id),
		});

		return NextResponse.json(
			{ problem: created },
			{ status: 201 },
		);
	} catch (error) {
		console.error("Problem draft creation error:", error);

		let safeToRemoveFiles = true;

		if (metadataCreated) {
			try {
				await stuffRepository.deleteByIds(
					stuffRecords.map(stuff => stuff.id),
				);
			} catch (cleanupError) {
				// A draft may already reference these rows. Preserve its files.
				safeToRemoveFiles = false;
				console.error("Metadata rollback failed:", cleanupError);
			}
		}

		if (safeToRemoveFiles && uploadedPaths.length > 0) {
			const { error: cleanupError } = await supabaseAdmin.storage
				.from(BUCKET)
				.remove(uploadedPaths);

			if (cleanupError) {
				console.error("Storage rollback failed:", cleanupError);
			}
		}

		return NextResponse.json(
			{ error: "Unable to create problem draft." },
			{ status: 500 },
		);
	}
});
