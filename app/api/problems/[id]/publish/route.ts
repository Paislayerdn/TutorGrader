import { NextResponse } from "next/server";

import { requireApiAdmin, route } from "@/lib/http";
import { isUuid } from "@/lib/isUuid";
import { ProblemRepo } from "@/data/supabase/repositories/ProblemRepo";

export const runtime = "nodejs";
const problemRepo = new ProblemRepo();

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

	let published;
	try {
		published = await problemRepo.publishDraft(problemId, user.id);
	} catch {
		return NextResponse.json(
			{ error: "Unable to publish the problem. Check that it still has a draft." },
			{ status: 400 },
		);
	}
	if (!published) {
		return NextResponse.json(
			{ error: "The publishing operation returned invalid data." },
			{ status: 500 },
		);
	}

	return NextResponse.json({
		problemId,
		versionNumber: published.versionNumber,
	});
});
