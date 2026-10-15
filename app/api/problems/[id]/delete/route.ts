import { NextResponse } from "next/server";

import { requireApiAdmin, route } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ProblemRepository } from "@/domain/problem/ProblemRepository";
import { isUuid } from "@/lib/isUuid";

type Props = {
	params: Promise<{
		id: string;
	}>;
};

const problemRepository = new ProblemRepository();

export const DELETE = route<Props>(async (_request: Request, { params }) => {
	await requireApiAdmin();

	const { id } = await params;

	if (!isUuid(id)) {
		return NextResponse.json(
			{ error: "Invalid problem ID." },
			{ status: 400 },
		);
	}

	const problem = await problemRepository.findById(id);

	if (!problem) {
		return NextResponse.json(
			{ error: "Problem not found." },
			{ status: 404 },
		);
	}

	if (problem.draftVersionNumber === null) {
		return NextResponse.json(
			{ error: "This problem has no draft to delete." },
			{ status: 400 },
		);
	}

	try {
		const deletedStuff = await problemRepository.deleteDraft(id);

		const pathsByBucket = new Map<string, string[]>();

		for (const stuff of deletedStuff) {
			const paths = pathsByBucket.get(stuff.bucket) ?? [];
			paths.push(stuff.storage_path);
			pathsByBucket.set(stuff.bucket, paths);
		}

		for (const [bucket, paths] of pathsByBucket) {
			const { error } = await supabaseAdmin.storage
				.from(bucket)
				.remove(paths);

			if (error) {
				console.error(
					"Problem attachment cleanup failed:",
					error,
				);
			}
		}

		return NextResponse.json({
			problemId: id,
		});
	} catch (error) {
		console.error("Problem draft deletion error:", error);

		return NextResponse.json(
			{ error: "Unable to delete problem draft." },
			{ status: 500 },
		);
	}
});
