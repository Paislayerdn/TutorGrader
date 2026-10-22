
import {
	JudgeRepo,
	type JudgeSubmissionRow,
	type JudgeTestCase,
	type JudgeVersionRow,
} from "@/data/supabase/repositories/JudgeRepo";
import { ExecutorRegistry } from "@/services/ExecutorRegistry";
import { OutputComparator } from "@/domain/executor/OutputComparator";
import type { JudgeVerdict } from "@/domain/executor/JudgeVerdict";
import { DIAGNOSTIC_MAX_LENGTH } from "@/domain/executor/diagnostics";
import {
	OnlineCompilerExecutor,
	type OnlineCompilerTestResult,
} from "@/domain/executor/OnlineCompilerExecutor";

const TERMINAL_STATUSES = new Set([
	"COMPLETED",
	"COMPILE_ERROR",
	"REJECTED",
	"PROVIDER_ERROR",
]);


export class JudgeService {
	private readonly judgeRepo = new JudgeRepo();
	private readonly executorRegistry = new ExecutorRegistry();

	async judge(submissionId: string): Promise<void> {
		// 1. Load submission.
		const submission: JudgeSubmissionRow =
			await this.judgeRepo.findSubmission(submissionId);

		if (TERMINAL_STATUSES.has(submission.status)) return;

		// 2. Validate the problem and its published version.
		const problem = await this.judgeRepo.findProblem(
			submission.problem_id,
		);

		if (!problem) {
			await this.failSubmission(submissionId, "PROVIDER_ERROR");
			return;
		}

		if (
			problem.status !== "ACTIVE" ||
			problem.current_version_number !== submission.version_number
		) {
			await this.failSubmission(submissionId, "REJECTED");
			return;
		}

		const version: JudgeVersionRow | null =
			await this.judgeRepo.findVersion(
				submission.problem_id,
				submission.version_number,
			);

		if (!version) {
			await this.failSubmission(submissionId, "PROVIDER_ERROR");
			return;
		}

		if (version.status !== "PUBLISHED") {
			await this.failSubmission(submissionId, "REJECTED");
			return;
		}

		// 3. Download and validate the submitted source code.
		const stuff = await this.judgeRepo.findStuff(
			submission.source_stuff_id,
		);

		if (!stuff) {
			await this.failSubmission(submissionId, "PROVIDER_ERROR");
			return;
		}

		const sourceFile = await this.judgeRepo.downloadStuff(
			stuff.bucket,
			stuff.storage_path,
		);

		if (!sourceFile) {
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
		const orderedCases: JudgeTestCase[] | null =
			await this.judgeRepo.findOrderedTestCases(
				submission.problem_id,
				submission.version_number,
			);

		if (!orderedCases) {
			await this.failSubmission(submissionId, "PROVIDER_ERROR");
			return;
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

		const selectionSaved = await this.judgeRepo.saveExecutorSelection(
			submissionId,
			{
				executorId: selection.executorId,
				compilerId: selection.compilerId,
				runtimeVersion: selection.runtimeVersion,
			},
		);

		if (!selectionSaved) {
			throw new Error("Unable to start judging.");
		}

		// OnlineCompiler compiles and runs visible test cases in one request;
		// retain those results for the normal per-case persistence below.
		const onlineCompiler = selection.executorCode === "onlinecompiler"
			? selection.executor as OnlineCompilerExecutor
			: null;
		let onlineTestResults: OnlineCompilerTestResult[] | null = null;
		let compilation;

		if (onlineCompiler) {
			const run = await onlineCompiler.runTests(
				selection.compilerId,
				sourceCode,
				orderedCases.map(testCase => ({
					input: testCase.input,
					expectedOutput: testCase.expectedOutput,
				})),
				version.time_limit_ms,
			);

			if (!run.ok) {
				console.error("OnlineCompiler test request failed:", run.error);
				await this.failSubmission(submissionId, "PROVIDER_ERROR");
				return;
			}

			onlineTestResults = run.tests;
			const failedCompileTest = onlineTestResults.find(
				test => test.verdict === "compilation_error",
			);
			const compileDiagnostic = run.compileError ??
				(failedCompileTest
					? failedCompileTest.error ?? "Compilation failed without diagnostic output."
					: null);

			if (compileDiagnostic) {
				compilation = {
					success: false as const,
					error: {
						kind: "COMPILE_ERROR" as const,
						message: "Compilation failed.",
						diagnostic: compileDiagnostic,
						executionTimeMs: null,
						memoryUsageKb: null,
					},
				};
			} else if (!onlineTestResults[0]) {
				await this.failSubmission(submissionId, "PROVIDER_ERROR");
				return;
			} else {
				compilation = {
					success: true as const,
					output: "",
					stderr: "",
					exitCode: 0,
					executionTimeMs: null,
					memoryUsageKb: null,
				};
			}
		} else {
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
		}

		if (!compilation.success) {
			if (compilation.error.kind !== "COMPILE_ERROR") {
				console.error(
					"Compilation provider failed:",
					compilation.error,
				);
				await this.failSubmission(submissionId, "PROVIDER_ERROR");
				return;
			}

			const diagnostic = this.limitDiagnostic(
				compilation.error.diagnostic ??
					compilation.error.message,
			);

			// Compile errors must not retain test results.
			const resultsCleared =
				await this.judgeRepo.clearTestResults(submissionId);

			if (!resultsCleared) {
				await this.failSubmission(submissionId, "PROVIDER_ERROR");
				return;
			}

			const compileErrorSaved =
				await this.judgeRepo.saveCompileError(
					submissionId,
					diagnostic,
				);

			if (!compileErrorSaved) {
				await this.failSubmission(submissionId, "PROVIDER_ERROR");
				return;
			}

			await this.finishSubmission(
				submissionId,
				"COMPILE_ERROR",
				null,
			);
			return;
		}

		// Compilation succeeded: remove old diagnostics and stale results.
		const compileErrorCleared =
			await this.judgeRepo.clearCompileError(submissionId);

		if (!compileErrorCleared) {
			await this.failSubmission(submissionId, "PROVIDER_ERROR");
			return;
		}

		const oldResultsCleared =
			await this.judgeRepo.clearTestResults(submissionId);

		if (!oldResultsCleared) {
			await this.failSubmission(submissionId, "PROVIDER_ERROR");
			return;
		}

		const testingStatusSaved =
			await this.judgeRepo.updateSubmissionStatus(
				submissionId,
				"TESTING",
				null,
			);

		if (!testingStatusSaved) {
			throw new Error("Unable to update submission status.");
		}

		// 7. Execute every test case.
		// Continue through every test case, even when an earlier case fails.
		let hasProviderError = false;

		for (const [index, testCase] of orderedCases.entries()) {
			let verdict: JudgeVerdict;
			let output: string | null = null;
			let diagnostic: string | null = null;
			let executionTimeMs: number | null = null;
			let memoryUsageKb: number | null = null;

			try {
				let result;
				if (onlineCompiler) {
					const onlineResult = onlineTestResults?.[index];
					if (!onlineResult) {
						result = {
							success: false as const,
							error: {
								kind: "PROVIDER_ERROR" as const,
								message: "OnlineCompiler could not process this test case.",
								diagnostic: "OnlineCompiler omitted a test result.",
								executionTimeMs: null,
								memoryUsageKb: null,
							},
						};
					} else {
						result = OnlineCompilerExecutor.executionResult(
							onlineResult,
							version.time_limit_ms,
							version.memory_limit_kb,
						);
					}
				} else {
					result = await selection.executor.execute({
						sourceCode,
						compilerId: selection.compilerId,
						stdin: testCase.input,
						timeLimitMs: version.time_limit_ms,
						memoryLimitKb: version.memory_limit_kb,
					});
				}

				if (!result.success) {
					verdict = result.error.kind;
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

			const resultSaved = await this.judgeRepo.saveTestResult({
				submissionId: submission.id,
				problemId: submission.problem_id,
				versionNumber: submission.version_number,
				testCaseOrder: testCase.order,
				status: verdict,
				executionTimeMs,
				memoryUsageKb,
				output,
				diagnostic,
			});

			if (!resultSaved) {
				// Continue attempting the remaining tests, as before.
				hasProviderError = true;
			}
		}

		// 8. Finalize after every test has been attempted.
		await this.finishSubmission(
			submissionId,
			hasProviderError ? "PROVIDER_ERROR" : "COMPLETED",
			hasProviderError
				? "One or more test cases could not be processed reliably."
				: null,
		);
	}

	private async finishSubmission(
		submissionId: string,
		status: string,
		diagnostic: string | null,
	): Promise<void> {
		const updated = await this.judgeRepo.updateSubmissionStatus(
			submissionId,
			status,
			diagnostic,
		);

		if (!updated) {
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
		return value.slice(0, DIAGNOSTIC_MAX_LENGTH);
	}
}

