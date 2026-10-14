import { NextResponse } from "next/server";

import { getCurrentVisitor } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ProblemRepository } from "@/domain/problem/ProblemRepository";
import { Admin } from "@/domain/user/Admin";
import { isUuid } from "@/lib/isUuid";

type Props = {
	params: Promise<{
		id: string;
	}>;
};

const problemRepository = new ProblemRepository();

export async function DELETE(request: Request, { params }: Props) {
	const currentUser = await getCurrentVisitor();

	if (!(currentUser instanceof Admin)) {
		return NextResponse.json(
			{ error: "You do not have permission to delete problems." },
			{ status: 403 },
		);
	}

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
			{
				error:
					error instanceof Error
						? error.message
						: "Unable to delete problem draft.",
			},
			{ status: 500 },
		);
	}
}
