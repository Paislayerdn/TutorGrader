import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { ProblemRepo } from "@/data/supabase/repositories/ProblemRepo";
import { ProblemStatus } from "@/domain/problem/ProblemStatus";
import { SubmissionRepo } from "@/data/supabase/repositories/SubmissionRepo";
import { StuffRepo } from "@/data/supabase/repositories/StuffRepo";
import { supabaseAdmin } from "@/data/supabase/supabase-admin";
import { HttpError, requireApiUser, route } from "@/lib/http";
import { isUuid } from "@/lib/isUuid";

const BUCKET = "problem-files";
const MAX_SOURCE_SIZE = 1024 * 1024;

const problemRepo = new ProblemRepo();
const submissionRepo = new SubmissionRepo();
const stuffRepo = new StuffRepo();

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

	if (!version || version.status !== "PUBLISHED") {
		throw new HttpError(400, "Problem version is not available.");
	}

	const fileName = file.name.trim();
	const dotIndex = fileName.lastIndexOf(".");

	if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
		throw new HttpError(400, "Source file must have a valid extension.");
	}

	const extension = fileName.slice(dotIndex + 1).toLowerCase();

	const matchingLanguages = version.languages.filter(
		currentLanguage => currentLanguage.extensions.includes(extension),
	);

	if (matchingLanguages.length === 0) {
		throw new HttpError(400, "Source file extension is not supported.");
	}

	if (matchingLanguages.length > 1) {
		throw new HttpError(400, "Source file extension is ambiguous.");
	}

	const language = matchingLanguages[0];

	const sourceStuffId = randomUUID();
	const storagePath = `submissions/${user.id}/${sourceStuffId}.${extension}`;

	const source = await file.arrayBuffer();

	const { error: uploadError } = await supabaseAdmin.storage
		.from(BUCKET)
		.upload(storagePath, source, {
			contentType: file.type || "application/octet-stream",
			upsert: false,
		});

	if (uploadError) {
		console.error("Submission source upload error:", uploadError);
		throw new Error("Unable to upload source file.");
	}

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

		return NextResponse.json(
			{
				submissionId: submission.id,
				status: submission.status,
			},
			{ status: 201 },
		);
	} catch (error) {
		await stuffRepo.deleteByIds([sourceStuffId]);

		await supabaseAdmin.storage
			.from(BUCKET)
			.remove([storagePath]);

		throw error;
	}
});
