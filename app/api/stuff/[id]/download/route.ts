import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { StuffRepository } from "@/domain/stuff/StuffRepository";
import { ProblemStatus } from "@/domain/problem/ProblemStatus";
import { Admin } from "@/domain/user/Admin";

export const runtime = "nodejs";

const stuffRepository = new StuffRepository();

type Props = {
	params: Promise<{
		id: string;
	}>;
};

type ProblemVersionLink = {
	problem_id: number;
	version_number: number;
};

export async function GET(_request: Request, { params }: Props) {
	const user = await getCurrentUser();

	if (!user) {
		return NextResponse.json(
			{ error: "Unauthorized." },
			{ status: 401 },
		);
	}

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

	const isAdmin = user instanceof Admin;
	let hasAccess = false;

	for (const link of links as ProblemVersionLink[]) {
		const { data: problem, error: problemError } = await supabaseAdmin
			.from("problem")
			.select("status")
			.eq("id", link.problem_id)
			.maybeSingle();

		if (problemError) {
			console.error("Problem access lookup error:", problemError);

			return NextResponse.json(
				{ error: "Unable to verify attachment access." },
				{ status: 500 },
			);
		}

		if (!problem) continue;

		if (isAdmin) {
			hasAccess = true;
			break;
		}

		if (problem.status !== ProblemStatus.ACTIVE) continue;

		const { data: version, error: versionError } = await supabaseAdmin
			.from("problem_version")
			.select("status")
			.eq("problem_id", link.problem_id)
			.eq("version_number", link.version_number)
			.maybeSingle();

		if (versionError) {
			console.error("Problem version access lookup error:", versionError);

			return NextResponse.json(
				{ error: "Unable to verify attachment access." },
				{ status: 500 },
			);
		}

		if (version?.status === "PUBLISHED") {
			hasAccess = true;
			break;
		}
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
}
