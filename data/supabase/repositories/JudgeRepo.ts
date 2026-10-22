
import { supabaseAdmin } from "@/data/supabase/supabase-admin";
import { OutputComparison } from "@/domain/problem/version/OutputComparison";
import type { SubmissionStatus } from "@/domain/submission/SubmissionStatus";

export type JudgeSubmissionRow = {
	id: string;
	user_id: string;
	problem_id: string;
	version_number: number;
	language_id: number;
	status: string;
	source_stuff_id: string;
};

export type JudgeProblemRow = {
	status: string;
	current_version_number: number | null;
};

export type JudgeVersionRow = {
	status: string;
	time_limit_ms: number;
	memory_limit_kb: number;
	output_comparison: OutputComparison;
};

export type JudgeStuffRow = {
	bucket: string;
	storage_path: string;
};

export type JudgeTestCase = {
	order: number;
	input: string;
	expectedOutput: string;
};

export type JudgeTestResultInput = {
	submissionId: string;
	problemId: string;
	versionNumber: number;
	testCaseOrder: number;
	status: string;
	executionTimeMs: number | null;
	memoryUsageKb: number | null;
	output: string | null;
	diagnostic: string | null;
};

export class JudgeRepo {
	async claimJob(workerId: string): Promise<{ id: number; submission_id: string; attempts: number }[]> {
		const { data, error } = await supabaseAdmin.rpc("claim_submission_judge_jobs", {
			p_worker_id: workerId, p_batch_size: 1,
		});
		if (error) throw error;
		return (data ?? []) as { id: number; submission_id: string; attempts: number }[];
	}

	async completeJob(id: number, workerId: string): Promise<Error | null> {
		const now = new Date().toISOString();
		const { error } = await supabaseAdmin.from("submission_judge_queue").update({
			status: "COMPLETED", locked_until: null, locked_by: null,
			last_error: null, finished_at: now, updated_at: now,
		}).eq("id", id).eq("locked_by", workerId).eq("status", "RUNNING");
		return error;
	}

	async recordJobFailure(id: number, workerId: string, exhausted: boolean, retryDelayMs: number, message: string): Promise<Error | null> {
		const now = Date.now();
		const { error } = await supabaseAdmin.from("submission_judge_queue").update({
			status: exhausted ? "FAILED" : "QUEUED",
			available_at: new Date(now + retryDelayMs).toISOString(),
			locked_until: null, locked_by: null, last_error: message,
			finished_at: exhausted ? new Date(now).toISOString() : null,
			updated_at: new Date(now).toISOString(),
		}).eq("id", id).eq("locked_by", workerId).eq("status", "RUNNING");
		return error;
	}
	async findSubmission(
		submissionId: string,
	): Promise<JudgeSubmissionRow> {
		const { data, error } = await supabaseAdmin
			.from("submission")
			.select(
				"id, user_id, problem_id, version_number, language_id, status, source_stuff_id",
			)
			.eq("id", submissionId)
			.maybeSingle();

		if (error || !data) {
			console.error("Judge submission lookup failed:", error);
			throw new Error("Unable to load submission.");
		}

		return data as JudgeSubmissionRow;
	}

	async findProblem(
		problemId: string,
	): Promise<JudgeProblemRow | null> {
		const { data, error } = await supabaseAdmin
			.from("problem")
			.select("status, current_version_number")
			.eq("id", problemId)
			.maybeSingle();

		if (error) {
			console.error("Judge problem lookup failed:", error);
			return null;
		}

		return data as JudgeProblemRow | null;
	}

	async findVersion(
		problemId: string,
		versionNumber: number,
	): Promise<JudgeVersionRow | null> {
		const { data, error } = await supabaseAdmin
			.from("problem_version")
			.select(
				"status, time_limit_ms, memory_limit_kb, output_comparison",
			)
			.eq("problem_id", problemId)
			.eq("version_number", versionNumber)
			.maybeSingle();

		if (error) {
			console.error("Judge version lookup failed:", error);
			return null;
		}

		return data as JudgeVersionRow | null;
	}

	async findStuff(stuffId: string): Promise<JudgeStuffRow | null> {
		const { data, error } = await supabaseAdmin
			.from("stuff")
			.select("bucket, storage_path")
			.eq("id", stuffId)
			.maybeSingle();

		if (error) {
			console.error("Judge source lookup failed:", error);
			return null;
		}

		return data as JudgeStuffRow | null;
	}

	async downloadStuff(
		bucket: string,
		storagePath: string,
	): Promise<Blob | null> {
		const { data, error } = await supabaseAdmin.storage
			.from(bucket)
			.download(storagePath);

		if (error) {
			console.error("Judge source download failed:", error);
			return null;
		}

		return data;
	}

	async findOrderedTestCases(
		problemId: string,
		versionNumber: number,
	): Promise<JudgeTestCase[] | null> {
		const { data: linkData, error: linkError } = await supabaseAdmin
			.from("problem_version_test_case")
			.select('"order", test_case_id')
			.eq("problem_id", problemId)
			.eq("version_number", versionNumber)
			.order("order", { ascending: true });

		if (linkError || !linkData || linkData.length === 0) {
			console.error("Judge test-case lookup failed:", linkError);
			return null;
		}

		const links = linkData as {
			order: number;
			test_case_id: string;
		}[];

		const { data: testCaseData, error: testCaseError } =
			await supabaseAdmin
				.from("test_case")
				.select("id, input, expected_output")
				.in(
					"id",
					links.map(link => link.test_case_id),
				);

		if (testCaseError || !testCaseData) {
			console.error(
				"Judge test-case content lookup failed:",
				testCaseError,
			);
			return null;
		}

		const testCaseById = new Map(
			testCaseData.map(testCase => [
				testCase.id,
				{
					input: testCase.input,
					expectedOutput: testCase.expected_output,
				},
			]),
		);

		const orderedCases: JudgeTestCase[] = [];

		for (const link of links) {
			const testCase = testCaseById.get(link.test_case_id);

			if (!testCase) {
				console.error("A linked test case could not be loaded.");
				return null;
			}

			orderedCases.push({
				order: link.order,
				input: testCase.input,
				expectedOutput: testCase.expectedOutput,
			});
		}

		return orderedCases;
	}

	async saveExecutorSelection(
		submissionId: string,
		selection: {
			executorId: number;
			compilerId: string;
			runtimeVersion: string;
		},
	): Promise<boolean> {
		const { error } = await supabaseAdmin
			.from("submission")
			.update({
				executor_id: selection.executorId,
				compiler_id: selection.compilerId,
				runtime_version: selection.runtimeVersion,
				status: "EVALUATING",
				diagnostic: null,
			})
			.eq("id", submissionId);

		if (error) {
			console.error("Unable to save executor selection:", error);
			return false;
		}

		return true;
	}

	async clearTestResults(submissionId: string): Promise<boolean> {
		const { error } = await supabaseAdmin
			.from("test_result")
			.delete()
			.eq("submission_id", submissionId);

		if (error) {
			console.error("Unable to clear old test results:", error);
			return false;
		}

		return true;
	}

	async saveCompileError(
		submissionId: string,
		diagnostic: string,
	): Promise<boolean> {
		const { error } = await supabaseAdmin
			.from("submission_compile_error")
			.upsert(
				{
					submission_id: submissionId,
					diagnostic,
				},
				{ onConflict: "submission_id" },
			);

		if (error) {
			console.error("Unable to save compiler diagnostic:", error);
			return false;
		}

		return true;
	}

	async clearCompileError(submissionId: string): Promise<boolean> {
		const { error } = await supabaseAdmin
			.from("submission_compile_error")
			.delete()
			.eq("submission_id", submissionId);

		if (error) {
			console.error(
				"Unable to clear old compiler diagnostic:",
				error,
			);
			return false;
		}

		return true;
	}

	async saveTestResult(
		result: JudgeTestResultInput,
	): Promise<boolean> {
		const { error } = await supabaseAdmin
			.from("test_result")
			.upsert(
				{
					submission_id: result.submissionId,
					problem_id: result.problemId,
					version_number: result.versionNumber,
					test_case_order: result.testCaseOrder,
					status: result.status,
					execution_time_ms: result.executionTimeMs,
					memory_usage_kb: result.memoryUsageKb,
					output: result.output,
					diagnostic: result.diagnostic,
				},
				{
					onConflict: "submission_id,test_case_order",
				},
			);

		if (error) {
			console.error(
				`Unable to save test result ${result.testCaseOrder}:`,
				error,
			);
			return false;
		}

		return true;
	}

	async updateSubmissionStatus(
		submissionId: string,
		status: SubmissionStatus,
		diagnostic: string | null,
	): Promise<boolean> {
		const { error } = await supabaseAdmin
			.from("submission")
			.update({ status, diagnostic })
			.eq("id", submissionId);

		if (error) {
			console.error("Unable to update submission status:", error);
			return false;
		}

		return true;
	}
}

