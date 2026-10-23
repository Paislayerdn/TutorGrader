
import {
	JudgeRepo,
	type JudgeSubmissionRow,
} from "@/data/supabase/repositories/JudgeRepo";
import type { JudgeTestCase } from "@/domain/executor/JudgeTestCase";
import { ExecutorRegistry } from "@/services/ExecutorRegistry";
import { OutputComparator } from "@/domain/executor/OutputComparator";
import type { JudgeVerdict } from "@/domain/executor/JudgeVerdict";
import { SubmissionStatus } from "@/domain/submission/SubmissionStatus";
import { TestVerdict } from "@/domain/submission/TestVerdict";
import { DIAGNOSTIC_MAX_LENGTH } from "@/domain/executor/diagnostics";
import {
	OnlineCompilerExecutor,
	type OnlineCompilerTestResult,
} from "@/domain/executor/OnlineCompilerExecutor";

const TERMINAL_STATUSES = new Set<string>([
	SubmissionStatus.COMPLETED,
	SubmissionStatus.INCOMPLETE,
	SubmissionStatus.ERROR,
]);


export class JudgeService {
	private readonly judgeRepo = new JudgeRepo();
	private readonly executorRegistry = new ExecutorRegistry();

	async judge(submissionId: string): Promise<void> {
		// 1. Load submission.
		const submission: JudgeSubmissionRow =
			await this.judgeRepo.findSubmission(submissionId);

		if (TERMINAL_STATUSES.has(submission.status)) return;
		if (!(await this.judgeRepo.updateSubmissionStatus(
			submissionId,
			SubmissionStatus.EVALUATING,
			null,
		))) {
			throw new Error("Unable to start submission evaluation.");
		}

		// These reads are independent once the submission row is loaded.
		// Run them together to avoid serial Supabase round trips.
		const [problem, version, stuff] = await Promise.all([
			this.judgeRepo.findProblem(submission.problem_id),
			this.judgeRepo.findVersion(
				submission.problem_id,
				submission.version_number,
			),
			this.judgeRepo.findStuff(submission.source_stuff_id),
		]);

		// 2. Validate the problem and its published version.

		if (!problem) {
			await this.failSubmission(submissionId);
			return;
		}

		if (
			problem.status !== "ACTIVE" ||
			problem.current_version_number !== submission.version_number
		) {
			await this.failSubmission(submissionId, "This submission is no longer eligible for judging.");
			return;
		}

		if (!version) {
			await this.failSubmission(submissionId);
			return;
		}

		if (version.status !== "PUBLISHED") {
			await this.failSubmission(submissionId, "This submission is no longer eligible for judging.");
			return;
		}

		// 3. Download and validate the submitted source code.
		if (!stuff) {
			await this.failSubmission(submissionId);
			return;
		}

		// Source download and testcase lookup are independent network operations.
		const [sourceFile, orderedCases]: [Blob | null, JudgeTestCase[] | null] =
			await Promise.all([
				this.judgeRepo.downloadStuff(stuff.bucket, stuff.storage_path),
				this.judgeRepo.findOrderedTestCases(
					submission.problem_id,
					submission.version_number,
				),
			]);

		if (!sourceFile) {
			await this.failSubmission(submissionId);
			return;
		}

		let sourceCode: string;

		try {
			sourceCode = new TextDecoder("utf-8", { fatal: true }).decode(
				await sourceFile.arrayBuffer(),
			);
		} catch {
			await this.failSubmission(submissionId, "The submitted source file is not valid UTF-8.");
			return;
		}

		// 4. Testcases were loaded alongside the source download.
		if (!orderedCases) {
			await this.failSubmission(submissionId);
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
			await this.failSubmission(submissionId);
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
				await this.failSubmission(submissionId);
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
						kind: TestVerdict.COMPILE_ERROR,
						message: "Compilation failed.",
						diagnostic: compileDiagnostic,
						executionTimeMs: null,
						memoryUsageKb: null,
					},
				};
			} else if (!onlineTestResults[0]) {
				await this.failSubmission(submissionId);
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
				await this.failSubmission(submissionId);
				return;
			}
		}

		if (!compilation.success) {
			if (compilation.error.kind !== TestVerdict.COMPILE_ERROR) {
				console.error(
					"Compilation provider failed:",
					compilation.error,
				);
				await this.failSubmission(submissionId);
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
				await this.failSubmission(submissionId);
				return;
			}

			const compileErrorSaved =
				await this.judgeRepo.saveCompileError(
					submissionId,
					diagnostic,
				);

			if (!compileErrorSaved) {
				await this.failSubmission(submissionId);
				return;
			}

			await this.finishSubmission(
				submissionId,
				SubmissionStatus.ERROR,
				null,
			);
			return;
		}

		// Compilation succeeded: remove old diagnostics and stale results.
		const compileErrorCleared =
			await this.judgeRepo.clearCompileError(submissionId);

		if (!compileErrorCleared) {
			await this.failSubmission(submissionId);
			return;
		}

		const oldResultsCleared =
			await this.judgeRepo.clearTestResults(submissionId);

		if (!oldResultsCleared) {
			await this.failSubmission(submissionId);
			return;
		}

		const testingStatusSaved =
			await this.judgeRepo.updateSubmissionStatus(
				submissionId,
				SubmissionStatus.EVALUATING,
				null,
			);

		if (!testingStatusSaved) {
			throw new Error("Unable to update submission status.");
		}

		// Wandbox compiles and runs on each request, so execute testcases in a
		// small bounded batch. Other executors keep their existing execution path.
		const batchExecutionResults = onlineCompiler || !selection.executor.executeBatch
			? null
			: await selection.executor.executeBatch(orderedCases.map(testCase => ({
				sourceCode,
				compilerId: selection.compilerId,
				stdin: testCase.input,
				timeLimitMs: version.time_limit_ms,
				memoryLimitKb: version.memory_limit_kb,
			})));

		// 7. Execute every test case.
		// Continue through every test case, even when an earlier case fails.
		let hasEvaluationError = false;
		let hasIncompleteResult = false;

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
							kind: TestVerdict.PROVIDER_ERROR,
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
				} else if (batchExecutionResults) {
					result = batchExecutionResults[index];
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

					if (verdict === TestVerdict.TIME_LIMIT || verdict === TestVerdict.MEMORY_LIMIT) {
						hasIncompleteResult = true;
					} else {
						hasEvaluationError = true;
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
						? TestVerdict.PASS
						: TestVerdict.WRONG_ANSWER;
				}
			} catch (error) {
				console.error(
					`Execution failed unexpectedly for test ${testCase.order}:`,
					error,
				);

				verdict = TestVerdict.PROVIDER_ERROR;
				diagnostic = "The execution provider failed unexpectedly.";
				hasEvaluationError = true;
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
				hasEvaluationError = true;
			}
		}

		// 8. Finalize after every test has been attempted.
		await this.finishSubmission(
			submissionId,
			hasEvaluationError
				? SubmissionStatus.ERROR
				: hasIncompleteResult
					? SubmissionStatus.INCOMPLETE
					: SubmissionStatus.COMPLETED,
			hasEvaluationError
				? "One or more test cases could not be processed reliably."
				: null,
		);
	}

	private async finishSubmission(
		submissionId: string,
		status: SubmissionStatus.COMPLETED | SubmissionStatus.INCOMPLETE | SubmissionStatus.ERROR,
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
		diagnostic = "The judging system could not process this submission.",
	): Promise<void> {
		await this.finishSubmission(
			submissionId,
			SubmissionStatus.ERROR,
			diagnostic,
		);
	}

	private limitDiagnostic(value: string): string {
		return value.slice(0, DIAGNOSTIC_MAX_LENGTH);
	}
}

