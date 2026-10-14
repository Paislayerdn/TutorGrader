
import { NextResponse } from "next/server";

import { getCurrentVisitor } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Admin } from "@/domain/user/Admin";
import { isUuid } from "@/lib/isUuid";

export const runtime = "nodejs";

type Props = {
	params: Promise<{
		id: string;
	}>;
};

export async function POST(_request: Request, { params }: Props) {
	const user = await getCurrentVisitor();

	if (!user) {
		return NextResponse.json(
			{ error: "Unauthorized." },
			{ status: 401 },
		);
	}

	if (!(user instanceof Admin)) {
		return NextResponse.json(
			{ error: "You do not have permission to publish problems." },
			{ status: 403 },
		);
	}

	const { id } = await params;
	const problemId = id;

	if (!isUuid(problemId)) {
		return NextResponse.json(
			{ error: "Invalid problem ID." },
			{ status: 400 },
		);
	}

	const { data, error } = await supabaseAdmin.rpc(
		"publish_problem_draft",
		{
			p_problem_id: problemId,
			p_published_by: user.id,
		},
	);

	if (error) {
		console.error("Problem publishing error:", error);

		return NextResponse.json(
			{ error: "Unable to publish the problem. Check that it still has a draft." },
			{ status: 400 },
		);
	}

	const published = data?.[0];

	if (
		!published || published.problem_id !== problemId
	) {
		return NextResponse.json(
			{ error: "The publishing operation returned invalid data." },
			{ status: 500 },
		);
	}

	return NextResponse.json({
		problemId,
		versionNumber: published.version_number,
	});
}

