import type { CompilationRequest } from "./CompilationRequest";
import type { ExecutionRequest } from "./ExecutionRequest";
import type { ExecutionError } from "./ExecutionError";
import type { ExecutionResult } from "./ExecutionResult";
import type { Executor } from "./Executor";
import { DIAGNOSTIC_MAX_LENGTH } from "./diagnostics";

export type OnlineCompilerTestCase = {
	input: string;
	expectedOutput: string;
};

export type OnlineCompilerTestResult = {
	verdict: string;
	output?: string;
	error?: string;
	time?: string | number;
	memory?: string | number;
	exit_code?: number;
	signal?: string | null;
	truncated?: boolean;
};

export type OnlineCompilerTestRun =
	| {
		ok: true;
		compileError: string | null;
		tests: OnlineCompilerTestResult[];
	}
	| { ok: false; error: ExecutionError };

type OnlineCompilerResponse = {
	compile_error?: unknown;
	tests?: unknown;
	error?: unknown;
};

const API_URL = "https://api.onlinecompiler.io/api/run-tests/";
const REQUEST_TIMEOUT_MS = 65_000;

function createError(message: string, diagnostic: string | null = null): ExecutionError {
	return {
		kind: "PROVIDER_ERROR",
		message,
		diagnostic: diagnostic?.slice(0, DIAGNOSTIC_MAX_LENGTH) ?? null,
		executionTimeMs: null,
		memoryUsageKb: null,
	};
}

function asNumber(value: unknown): number | null {
	if (typeof value !== "number" && typeof value !== "string") return null;
	if (String(value).trim() === "") return null;
	const result = Number(value);
	return Number.isFinite(result) ? result : null;
}

export class OnlineCompilerExecutor implements Executor {
	async compile(request: CompilationRequest): Promise<ExecutionResult> {
		void request;
		return {
			success: false,
			error: createError("OnlineCompiler requires a visible test case to check compilation."),
		};
	}

	async execute(request: ExecutionRequest): Promise<ExecutionResult> {
		void request;
		return {
			success: false,
			error: createError("OnlineCompiler runs test cases as a batch."),
		};
	}

	async runTests(
		compilerId: string,
		sourceCode: string,
		testCases: OnlineCompilerTestCase[],
		timeLimitMs: number,
	): Promise<OnlineCompilerTestRun> {
		const apiKey = process.env.ONLINECOMPILER_API_KEY;
		if (!apiKey) {
			return { ok: false, error: createError("OnlineCompiler is not configured.") };
		}

		// OnlineCompiler accepts limits from above zero through 30 seconds. Fail
		// explicitly when a problem's configured limit cannot be represented.
		if (timeLimitMs <= 0 || timeLimitMs > 30_000) {
			return {
				ok: false,
				error: createError("OnlineCompiler cannot run this problem's configured time limit."),
			};
		}

		let response: Response;
		try {
			response = await fetch(API_URL, {
				method: "POST",
				headers: {
					Authorization: apiKey,
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({
					compiler: compilerId,
					code: sourceCode,
					tests: testCases.map(testCase => ({
						input: testCase.input,
						expected_output: testCase.expectedOutput,
						hidden: false,
					})),
				time_limit: timeLimitMs / 1000,
				checker: "exact",
				stop_on_failure: false,
				}),
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
				cache: "no-store",
			});
		} catch (error) {
			console.error("OnlineCompiler request failed:", error);
			return { ok: false, error: createError("OnlineCompiler could not be reached or did not respond in time.") };
		}

		let body: OnlineCompilerResponse;
		try {
			body = await response.json() as OnlineCompilerResponse;
		} catch {
			return { ok: false, error: createError("OnlineCompiler returned an invalid response.") };
		}

		if (!response.ok) {
			const message = typeof body.error === "string" ? body.error : null;
			console.error("OnlineCompiler returned HTTP status:", response.status, message);
			return { ok: false, error: createError("OnlineCompiler returned an unsuccessful HTTP response.", message) };
		}

		if (!Array.isArray(body.tests)) {
			return { ok: false, error: createError("OnlineCompiler returned an invalid test result.") };
		}

		return {
			ok: true,
			compileError: typeof body.compile_error === "string" && body.compile_error
				? body.compile_error.slice(0, DIAGNOSTIC_MAX_LENGTH)
				: null,
			tests: body.tests.map((test: unknown) => {
				if (!test || typeof test !== "object") return { verdict: "internal_error" };
				const result = test as Record<string, unknown>;
				return {
					verdict: typeof result.verdict === "string" ? result.verdict : "internal_error",
					output: typeof result.output === "string" ? result.output : undefined,
					error: typeof result.error === "string" ? result.error : undefined,
					time: typeof result.time === "string" || typeof result.time === "number" ? result.time : undefined,
					memory: typeof result.memory === "string" || typeof result.memory === "number" ? result.memory : undefined,
					exit_code: typeof result.exit_code === "number" ? result.exit_code : undefined,
					signal: typeof result.signal === "string" ? result.signal : null,
					truncated: result.truncated === true,
				};
			}),
		};
	}

	static executionResult(test: OnlineCompilerTestResult, timeLimitMs: number, memoryLimitKb: number): ExecutionResult {
		const seconds = asNumber(test.time);
		const executionTimeMs = seconds === null ? null : Math.round(seconds * 1000);
		const reportedMemoryKb = asNumber(test.memory);
		const memoryUsageKb = reportedMemoryKb === null ? null : Math.round(reportedMemoryKb);
		const output = test.output;
		const diagnostic = test.error?.slice(0, DIAGNOSTIC_MAX_LENGTH) ?? null;

		if (test.truncated || output === undefined) {
			return { success: false, error: {
				kind: "PROVIDER_ERROR",
				message: test.truncated ? "OnlineCompiler truncated the test output." : "OnlineCompiler omitted the visible test output.",
				diagnostic,
				executionTimeMs,
				memoryUsageKb,
				output,
			} };
		}

		const kind = test.verdict === "time_limit_exceeded" ? "TIME_LIMIT"
			: test.verdict === "memory_limit_exceeded" ? "MEMORY_LIMIT"
			: test.verdict === "compilation_error" ? "COMPILE_ERROR"
			: test.verdict === "runtime_error" || test.verdict === "output_limit_exceeded" ? "RUNTIME_ERROR"
			: test.verdict === "accepted" || test.verdict === "wrong_answer" ? null
			: "PROVIDER_ERROR";

		if (kind) {
			return { success: false, error: {
				kind,
				message: `OnlineCompiler test result: ${test.verdict}.`,
				diagnostic,
				executionTimeMs,
				memoryUsageKb,
				output,
			} };
		}

		if (timeLimitMs > 0 && executionTimeMs !== null && executionTimeMs > timeLimitMs) {
			return { success: false, error: {
				kind: "TIME_LIMIT", message: "The program exceeded the time limit.", diagnostic,
				executionTimeMs, memoryUsageKb, output,
			} };
		}
		if (memoryLimitKb > 0 && memoryUsageKb !== null && memoryUsageKb > memoryLimitKb) {
			return { success: false, error: {
				kind: "MEMORY_LIMIT", message: "The program exceeded the memory limit.", diagnostic,
				executionTimeMs, memoryUsageKb, output,
			} };
		}

		return {
			success: true,
			output,
			stderr: test.error ?? "",
			exitCode: test.exit_code ?? 0,
			executionTimeMs,
			memoryUsageKb,
		};
	}
}
