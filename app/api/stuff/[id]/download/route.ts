import { NextResponse } from "next/server";

import { requireApiUser, route } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { StuffRepository } from "@/domain/stuff/StuffRepository";
import { ProblemRepository } from "@/domain/problem/ProblemRepository";

export const runtime = "nodejs";

const stuffRepository = new StuffRepository();
const problemRepository = new ProblemRepository();

type Props = {
	params: Promise<{
		id: string;
	}>;
};

type ProblemVersionLink = {
	problem_id: string;
	version_number: number;
};

export const GET = route<Props>(async (_request, { params }) => {
	const user = await requireApiUser();

	const { id } = await params;

	const stuff = await stuffRepository.findById(id);

	if (!stuff) {
		return NextResponse.json(
			{ error: "Attachment not found." },
			{ status: 404 },
		);
	}

	const { data: links, error: linksError } = await supabaseAdmin
		.from("problem_version_stuff")
		.select("problem_id, version_number")
		.eq("stuff_id", stuff.id);

	if (linksError) {
		console.error("Attachment association lookup error:", linksError);

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

	for (const link of links as ProblemVersionLink[]) {
		const problem = await problemRepository.findById(link.problem_id);

		if (!problem) continue;

		const isPublishedVersion =
			problem.currentVersionNumber === link.version_number &&
			user.canDownloadProblem(problem);

		const isCurrentDraft =
			user.canManageProblems &&
			problem.draftVersionNumber === link.version_number;

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

	const { data: file, error: downloadError } = await supabaseAdmin.storage
		.from(stuff.bucket)
		.download(stuff.storagePath);

	if (downloadError || !file) {
		console.error("Attachment download error:", downloadError);

		return NextResponse.json(
			{ error: "Unable to download attachment." },
			{ status: 500 },
		);
	}

	const filename =
		stuff.storagePath.replace(/\\/g, "/").split("/").pop() || "attachment";

	return new Response(await file.arrayBuffer(), {
		headers: {
			"Content-Type": "application/octet-stream",
			"Content-Disposition":
				`attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
			"Content-Length": String(file.size),
			"Cache-Control": "private, no-store",
			"X-Content-Type-Options": "nosniff",
		},
	});
});
