
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

const MAX_DIAGNOSTIC_LENGTH = 12_000;

export class JudgeService {
	private readonly executorRegistry = new ExecutorRegistry();

	async judge(submissionId: string): Promise<void> {
		// 1. Load submission.
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

		// 2. Validate the problem and its version.
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

		// 3. Download the submitted source code.
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

		// 4. Load test cases in their configured order.
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
			console.error(
				"Judge test-case content lookup failed:",
				testCaseError,
			);
			await this.failSubmission(submissionId, "PROVIDER_ERROR");
			return;
		}

		const testCaseById = new Map(
			(testCaseData as TestCaseRow[]).map(testCase => [
				testCase.id,
				testCase,
			]),
		);

		const orderedCases: {
			order: number;
			input: string;
			expectedOutput: string;
		}[] = [];

		for (const link of links) {
			const testCase = testCaseById.get(link.test_case_id);

			if (!testCase) {
				console.error("A linked test case could not be loaded.");
				await this.failSubmission(submissionId, "PROVIDER_ERROR");
				return;
			}

			orderedCases.push({
				order: link.order,
				input: testCase.input,
				expectedOutput: testCase.expected_output,
			});
		}

		// 5. Resolve the execution provider and compiler.
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

		// 6. Compile ONCE, before executing any test case.
		let compilation;

		try {
			compilation = await selection.executor.compile({
				sourceCode,
				compilerId: selection.compilerId,
			});
		} catch (error) {
			console.error("Compilation provider threw an error:", error);
			await this.failSubmission(submissionId, "PROVIDER_ERROR");
			return;
		}

		if (!compilation.success) {
			if (compilation.error.kind === "COMPILE_ERROR") {
				const diagnostic = this.limitDiagnostic(
					compilation.error.diagnostic ??
						compilation.error.message,
				);

				// A compile-error submission must have no test results.
				const { error: deleteResultsError } = await supabaseAdmin
					.from("test_result")
					.delete()
					.eq("submission_id", submissionId);

				if (deleteResultsError) {
					console.error(
						"Unable to clear old test results:",
						deleteResultsError,
					);
					await this.failSubmission(
						submissionId,
						"PROVIDER_ERROR",
					);
					return;
				}

				const { error: saveCompileError } = await supabaseAdmin
					.from("submission_compile_error")
					.upsert(
						{
							submission_id: submissionId,
							diagnostic,
						},
						{ onConflict: "submission_id" },
					);

				if (saveCompileError) {
					console.error(
						"Unable to save compiler diagnostic:",
						saveCompileError,
					);
					await this.failSubmission(
						submissionId,
						"PROVIDER_ERROR",
					);
					return;
				}

				await this.finishSubmission(
					submissionId,
					"COMPILE_ERROR",
					null,
				);
				return;
			}

			// A failed provider request is not a compilation error.
			console.error(
				"Compilation provider failed:",
				compilation.error,
			);

			await this.failSubmission(submissionId, "PROVIDER_ERROR");
			return;
		}

		// Compilation succeeded. Remove any old compile-error record and
		// stale test results before starting a fresh test run.
		const { error: deleteCompileError } = await supabaseAdmin
			.from("submission_compile_error")
			.delete()
			.eq("submission_id", submissionId);

		if (deleteCompileError) {
			console.error(
				"Unable to clear old compiler diagnostic:",
				deleteCompileError,
			);
			await this.failSubmission(submissionId, "PROVIDER_ERROR");
			return;
		}

		const { error: deleteOldResults } = await supabaseAdmin
			.from("test_result")
			.delete()
			.eq("submission_id", submissionId);

		if (deleteOldResults) {
			console.error("Unable to clear old test results:", deleteOldResults);
			await this.failSubmission(submissionId, "PROVIDER_ERROR");
			return;
		}

		const { error: testingError } = await supabaseAdmin
			.from("submission")
			.update({ status: "TESTING", diagnostic: null })
			.eq("id", submissionId);

		if (testingError) {
			console.error("Unable to update judging status:", testingError);
			throw new Error("Unable to update submission status.");
		}

		// 7. Run EVERY test case.
		// A wrong answer, runtime error, or provider error on one test
		// must not prevent the remaining test cases from being attempted.
		let hasProviderError = false;

		for (const testCase of orderedCases) {
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

					if (verdict === "PROVIDER_ERROR") {
						hasProviderError = true;
					}
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
				console.error(
					`Execution failed unexpectedly for test ${testCase.order}:`,
					error,
				);

				verdict = "PROVIDER_ERROR";
				diagnostic = "The execution provider failed unexpectedly.";
				hasProviderError = true;
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
				console.error(
					`Unable to save test result ${testCase.order}:`,
					resultSaveError,
				);

				// Keep attempting the remaining tests even if one result
				// cannot be persisted.
				hasProviderError = true;
			}
		}

		// 8. Finalize only after every test has been attempted.
		await this.finishSubmission(
			submissionId,
			hasProviderError ? "PROVIDER_ERROR" : "COMPLETED",
			hasProviderError
				? "One or more test cases could not be processed reliably."
				: null,
		);
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
		return value.slice(0, MAX_DIAGNOSTIC_LENGTH);
	}
}

