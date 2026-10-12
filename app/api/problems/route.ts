import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { Admin } from "@/domain/user/Admin";
import { ProblemRepository } from "@/domain/problem/ProblemRepository";
import { TestCase } from "@/domain/problem/TestCase";
import { OutputComparison } from "@/domain/problem/version/OutputComparison";

export const runtime = "nodejs";

const problemRepository = new ProblemRepository();

export async function POST(request: Request) {
	const currentUser = await getCurrentUser();

	if (!currentUser) {
		return NextResponse.json(
			{ error: "Unauthorized." },
			{ status: 401 },
		);
	}

	if (!(currentUser instanceof Admin)) {
		return NextResponse.json(
			{ error: "You do not have permission to create problems." },
			{ status: 403 },
		);
	}

	let body: Record<string, unknown>;

	try {
		const parsed: unknown = await request.json();

		if (
			typeof parsed !== "object" ||
			parsed === null ||
			Array.isArray(parsed)
		) {
			throw new Error("Invalid request body.");
		}

		body = parsed as Record<string, unknown>;
	} catch {
		return NextResponse.json(
			{ error: "Invalid request body." },
			{ status: 400 },
		);
	}

	const name =
		typeof body.name === "string" ? body.name.trim() : "";

	const description =
		typeof body.description === "string"
			? body.description
			: null;

	const difficulty =
		typeof body.difficulty === "string"
			? body.difficulty.trim() || null
			: null;

	const timeLimitMs = body.timeLimitMs;
	const memoryLimitKb = body.memoryLimitKb;
	const outputComparison = body.outputComparison;
	const languageIds = body.languageIds;
	const requirements = body.requirements;
	const rawTestCases = body.testCases;

	if (!name) {
		return NextResponse.json(
			{ error: "Problem name is required." },
			{ status: 400 },
		);
	}

	if (
		typeof timeLimitMs !== "number" ||
		!Number.isSafeInteger(timeLimitMs) ||
		timeLimitMs < 0 ||
		typeof memoryLimitKb !== "number" ||
		!Number.isSafeInteger(memoryLimitKb) ||
		memoryLimitKb < 0
	) {
		return NextResponse.json(
			{ error: "Time and memory limits must be non-negative integers." },
			{ status: 400 },
		);
	}

	if (
		!Object.values(OutputComparison).includes(
			outputComparison as OutputComparison,
		)
	) {
		return NextResponse.json(
			{ error: "Invalid output comparison." },
			{ status: 400 },
		);
	}

	if (
		!Array.isArray(languageIds) ||
		languageIds.length === 0 ||
		!languageIds.every(
			id => Number.isSafeInteger(id) && id > 0,
		)
	) {
		return NextResponse.json(
			{ error: "Select at least one valid language." },
			{ status: 400 },
		);
	}

	if (
		!Array.isArray(requirements) ||
		!requirements.every(value => typeof value === "string")
	) {
		return NextResponse.json(
			{ error: "Invalid requirements." },
			{ status: 400 },
		);
	}

	if (
		!Array.isArray(rawTestCases) ||
		rawTestCases.length === 0 ||
		!rawTestCases.every(
			testCase =>
				typeof testCase === "object" &&
				testCase !== null &&
				typeof testCase.input === "string" &&
				typeof testCase.expectedOutput === "string",
		)
	) {
		return NextResponse.json(
			{ error: "At least one valid test case is required." },
			{ status: 400 },
		);
	}

	try {
		const created = await problemRepository.createDraft({
			createdById: currentUser.id,
			name,
			description,
			difficulty,
			timeLimitMs,
			memoryLimitKb,
			outputComparison: outputComparison as OutputComparison,
			languageIds: [...new Set(languageIds as number[])],
			requirements: requirements as string[],
			testCases: rawTestCases.map((testCase, index) =>
				new TestCase({
					order: index + 1,
					input: testCase.input,
					expectedOutput: testCase.expectedOutput,
				}),
			),
		});

		return NextResponse.json(
			{ problem: created },
			{ status: 201 },
		);
	} catch (error) {
		console.error("Problem draft creation error:", error);

		return NextResponse.json(
			{ error: "Unable to create problem draft." },
			{ status: 500 },
		);
	}
}
