import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { NextResponse } from "next/server";

import { AttachmentStorage } from "@/data/storage/AttachmentStorage";
import { ProblemRepo } from "@/data/supabase/repositories/ProblemRepo";
import { StuffRepo, type CreateStuffData } from "@/data/supabase/repositories/StuffRepo";
import { ProblemDraftInput, ProblemDraftInputError } from "@/domain/problem/ProblemDraftInput";
import { BUCKET } from "@/domain/stuff/AttachmentRules";
import { requireApiAdmin, route } from "@/lib/http";

export const runtime = "nodejs";

const problemRepo = new ProblemRepo();
const stuffRepo = new StuffRepo();
const attachmentStorage = new AttachmentStorage();

export const POST = route(async (request: Request) => {
	const currentUser = await requireApiAdmin();

	let input: ProblemDraftInput;
	try {
		const formData = await request.formData();
		input = await ProblemDraftInput.fromFormData(formData, { mode: "create" });
	} catch (error) {
		if (error instanceof ProblemDraftInputError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		return NextResponse.json({ error: "Invalid multipart request." }, { status: 400 });
	}

	const uploadedPaths: string[] = [];
	const stuffRecords: CreateStuffData[] = [];
	let metadataCreated = false;

	try {
		for (let i = 0; i < input.files.length; i++) {
			const file = input.files[i];
			const filename = input.filenames[i];
			const id = randomUUID();
			const storagePath = `${currentUser.id}/${id}/${filename}`;

			await attachmentStorage.upload(
				BUCKET,
				storagePath,
				file,
				file.type,
				"Unable to upload attachments.",
			);
			uploadedPaths.push(storagePath);
			stuffRecords.push({
				id,
				fileExtension: extname(filename).slice(1).toLowerCase(),
				bucket: BUCKET,
				storagePath,
				uploadedById: currentUser.id,
			});
		}

		await stuffRepo.createMany(stuffRecords);
		metadataCreated = stuffRecords.length > 0;
		const created = await problemRepo.createDraft({
			createdById: currentUser.id,
			name: input.name,
			description: input.description,
			difficulty: input.difficulty,
			timeLimitMs: input.timeLimitMs,
			memoryLimitKb: input.memoryLimitKb,
			outputComparison: input.outputComparison,
			languageIds: input.languageIds,
			testCases: input.testCases.map(testCase => ({
				input: testCase.input,
				expectedOutput: testCase.expectedOutput,
			})),
			stuffIds: stuffRecords.map(stuff => stuff.id),
		});

		return NextResponse.json({ problem: created }, { status: 201 });
	} catch (error) {
		console.error("Problem draft creation error:", error);
		let safeToRemoveFiles = true;
		if (metadataCreated) {
			try {
				await stuffRepo.deleteByIds(stuffRecords.map(stuff => stuff.id));
			} catch (cleanupError) {
				// Keep storage when metadata rollback fails; the draft may reference it.
				safeToRemoveFiles = false;
				console.error("Metadata rollback failed:", cleanupError);
			}
		}
		if (safeToRemoveFiles && uploadedPaths.length > 0) {
			try {
				await attachmentStorage.remove(BUCKET, uploadedPaths);
			} catch (cleanupError) {
				console.error("Storage rollback failed:", cleanupError);
			}
		}
		return NextResponse.json({ error: "Unable to create problem draft." }, { status: 500 });
	}
});
