import { NextResponse } from "next/server";

import { fileResponse, HttpError, requireApiUser, route } from "@/lib/http";
import { isUuid } from "@/lib/isUuid";
import { StuffRepo } from "@/data/supabase/repositories/StuffRepo";
import { AttachmentStorage } from "@/data/storage/AttachmentStorage";

export const runtime = "nodejs";

const stuffRepo = new StuffRepo();
const attachmentStorage = new AttachmentStorage();

type Props = {
	params: Promise<{
		id: string;
	}>;
};

export const GET = route<Props>(async (_request, { params }) => {
	const user = await requireApiUser();

	const { id } = await params;
	if (!isUuid(id)) throw new HttpError(400, "Invalid attachment id.");

	const stuff = await stuffRepo.findById(id);

	if (!stuff) {
		return NextResponse.json(
			{ error: "Attachment not found." },
			{ status: 404 },
		);
	}

	let links;
	try {
		links = await stuffRepo.findProblemAccess(stuff.id);
	} catch {
		return NextResponse.json(
			{ error: "Unable to verify attachment access." },
			{ status: 500 },
		);
	}

	if (!links || links.length === 0) {
		return NextResponse.json(
			{ error: "Attachment not found." },
			{ status: 404 },
		);
	}

	let hasAccess = false;

	for (const link of links) {
		const isPublishedVersion =
			link.problem.current_version_number === link.version_number &&
			(link.problem.status === "ACTIVE" || user.canManageProblems);

		const isCurrentDraft =
			user.canManageProblems &&
			link.problem.current_draft_number === link.version_number;

		if (!isPublishedVersion && !isCurrentDraft) continue;

		hasAccess = true;
		break;
	}

	if (!hasAccess) {
		return NextResponse.json(
			{ error: "You do not have permission to download this attachment." },
			{ status: 403 },
		);
	}

	const file = await attachmentStorage.download(stuff.bucket, stuff.storagePath);

	if (!file) {
		return NextResponse.json(
			{ error: "Unable to download attachment." },
			{ status: 500 },
		);
	}

	const filename = stuff.displayName;

	return fileResponse(file, filename);
});
