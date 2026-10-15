import type { Executor } from "./Executor";
import type { ExecutionRequest } from "./ExecutionRequest";
import type { ExecutionError } from "./ExecutionError";
import type { ExecutionResult } from "./ExecutionResult";

type WandboxResponse = {
	status?: string | number | null;
	signal?: string | null;
	compiler_error?: string | null;
	compiler_message?: string | null;
	program_output?: string | null;
	program_error?: string | null;
	program_message?: string | null;
	time?: string | number | null;
	memory?: string | number | null;
};

const API_URL = "https://wandbox.org/api/compile.json";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_DIAGNOSTIC_LENGTH = 12_000;

function asText(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
	if (typeof value !== "number" && typeof value !== "string") {
		return null;
	}

	if (String(value).trim() === "") return null;

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function diagnosticText(...parts: unknown[]): string | null {
	const text = parts
		.map(asText)
		.filter(part => part.trim().length > 0)
		.join("\n")
		.trim();

	return text
		? text.slice(0, MAX_DIAGNOSTIC_LENGTH)
		: null;
}

function createError(
	kind: ExecutionError["kind"],
	message: string,
	diagnostic: string | null,
	executionTimeMs: number | null = null,
	memoryUsageKb: number | null = null,
	output?: string,
): ExecutionResult {
	return {
		success: false,
		error: {
			kind,
			message,
			diagnostic,
			executionTimeMs,
			memoryUsageKb,
			output,
		},
	};
}

export class WandboxExecutor implements Executor {
	async execute(
		request: ExecutionRequest,
	): Promise<ExecutionResult> {
		let response: Response;

		try {
			response = await fetch(API_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Accept": "application/json",
				},
				body: JSON.stringify({
					code: request.sourceCode,
					compiler: request.compilerId,
					stdin: request.stdin,
					save: false,
				}),
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
				cache: "no-store",
			});
		} catch (error) {
			console.error("Wandbox request failed:", error);

			return createError(
				"PROVIDER_ERROR",
				"Wandbox could not be reached or did not respond in time.",
				null,
			);
		}

		if (!response.ok) {
			console.error("Wandbox returned HTTP status:", response.status);

			return createError(
				"PROVIDER_ERROR",
				"Wandbox returned an unsuccessful HTTP response.",
				null,
			);
		}

		let result: WandboxResponse;

		try {
			result = await response.json() as WandboxResponse;
		} catch {
			return createError(
				"PROVIDER_ERROR",
				"Wandbox returned an invalid response.",
				null,
			);
		}

		const status = asNumber(result.status);
		const executionTime = asNumber(result.time);
		const memoryUsage = asNumber(result.memory);

		// Wandbox reports execution time in seconds.
		const executionTimeMs = executionTime === null
			? null
			: Math.round(executionTime * 1000);

		// Wandbox reports memory usage in KB.
		const memoryUsageKb = memoryUsage === null
			? null
			: Math.round(memoryUsage);

		const output = asText(result.program_output);
		const stderr = asText(result.program_error);
		const compilerError = asText(result.compiler_error);
		const signal = asText(result.signal);

		const diagnostic = diagnosticText(
			result.compiler_error,
			result.compiler_message,
			result.program_error,
			result.program_message,
			result.signal,
		);

		if (status === null) {
			return createError(
				"PROVIDER_ERROR",
				"Wandbox did not return a valid execution status.",
				diagnostic,
				executionTimeMs,
				memoryUsageKb,
				output,
			);
		}

		if (compilerError.trim() && status !== 0) {
			return createError(
				"COMPILE_ERROR",
				"Compilation failed.",
				diagnostic,
				executionTimeMs,
				memoryUsageKb,
				output,
			);
		}

		if (signal.trim() || status !== 0) {
			return createError(
				"RUNTIME_ERROR",
				"The program terminated unsuccessfully.",
				diagnostic,
				executionTimeMs,
				memoryUsageKb,
				output,
			);
		}

		if (
			request.timeLimitMs > 0 &&
			executionTimeMs !== null &&
			executionTimeMs > request.timeLimitMs
		) {
			return createError(
				"TIME_LIMIT",
				"The program exceeded the time limit.",
				diagnostic,
				executionTimeMs,
				memoryUsageKb,
				output,
			);
		}

		if (
			request.memoryLimitKb > 0 &&
			memoryUsageKb !== null &&
			memoryUsageKb > request.memoryLimitKb
		) {
			return createError(
				"MEMORY_LIMIT",
				"The program exceeded the memory limit.",
				diagnostic,
				executionTimeMs,
				memoryUsageKb,
				output,
			);
		}

		return {
			success: true,
			output,
			stderr,
			exitCode: status,
			executionTimeMs,
			memoryUsageKb,
		};
	}
}
