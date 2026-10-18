import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { NextResponse } from "next/server";

import { requireApiAdmin, route } from "@/lib/http";
import { AttachmentStorage } from "@/data/storage/AttachmentStorage";
import { ProblemRepo } from "@/data/supabase/repositories/ProblemRepo";
import { StuffRepo, type CreateStuffData, } from "@/data/supabase/repositories/StuffRepo";
import { ProblemVersionStatus } from "@/domain/problem/version/ProblemVersionStatus";
import { BUCKET } from "@/domain/stuff/AttachmentRules";
import { ProblemDraftInput, ProblemDraftInputError } from "@/domain/problem/ProblemDraftInput";
import { isUuid } from "@/lib/isUuid";

export const runtime = "nodejs";

const problemRepo = new ProblemRepo();
const stuffRepo = new StuffRepo();
const attachmentStorage = new AttachmentStorage();

type Props = {
	params: Promise<{ id: string }>;
};


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

	let input: ProblemDraftInput;
	try {
		const formData = await request.formData();
		input = await ProblemDraftInput.fromFormData(formData, { mode: "update" });
	} catch (error) {
		if (error instanceof ProblemDraftInputError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		return NextResponse.json({ error: "Invalid multipart request." }, { status: 400 });
	}

	const versionNumber = input.versionNumber as number;
	const { name, description, difficulty, timeLimitMs, memoryLimitKb,
		outputComparison, languageIds, testCases, existingStuffIds, files, filenames } = input;

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

			await attachmentStorage.upload(
				BUCKET,
				storagePath,
				file,
				file.type,
				"Unable to upload attachments.",
			);

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

		const removedFiles = await problemRepo.saveDraft({
			problemId, versionNumber, name, description, difficulty, timeLimitMs, memoryLimitKb,
			outputComparison, languageIds: [...new Set(languageIds)], testCases,
			stuffIds: [...new Set([...existingStuffIds, ...stuffRecords.map(stuff => stuff.id)])],
		});

		// The database transaction succeeded. Remove obsolete physical files.
		for (const removed of removedFiles ?? []) {
			try {
				await attachmentStorage.remove(removed.bucket, [removed.storage_path]);
			} catch (storageError) {
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
			try {
				await attachmentStorage.remove(BUCKET, uploadedPaths);
			} catch (cleanupError) {
				console.error("New attachment storage rollback failed:", cleanupError);
			}
		}

		return NextResponse.json(
			{ error: "Unable to save the problem draft." },
			{ status: 500 },
		);
	}
});
