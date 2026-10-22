import { ExecutorRepo } from "@/data/supabase/repositories/ExecutorRepo";

import type { Executor } from "@/domain/executor/Executor";
import type { ExecutorSelection } from "@/domain/executor/ExecutorSelection";
import { WandboxExecutor } from "@/domain/executor/WandboxExecutor";
import { OnlineCompilerExecutor } from "@/domain/executor/OnlineCompilerExecutor";

export class ExecutorRegistry {
	private readonly adapters = new Map<string, Executor>([
		["wandbox", new WandboxExecutor()],
		["onlinecompiler", new OnlineCompilerExecutor()],
	]);

	private readonly executorRepo = new ExecutorRepo();

	async resolve(languageId: number): Promise<ExecutorSelection> {
		if (!Number.isInteger(languageId) || languageId <= 0) {
			throw new Error("Invalid language ID.");
		}

		const [executors, mappings] = await Promise.all([
			this.executorRepo.findEnabledExecutors(),
			this.executorRepo.findDefaultMappingsForLanguage(languageId),
		]);

		if (executors.length === 0) {
			throw new Error("No execution providers are enabled.");
		}

		for (const executorRow of executors) {
			const adapter = this.adapters.get(executorRow.code);

			// A database entry alone does not mean we have implemented
			// the provider's API adapter.
			if (!adapter) continue;

			const mapping = mappings.find(
				row => row.executor_id === executorRow.id,
			);

			if (!mapping) continue;

			return {
				executorId: executorRow.id,
				executorCode: executorRow.code,
				executorName: executorRow.name,
				languageId: mapping.language_id,
				compilerId: mapping.compiler_id,
				runtimeVersion: mapping.runtime_version,
				executor: adapter,
			};
		}

		throw new Error(
			"No implemented execution provider supports this language.",
		);
	}
}

