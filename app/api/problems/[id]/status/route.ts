import { NextResponse } from "next/server";

import { requireApiAdmin, route } from "@/lib/http";
import { ProblemRepository } from "@/domain/problem/ProblemRepository";
import { ProblemStatus } from "@/domain/problem/ProblemStatus";
import { isUuid } from "@/lib/isUuid";

type Props = {
	params: Promise<{ id: string }>;
};

export const PATCH = route<Props>(async (request: Request, { params }) => {
	await requireApiAdmin();

	const { id } = await params;

	if (!isUuid(id)) {
		return NextResponse.json(
			{ error: "Invalid problem ID." },
			{ status: 400 },
		);
	}

	const problemRepository = new ProblemRepository();
	const problem = await problemRepository.findById(id);

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

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ error: "Invalid request body." },
			{ status: 400 },
		);
	}

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
		await problemRepository.updateStatus(id, status);

		return NextResponse.json({
			problemId: id,
			status,
		});
	} catch (error) {
		console.error("Problem status API error:", error);

		return NextResponse.json(
			{ error: "Unable to update problem status." },
			{ status: 500 },
		);
	}
});
