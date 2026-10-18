import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/data/supabase/supabase-admin";
import { requireApiAdmin, route } from "@/lib/http";
import { isUuid } from "@/lib/isUuid";

export const runtime = "nodejs";

type Props = {
	params: Promise<{
		id: string;
	}>;
};

export const POST = route<Props>(async (_request: Request, { params }) => {
	const user = await requireApiAdmin();

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
});
