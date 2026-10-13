import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ProblemRepository } from "@/domain/problem/ProblemRepository";
import { Admin } from "@/domain/user/Admin";

type Props = {
	params: Promise<{
		id: string;
	}>;
};

const problemRepository = new ProblemRepository();

export async function DELETE(request: Request, { params }: Props) {
	const currentUser = await getCurrentUser();

	if (!currentUser) {
		return NextResponse.json(
			{ error: "Unauthorized." },
			{ status: 401 },
		);
	}

	if (!(currentUser instanceof Admin)) {
		return NextResponse.json(
			{ error: "You do not have permission to delete problems." },
			{ status: 403 },
		);
	}

	const { id } = await params;
	const problemId = Number(id);

	if (!Number.isSafeInteger(problemId) || problemId <= 0) {
		return NextResponse.json(
			{ error: "Invalid problem ID." },
			{ status: 400 },
		);
	}

	const problem = await problemRepository.findById(problemId);

	if (!problem) {
		return NextResponse.json(
			{ error: "Problem not found." },
			{ status: 404 },
		);
	}

	if (problem.currentVersionNumber !== null) {
		return NextResponse.json(
			{ error: "Only unpublished drafts can be deleted." },
			{ status: 400 },
		);
	}

	try {
		const deletedStuff = await problemRepository.deleteDraft(problemId);

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
			problemId,
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
