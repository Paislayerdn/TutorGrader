export type ExecutionRequest = {
	sourceCode: string;
	compilerId: string;
	stdin: string;

	timeLimitMs: number;
	memoryLimitKb: number;
};
