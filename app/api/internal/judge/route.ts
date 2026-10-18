import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { JudgeService } from "@/services/JudgeService";
import { supabaseAdmin } from "@/data/supabase/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ATTEMPTS = 5;

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

	const { data, error } = await supabaseAdmin.rpc(
		"claim_submission_judge_jobs",
		{
			p_worker_id: workerId,
			p_batch_size: 1,
		},
	);

	if (error) {
		console.error("Unable to claim judge job:", error);

		return NextResponse.json(
			{ error: "Unable to claim a judging job." },
			{ status: 500 },
		);
	}

	const jobs = (data ?? []) as JudgeJob[];

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

		const { error: finishError } = await supabaseAdmin
			.from("submission_judge_queue")
			.update({
				status: "COMPLETED",
				locked_until: null,
				locked_by: null,
				last_error: null,
				finished_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.eq("id", job.id)
			.eq("locked_by", workerId)
			.eq("status", "RUNNING");

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

		const now = Date.now();

		const { error: updateError } = await supabaseAdmin
			.from("submission_judge_queue")
			.update({
				status: exhausted ? "FAILED" : "QUEUED",
				available_at: new Date(now + retryDelayMs).toISOString(),
				locked_until: null,
				locked_by: null,
				last_error: message,
				finished_at: exhausted
					? new Date(now).toISOString()
					: null,
				updated_at: new Date(now).toISOString(),
			})
			.eq("id", job.id)
			.eq("locked_by", workerId)
			.eq("status", "RUNNING");

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
