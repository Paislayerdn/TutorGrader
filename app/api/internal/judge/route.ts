import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { JudgeService } from "@/services/JudgeService";
import { JudgeRepo } from "@/data/supabase/repositories/JudgeRepo";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ATTEMPTS = 5;
const judgeRepo = new JudgeRepo();

type JudgeJob = {
	id: number;
	submission_id: string;
	attempts: number;
};

function authorized(request: NextRequest): boolean {
	const secret = process.env.JUDGE_WORKER_SECRET;

	if (!secret) return false;

	const authorization = request.headers.get("authorization");

	if (!authorization?.startsWith("Bearer ")) return false;

	const supplied = Buffer.from(authorization.slice(7));
	const expected = Buffer.from(secret);

	return (
		supplied.length === expected.length &&
		timingSafeEqual(supplied, expected)
	);
}

export async function POST(request: NextRequest) {
	if (!authorized(request)) {
		return NextResponse.json(
			{ error: "Unauthorized." },
			{ status: 401 },
		);
	}

	const workerId = randomUUID();

	let jobs: JudgeJob[];
	try {
		jobs = await judgeRepo.claimJob(workerId);
	} catch (error) {
		console.error("Unable to claim judge job:", error);
		return NextResponse.json({ error: "Unable to claim a judging job." }, { status: 500 });
	}

	if (jobs.length === 0) {
		return NextResponse.json({
			processed: false,
			message: "No jobs are ready.",
		});
	}

	const job = jobs[0];

	try {
		const judge = new JudgeService();

		await judge.judge(job.submission_id);

		const finishError = await judgeRepo.completeJob(job.id, workerId);

		if (finishError) {
			console.error("Unable to complete judge job:", finishError);

			return NextResponse.json(
				{ error: "Judging finished, but queue completion failed." },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			processed: true,
			submissionId: job.submission_id,
			outcome: "PROCESSED",
		});
	} catch (error) {
		console.error("Judge job failed:", error);

		const message =
			error instanceof Error
				? error.message.slice(0, 2000)
				: "Unknown worker error.";

		const exhausted = job.attempts >= MAX_ATTEMPTS;
		const retryDelayMs = Math.min(
			30_000 * 2 ** (job.attempts - 1),
			15 * 60_000,
		);

		const updateError = await judgeRepo.recordJobFailure(job.id, workerId, exhausted, retryDelayMs, message);

		if (updateError) {
			console.error("Unable to record job failure:", updateError);
		}

		return NextResponse.json(
			{
				processed: true,
				submissionId: job.submission_id,
				outcome: exhausted ? "FAILED" : "RETRY_QUEUED",
			},
			{ status: 500 },
		);
	}
}
