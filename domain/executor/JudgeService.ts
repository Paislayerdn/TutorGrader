import { supabaseAdmin } from "@/lib/supabase-admin";
import { OutputComparison } from "@/domain/problem/version/OutputComparison";

import { ExecutorRegistry } from "./ExecutorRegistry";
import { OutputComparator } from "./OutputComparator";
import type { ExecutionErrorKind } from "./ExecutionError";
import type { JudgeVerdict } from "./JudgeVerdict";

type SubmissionRow = {
	id: string;
	user_id: string;
	problem_id: string;
	version_number: number;
	language_id: number;
	status: string;
	source_stuff_id: string;
};

type VersionRow = {
	status: string;
	time_limit_ms: number;
	memory_limit_kb: number;
	output_comparison: OutputComparison;
};

type StuffRow = {
	bucket: string;
	storage_path: string;
};

type TestLinkRow = {
	order: number;
	test_case_id: string;
};

type TestCaseRow = {
	id: string;
	input: string;
	expected_output: string;
};

const TERMINAL_STATUSES = new Set([
	"COMPLETED",
	"COMPILE_ERROR",
	"REJECTED",
	"PROVIDER_ERROR",
]);

export class JudgeService {
	private readonly executorRegistry = new ExecutorRegistry();

	async judge(submissionId: string): Promise<void> {
		const { data: submissionData, error: submissionError } =
			await supabaseAdmin
				.from("submission")
				.select(
					"id, user_id, problem_id, version_number, language_id, status, source_stuff_id",
				)
				.eq("id", submissionId)
				.maybeSingle();

		if (submissionError || !submissionData) {
			console.error("Judge submission lookup failed:", submissionError);
			throw new Error("Unable to load submission.");
		}

		const submission = submissionData as SubmissionRow;

		if (TERMINAL_STATUSES.has(submission.status)) return;

		const { data: problemData, error: problemError } =
			await supabaseAdmin
				.from("problem")
				.select("status, current_version_number")
				.eq("id", submission.problem_id)
				.maybeSingle();

		if (problemError || !problemData) {
			console.error("Judge problem lookup failed:", problemError);
			await this.failSubmission(submissionId, "PROVIDER_ERROR");
			return;
		}

		if (
			problemData.status !== "ACTIVE" ||
			problemData.current_version_number !== submission.version_number
		) {
			await this.failSubmission(submissionId, "REJECTED");
			return;
		}

		const { data: versionData, error: versionError } =
			await supabaseAdmin
				.from("problem_version")
				.select(
					"status, time_limit_ms, memory_limit_kb, output_comparison",
				)
				.eq("problem_id", submission.problem_id)
				.eq("version_number", submission.version_number)
				.maybeSingle();

		if (versionError || !versionData) {
			console.error("Judge version lookup failed:", versionError);
			await this.failSubmission(submissionId, "PROVIDER_ERROR");
			return;
		}

		const version = versionData as VersionRow;

		if (version.status !== "PUBLISHED") {
			await this.failSubmission(submissionId, "REJECTED");
			return;
		}

		const { data: stuffData, error: stuffError } =
			await supabaseAdmin
				.from("stuff")
				.select("bucket, storage_path")
				.eq("id", submission.source_stuff_id)
				.maybeSingle();

		if (stuffError || !stuffData) {
			console.error("Judge source lookup failed:", stuffError);
			await this.failSubmission(submissionId, "PROVIDER_ERROR");
			return;
		}

		const stuff = stuffData as StuffRow;

		const { data: sourceFile, error: downloadError } =
			await supabaseAdmin.storage
				.from(stuff.bucket)
				.download(stuff.storage_path);

		if (downloadError || !sourceFile) {
			console.error("Judge source download failed:", downloadError);
			await this.failSubmission(submissionId, "PROVIDER_ERROR");
			return;
		}

		let sourceCode: string;

		try {
			sourceCode = new TextDecoder("utf-8", { fatal: true }).decode(
				await sourceFile.arrayBuffer(),
			);
		} catch {
			await this.failSubmission(submissionId, "REJECTED");
			return;
		}

		const { data: linkData, error: linkError } =
			await supabaseAdmin
				.from("problem_version_test_case")
				.select('"order", test_case_id')
				.eq("problem_id", submission.problem_id)
				.eq("version_number", submission.version_number)
				.order("order", { ascending: true });

		if (linkError || !linkData || linkData.length === 0) {
			console.error("Judge test-case lookup failed:", linkError);
			await this.failSubmission(submissionId, "PROVIDER_ERROR");
			return;
		}

		const links = linkData as TestLinkRow[];

		const { data: testCaseData, error: testCaseError } =
			await supabaseAdmin
				.from("test_case")
				.select("id, input, expected_output")
				.in(
					"id",
					links.map(link => link.test_case_id),
				);

		if (testCaseError || !testCaseData) {
			console.error("Judge test-case content lookup failed:", testCaseError);
			await this.failSubmission(submissionId, "PROVIDER_ERROR");
			return;
		}

		const testCases = testCaseData as TestCaseRow[];
		const testCaseById = new Map(
			testCases.map(testCase => [testCase.id, testCase]),
		);

		const orderedCases = links.map(link => {
			const testCase = testCaseById.get(link.test_case_id);

			if (!testCase) {
				throw new Error("A linked test case could not be loaded.");
			}

			return {
				order: link.order,
				input: testCase.input,
				expectedOutput: testCase.expected_output,
			};
		});

		let selection;

		try {
			selection = await this.executorRegistry.resolve(
				submission.language_id,
			);
		} catch (error) {
			console.error("No execution provider available:", error);
			await this.failSubmission(submissionId, "PROVIDER_ERROR");
			return;
		}

		const { error: selectionError } = await supabaseAdmin
			.from("submission")
			.update({
				executor_id: selection.executorId,
				compiler_id: selection.compilerId,
				runtime_version: selection.runtimeVersion,
				status: "COMPILING",
				diagnostic: null,
			})
			.eq("id", submissionId);

		if (selectionError) {
			console.error("Unable to save executor selection:", selectionError);
			throw new Error("Unable to start judging.");
		}

		for (let index = 0; index < orderedCases.length; index++) {
			const testCase = orderedCases[index];

			let verdict: JudgeVerdict;
			let output: string | null = null;
			let diagnostic: string | null = null;
			let executionTimeMs: number | null = null;
			let memoryUsageKb: number | null = null;

			try {
				const result = await selection.executor.execute({
					sourceCode,
					compilerId: selection.compilerId,
					stdin: testCase.input,
					timeLimitMs: version.time_limit_ms,
					memoryLimitKb: version.memory_limit_kb,
				});

				if (!result.success) {
					verdict = this.mapExecutionError(result.error.kind);
					diagnostic = this.limitDiagnostic(
						result.error.diagnostic ?? result.error.message,
					);
					output = result.error.output ?? null;
					executionTimeMs = result.error.executionTimeMs;
					memoryUsageKb = result.error.memoryUsageKb;
				} else {
					output = result.output;
					diagnostic = this.limitDiagnostic(result.stderr);
					executionTimeMs = result.executionTimeMs;
					memoryUsageKb = result.memoryUsageKb;

					verdict = OutputComparator.matches(
						result.output,
						testCase.expectedOutput,
						version.output_comparison,
					)
						? "PASS"
						: "WRONG_ANSWER";
				}
			} catch (error) {
				console.error("Execution provider threw an error:", error);

				verdict = "PROVIDER_ERROR";
				diagnostic = "The execution provider failed unexpectedly.";
			}

			const { error: resultSaveError } = await supabaseAdmin
				.from("test_result")
				.upsert(
					{
						submission_id: submission.id,
						problem_id: submission.problem_id,
						version_number: submission.version_number,
						test_case_order: testCase.order,
						status: verdict,
						execution_time_ms: executionTimeMs,
						memory_usage_kb: memoryUsageKb,
						output,
						diagnostic,
					},
					{
						onConflict: "submission_id,test_case_order",
					},
				);

			if (resultSaveError) {
				console.error("Unable to save test result:", resultSaveError);
				await this.failSubmission(submissionId, "PROVIDER_ERROR");
				return;
			}

			if (verdict !== "PASS") {
				await this.finishSubmission(
					submissionId,
					verdict === "COMPILE_ERROR"
						? "COMPILE_ERROR"
						: verdict === "PROVIDER_ERROR"
						? "PROVIDER_ERROR"
						: "COMPLETED",
					diagnostic,
				);
				return;
			}

			if (index === 0 && orderedCases.length > 1) {
				const { error: testingError } = await supabaseAdmin
					.from("submission")
					.update({ status: "TESTING" })
					.eq("id", submissionId);

				if (testingError) {
					console.error("Unable to update judging status:", testingError);
					throw new Error("Unable to update submission status.");
				}
			}
		}

		await this.finishSubmission(submissionId, "COMPLETED", null);
	}

	private mapExecutionError(kind: ExecutionErrorKind): JudgeVerdict {
		switch (kind) {
			case "COMPILE_ERROR":
				return "COMPILE_ERROR";
			case "RUNTIME_ERROR":
				return "RUNTIME_ERROR";
			case "TIME_LIMIT":
				return "TIME_LIMIT";
			case "MEMORY_LIMIT":
				return "MEMORY_LIMIT";
			case "PROVIDER_ERROR":
				return "PROVIDER_ERROR";
		}
	}

	private async finishSubmission(
		submissionId: string,
		status: string,
		diagnostic: string | null,
	): Promise<void> {
		const { error } = await supabaseAdmin
			.from("submission")
			.update({ status, diagnostic })
			.eq("id", submissionId);

		if (error) {
			console.error("Unable to finalize submission:", error);
			throw new Error("Unable to finalize submission.");
		}
	}

	private async failSubmission(
		submissionId: string,
		status: "REJECTED" | "PROVIDER_ERROR",
	): Promise<void> {
		await this.finishSubmission(
			submissionId,
			status,
			status === "REJECTED"
				? "This submission is no longer eligible for judging."
				: "The judging system could not process this submission.",
		);
	}

	private limitDiagnostic(value: string): string {
		return value.slice(0, 12_000);
	}
}
