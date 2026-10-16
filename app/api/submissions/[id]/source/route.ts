import { NextResponse } from "next/server";

import { requireApiUser, route } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { StuffRepository } from "@/domain/stuff/StuffRepository";

export const runtime = "nodejs";

const stuffRepository = new StuffRepository();

type Props = {
	params: Promise<{ id: string }>;
};

export const GET = route<Props>(async (_request, { params }) => {
	const user = await requireApiUser();
	const { id } = await params;

	const { data: submission, error } = await supabaseAdmin
		.from("submission")
		.select("user_id, source_stuff_id")
		.eq("id", id)
		.maybeSingle();

	if (error) {
		throw new Error("Unable to look up the submission.");
	}

	if (!submission) {
		return NextResponse.json(
			{ error: "Submission not found." },
			{ status: 404 },
		);
	}

	if (submission.user_id !== user.id && !user.canManageProblems) {
		return NextResponse.json(
			{ error: "You do not have permission to download this source." },
			{ status: 403 },
		);
	}

	const stuff = await stuffRepository.findById(
		submission.source_stuff_id,
	);

	if (!stuff) {
		return NextResponse.json(
			{ error: "Source file not found." },
			{ status: 404 },
		);
	}

	const { data: file, error: downloadError } = await supabaseAdmin.storage
		.from(stuff.bucket)
		.download(stuff.storagePath);

	if (downloadError || !file) {
		console.error("Submission source download failed:", downloadError);

		return NextResponse.json(
			{ error: "Unable to download the source file." },
			{ status: 500 },
		);
	}

	const filename =
		stuff.originalFilename ||
		stuff.storagePath.replace(/\\/g, "/").split("/").pop() ||
		"source";

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
