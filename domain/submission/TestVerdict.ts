export enum TestVerdict {
	PASS = "PASS",
	WRONG_ANSWER = "WRONG_ANSWER",
	TIME_LIMIT = "TIME_LIMIT",
	MEMORY_LIMIT = "MEMORY_LIMIT",
	RUNTIME_ERROR = "RUNTIME_ERROR",
	COMPILE_ERROR = "COMPILE_ERROR",
	PROVIDER_ERROR = "PROVIDER_ERROR",
}

export type ExecutionFailureVerdict = Exclude<
	TestVerdict,
	TestVerdict.PASS | TestVerdict.WRONG_ANSWER
>;
