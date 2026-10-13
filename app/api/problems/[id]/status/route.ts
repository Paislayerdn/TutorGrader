import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { ProblemRepository } from "@/domain/problem/ProblemRepository";
import { ProblemStatus } from "@/domain/problem/ProblemStatus";
import { Admin } from "@/domain/user/Admin";

type Props = {
	params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Props) {
	const user = await getCurrentUser();

	if (!(user instanceof Admin)) {
		return NextResponse.json(
			{ error: "Only admins can change problem status." },
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

	const problemRepository = new ProblemRepository();
	const problem = await problemRepository.findById(problemId);

	if (!problem) {
		return NextResponse.json(
			{ error: "Problem not found." },
			{ status: 404 },
		);
	}

	if (problem.currentVersionNumber === null) {
		return NextResponse.json(
			{ error: "Draft problems cannot change status." },
			{ status: 400 },
		);
	}

	const body: unknown = await request.json();

	if (
		typeof body !== "object" ||
		body === null ||
		!("status" in body) ||
		typeof body.status !== "string" ||
		!Object.values(ProblemStatus).includes(
			body.status as ProblemStatus,
		)
	) {
		return NextResponse.json(
			{ error: "Invalid problem status." },
			{ status: 400 },
		);
	}

	const status = body.status as ProblemStatus;

	try {
		await problemRepository.updateStatus(problemId, status);

		return NextResponse.json({
			problemId,
			status,
		});
	} catch (error) {
		console.error("Problem status API error:", error);

		return NextResponse.json(
			{ error: "Unable to update problem status." },
			{ status: 500 },
		);
	}
}
