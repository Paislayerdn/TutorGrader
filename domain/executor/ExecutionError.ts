export type ExecutionErrorKind =
	| "COMPILE_ERROR"
	| "RUNTIME_ERROR"
	| "TIME_LIMIT"
	| "MEMORY_LIMIT"
	| "PROVIDER_ERROR";

export type ExecutionError = {
	kind: ExecutionErrorKind;
	message: string;
	diagnostic: string | null;
	executionTimeMs: number | null;
	memoryUsageKb: number | null;
	output?: string;
};
