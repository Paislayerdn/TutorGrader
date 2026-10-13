import { supabaseAdmin } from "@/lib/supabase-admin";

import { LanguageRepository } from "@/domain/language/LanguageRepository";
import { StuffRepository } from "@/domain/stuff/StuffRepository";

import { ProblemVersion } from "./ProblemVersion";
import { ProblemVersionStatus } from "./ProblemVersionStatus";
import { OutputComparison } from "./OutputComparison";
import { TestCase } from "../TestCase";

type ProblemVersionRow = {
	problem_id: number;
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
	language_id: number;
};

type RequirementRow = {
	requirement: string;
};

type TestCaseRow = {
	order: number;
	test_case_id: number;
	test_case: {
		input: string;
		expected_output: string;
	} | {
		input: string;
		expected_output: string;
	}[] | null;
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
		problemId: number,
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
			requirementResult,
			testCaseResult,
			stuffResult,
		] = await Promise.all([
			supabaseAdmin
				.from("problem_version_language")
				.select("language_id")
				.eq("problem_id", problemId)
				.eq("version_number", versionNumber),

			supabaseAdmin
				.from("problem_version_requirement")
				.select("requirement")
				.eq("problem_id", problemId)
				.eq("version_number", versionNumber),

			supabaseAdmin
				.from("problem_version_test_case")
				.select(`
					"order",
					test_case_id,
					test_case (
						input,
						expected_output
					)
				`)
				.eq("problem_id", problemId)
				.eq("version_number", versionNumber)
				.order("order", { ascending: true }),

			supabaseAdmin
				.from("problem_version_stuff")
				.select("stuff_id")
				.eq("problem_id", problemId)
				.eq("version_number", versionNumber),
		]);

		if (
			languageResult.error ||
			requirementResult.error ||
			testCaseResult.error ||
			stuffResult.error
		) {
			console.error("Problem version relationship lookup error:", {
				languages: languageResult.error,
				requirements: requirementResult.error,
				testCases: testCaseResult.error,
				stuffs: stuffResult.error,
			});
			throw new Error("Unable to load problem version details.");
		}

		const languageIds = (
			languageResult.data as LanguageRow[]
		).map(item => item.language_id);

		const languages = await this.languageRepository.findAll();
		const selectedLanguages = languages.filter(
			language => languageIds.includes(language.id),
		);

		const requirements = (
			requirementResult.data as RequirementRow[]
		).map(item => item.requirement);

		const testCaseRows = testCaseResult.data as TestCaseRow[];

		const testCases = testCaseRows.map(item => {
			const testCase = Array.isArray(item.test_case)
				? item.test_case[0]
				: item.test_case;

			if (!testCase) {
				throw new Error("Unable to load problem version test cases.");
			}

			return new TestCase(
				testCase.input,
				testCase.expected_output,
			);
		});

		const stuffIds = (
			stuffResult.data as StuffRow[]
		).map(item => item.stuff_id);

		const stuffs = await Promise.all(
			stuffIds.map(id => this.stuffRepository.findById(id)),
		);

		if (stuffs.some(stuff => stuff === null)) {
			throw new Error("Unable to load problem version attachments.");
		}

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
			selectedLanguages,
			requirements,
			testCases,
			stuffs.filter(stuff => stuff !== null),
		);
	}
	
	async findProblemVersions(problemId: number): Promise<ProblemVersion[]> {
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
