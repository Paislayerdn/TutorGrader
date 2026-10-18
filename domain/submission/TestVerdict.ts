export type TestVerdict =
	| "PASS"
	| "WRONG_ANSWER"
	| "TIME_LIMIT"
	| "MEMORY_LIMIT"
	| "RUNTIME_ERROR"
	| "COMPILE_ERROR"
	| "PROVIDER_ERROR";

export type ExecutionFailureVerdict = Exclude<TestVerdict, "PASS" | "WRONG_ANSWER">;
