import type { ExecutionError } from "./ExecutionError";

export type ExecutionResult =
	| {
		success: true;
		output: string;
		stderr: string;
		exitCode: number;
		executionTimeMs: number | null;
		memoryUsageKb: number | null;
	}
	| {
		success: false;
		error: ExecutionError;
	};

