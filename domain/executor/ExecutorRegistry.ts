import { supabaseAdmin } from "@/lib/supabase-admin";

import type { Executor } from "./Executor";
import type { ExecutorSelection } from "./ExecutorSelection";
import { WandboxExecutor } from "./WandboxExecutor";

type ExecutorRow = {
	id: number;
	code: string;
	name: string;
	priority: number;
};

type ExecutorLanguageRow = {
	executor_id: number;
	language_id: number;
	compiler_id: string;
	runtime_version: string;
	enabled: boolean;
	is_default: boolean;
};

export class ExecutorRegistry {
	private readonly adapters = new Map<string, Executor>([
		["wandbox", new WandboxExecutor()],
	]);

	async resolve(languageId: number): Promise<ExecutorSelection> {
		if (!Number.isInteger(languageId) || languageId <= 0) {
			throw new Error("Invalid language ID.");
		}

		const { data: executorRows, error: executorError } =
			await supabaseAdmin
				.from("executor")
				.select("id, code, name, priority")
				.eq("enabled", true)
				.order("priority", { ascending: true });

		if (executorError) {
			console.error("Executor registry lookup failed:", executorError);
			throw new Error("Unable to load execution providers.");
		}

		const executors = (executorRows ?? []) as ExecutorRow[];

		if (executors.length === 0) {
			throw new Error("No execution providers are enabled.");
		}

		const { data: mappingRows, error: mappingError } =
			await supabaseAdmin
				.from("executor_language")
				.select(
					"executor_id, language_id, compiler_id, runtime_version, enabled, is_default",
				)
				.eq("language_id", languageId)
				.eq("enabled", true)
				.eq("is_default", true);

		if (mappingError) {
			console.error("Executor mapping lookup failed:", mappingError);
			throw new Error("Unable to load execution capabilities.");
		}

		const mappings = (mappingRows ?? []) as ExecutorLanguageRow[];

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
