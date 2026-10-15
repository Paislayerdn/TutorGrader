import { supabaseAdmin } from "@/lib/supabase-admin";

import { LanguageRepository } from "@/domain/language/LanguageRepository";
import { StuffRepository } from "@/domain/stuff/StuffRepository";

import { ProblemVersion } from "./ProblemVersion";
import { ProblemVersionStatus } from "./ProblemVersionStatus";
import { OutputComparison } from "./OutputComparison";

type ProblemVersionRow = {
	problem_id: string;
	version_number: number;
	status: "DRAFT" | "PUBLISHED";
	name: string;
	description: string | null;
	difficulty: string | null;
	time_limit_ms: number;
	memory_limit_kb: number;
	output_comparison: "EXACT" | "TRIM" | "FREE";
	created_at: string;
	published_by: string | null;
	published_at: string | null;
};

type LanguageRow = {
	language: string;
};

type StuffRow = {
	stuff_id: string;
};

export class ProblemVersionRepository {
	private static readonly VERSION_COLUMNS =
		"problem_id, version_number, status, name, description, difficulty, time_limit_ms, memory_limit_kb, output_comparison, created_at, published_by, published_at";

	private readonly languageRepository = new LanguageRepository();
	private readonly stuffRepository = new StuffRepository();

	async findProblemVersion(
		problemId: string,
		versionNumber: number,
	): Promise<ProblemVersion | null> {
		const { data, error } = await supabaseAdmin
			.from("problem_version")
			.select(ProblemVersionRepository.VERSION_COLUMNS)
			.eq("problem_id", problemId)
			.eq("version_number", versionNumber)
			.maybeSingle();

		if (error) {
			console.error("Problem version lookup error:", error);
			throw new Error("Unable to load problem version.");
		}

		if (!data) return null;

		const row = data as ProblemVersionRow;

		const [
			languageResult,
			stuffResult,
		] = await Promise.all([
			supabaseAdmin
				.from("problem_version_language_view")
				.select("language")
				.eq("problem_id", problemId)
				.eq("version_number", versionNumber),

			supabaseAdmin
				.from("problem_version_stuff_view")
				.select("stuff_id")
				.eq("problem_id", problemId)
				.eq("version_number", versionNumber),
		]);

		if (
			languageResult.error
			|| stuffResult.error
		) {
			console.error("Problem version relationship lookup error:", {
				languages: languageResult.error,
				stuffs: stuffResult.error,
			});
			throw new Error("Unable to load problem version details.");
		}

		const selectedLanguages = (
			languageResult.data as LanguageRow[]
		).map(row => row.language);

		const stuffIds = (
			stuffResult.data as StuffRow[]
		).map(item => item.stuff_id);

		const stuffs = await Promise.all(
			stuffIds.map(id => this.stuffRepository.findById(id)),
		);

		if (stuffs.some(stuff => stuff === null)) {
			throw new Error("Unable to load problem version attachments.");
		}

		const languages = await this.languageRepository.findAll();
		const languageByName = new Map(
			languages.map(language => [language.name, language]),
		);

		const resolvedLanguages = selectedLanguages
			.map(name => languageByName.get(name))
			.filter(language => language !== undefined);

		return new ProblemVersion(
			row.problem_id,
			row.version_number,
			row.status as ProblemVersionStatus,
			row.name,
			row.description,
			row.difficulty,
			row.time_limit_ms,
			row.memory_limit_kb,
			row.output_comparison as OutputComparison,
			new Date(row.created_at),
			row.published_by,
			row.published_at
				? new Date(row.published_at)
				: null,
			resolvedLanguages,
			stuffs.filter(stuff => stuff !== null),
		);
	}

	async findProblemVersions(
		problemId: string,
	): Promise<ProblemVersion[]> {
		const { data, error } = await supabaseAdmin
			.from("problem_version")
			.select("version_number")
			.eq("problem_id", problemId)
			.order("version_number", { ascending: true });

		if (error) {
			console.error("Problem version list lookup error:", error);
			throw new Error("Unable to load problem versions.");
		}

		const versions = await Promise.all(
			data.map(row =>
				this.findProblemVersion(problemId, row.version_number),
			),
		);

		if (versions.some(version => version === null)) {
			throw new Error("Unable to load problem versions.");
		}

		return versions.filter(
			(version): version is ProblemVersion => version !== null,
		);
	}
}
