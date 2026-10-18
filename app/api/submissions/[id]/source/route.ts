import { NextResponse } from "next/server";

import { fileResponse, HttpError, requireApiUser, route } from "@/lib/http";
import { isUuid } from "@/lib/isUuid";
import { SubmissionRepo } from "@/data/supabase/repositories/SubmissionRepo";
import { StuffRepo } from "@/data/supabase/repositories/StuffRepo";
import { AttachmentStorage } from "@/data/storage/AttachmentStorage";

export const runtime = "nodejs";

const stuffRepo = new StuffRepo();
const submissionRepo = new SubmissionRepo();
const attachmentStorage = new AttachmentStorage();

type Props = {
	params: Promise<{ id: string }>;
};

export const GET = route<Props>(async (_request, { params }) => {
	const user = await requireApiUser();
	const { id } = await params;
	if (!isUuid(id)) throw new HttpError(400, "Invalid submission id.");

	const submission = await submissionRepo.findSourceAccess(id);

	if (!submission) {
		return NextResponse.json(
			{ error: "Submission not found." },
			{ status: 404 },
		);
	}

	if (!user.canReadSourceOf(submission.user_id)) {
		return NextResponse.json(
			{ error: "You do not have permission to download this source." },
			{ status: 403 },
		);
	}

	const stuff = await stuffRepo.findById(
		submission.source_stuff_id,
	);

	if (!stuff) {
		return NextResponse.json(
			{ error: "Source file not found." },
			{ status: 404 },
		);
	}

	const file = await attachmentStorage.download(stuff.bucket, stuff.storagePath);

	if (!file) {
		return NextResponse.json(
			{ error: "Unable to download the source file." },
			{ status: 500 },
		);
	}

	const filename = stuff.displayName || "source";

	return fileResponse(file, filename);
});
