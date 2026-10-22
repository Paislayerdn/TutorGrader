import { randomUUID } from "crypto";
import { after, NextResponse } from "next/server";

import { ProblemRepo } from "@/data/supabase/repositories/ProblemRepo";
import { ProblemStatus } from "@/domain/problem/ProblemStatus";
import { ProblemVersionStatus } from "@/domain/problem/version/ProblemVersionStatus";
import { SubmissionInProgressError, SubmissionRepo } from "@/data/supabase/repositories/SubmissionRepo";
import { SubmissionHistoryRepo } from "@/data/supabase/repositories/SubmissionHistoryRepo";
import { StuffRepo } from "@/data/supabase/repositories/StuffRepo";
import { AttachmentStorage } from "@/data/storage/AttachmentStorage";
import { HttpError, requireApiUser, route } from "@/lib/http";
import { isUuid } from "@/lib/isUuid";
import { BUCKET } from "@/domain/stuff/AttachmentRules";

const MAX_SOURCE_SIZE = 1024 * 1024;

const problemRepo = new ProblemRepo();
const submissionRepo = new SubmissionRepo();
const stuffRepo = new StuffRepo();
const attachmentStorage = new AttachmentStorage();
const submissionHistoryRepo = new SubmissionHistoryRepo();

export const GET = route(async request => {
	const user = await requireApiUser();
	const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
	const groups = await submissionHistoryRepo.findHistory(user.id);

	return NextResponse.json(
		query ? groups.filter(group => group.problemName.toLowerCase().includes(query)) : groups,
	);
});

export const POST = route(async req => {
	const user = await requireApiUser();

	const formData = await req.formData();

	const problemId = formData.get("problemId");
	const file = formData.get("file");

	if (
		typeof problemId !== "string"
		|| !(file instanceof File)
	) {
		throw new HttpError(400, "Invalid submission data.");
	}
	if (!isUuid(problemId)) throw new HttpError(400, "Invalid submission data.");

	if (file.size === 0) {
		throw new HttpError(400, "Source file is empty.");
	}

	if (file.size > MAX_SOURCE_SIZE) {
		throw new HttpError(400, "Source file is too large.");
	}

	const problem = await problemRepo.findById(problemId);

	if (!problem || problem.status !== ProblemStatus.ACTIVE) {
		throw new HttpError(400, "Problem is not available for submission.");
	}

	const version = problem.currentVersion;

	if (!user.canSubmitTo(problem) || !version || version.status !== ProblemVersionStatus.PUBLISHED) {
		throw new HttpError(400, "Problem version is not available.");
	}

	const fileName = file.name.trim();
	const dotIndex = fileName.lastIndexOf(".");

	if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
		throw new HttpError(400, "Source file must have a valid extension.");
	}

	const extension = fileName.slice(dotIndex + 1).toLowerCase();

	const languageMatch = version.languageForExtension(extension);

	if (languageMatch.kind === "none") {
		throw new HttpError(400, "Source file extension is not supported.");
	}

	if (languageMatch.kind === "ambiguous") {
		throw new HttpError(400, "Source file extension is ambiguous.");
	}

	const language = languageMatch.language;
	if (await submissionRepo.hasInProgress(user.id, problem.id)) {
		throw new HttpError(409, "You already have a submission queued or being evaluated for this problem.");
	}

	const sourceStuffId = randomUUID();
	const storagePath = `submissions/${user.id}/${sourceStuffId}.${extension}`;

	const source = await file.arrayBuffer();

	await attachmentStorage.upload(
		BUCKET,
		storagePath,
		source,
		file.type || "application/octet-stream",
		"Unable to upload source file.",
	);

	try {
		await stuffRepo.createMany([
			{
				id: sourceStuffId,
				fileExtension: extension,
				bucket: BUCKET,
				storagePath,
				uploadedById: user.id,
				originalFilename: fileName,
			},
		]);

		const submission = await submissionRepo.create({
			userId: user.id,
			problemId: problem.id,
			versionNumber: version.versionNumber,
			languageId: language.id,
			sourceStuffId,
		});

		const workerSecret = process.env.JUDGE_WORKER_SECRET;
		if (workerSecret) {
			after(async () => {
				try {
					await fetch(new URL("/api/internal/judge", req.url), {
						method: "POST",
						headers: { authorization: `Bearer ${workerSecret}` },
						cache: "no-store",
					});
				} catch (error) {
					console.error("Unable to kick judge worker after submission:", error);
				}
			});
		}

		return NextResponse.json(
			{
				submissionId: submission.id,
				status: submission.status,
			},
			{ status: 201 },
		);
	} catch (error) {
		try {
			await stuffRepo.deleteByIds([sourceStuffId]);
		} catch (cleanupError) {
			console.error("Submission metadata rollback failed:", cleanupError);
		}

		try {
			await attachmentStorage.remove(BUCKET, [storagePath]);
		} catch (cleanupError) {
			console.error("Submission source rollback failed:", cleanupError);
		}
		if (error instanceof SubmissionInProgressError) {
			throw new HttpError(409, error.message);
		}

		throw error;
	}
});
