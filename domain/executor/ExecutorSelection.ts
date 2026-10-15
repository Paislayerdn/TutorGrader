import type { Executor } from "./Executor";

export type ExecutorSelection = {
	executorId: number;
	executorCode: string;
	executorName: string;
	languageId: number;
	compilerId: string;
	runtimeVersion: string;
	executor: Executor;
};
