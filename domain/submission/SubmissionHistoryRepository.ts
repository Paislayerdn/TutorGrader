
import { supabaseAdmin } from "@/lib/supabase-admin";

export type SubmissionHistoryTestResult = {
	testCaseOrder: number;
	status: string;
	executionTimeMs: number | null;
	memoryUsageKb: number | null;
};

export type SubmissionHistoryItem = {
	id: string;
	userId: string;
	username: string;
	problemId: string;
	problemName: string;
	problemDescription: string | null;
	versionNumber: number;
	languageName: string;
	status: string;
	submittedAt: string;
	sourceFilename: string;
	isDemoSource: boolean;
	testResults: SubmissionHistoryTestResult[];
};

export type SubmissionHistoryGroup = {
	problemId: string;
	problemName: string;
	problemDescription: string | null;
	submissions: SubmissionHistoryItem[];
};

type SubmissionRow = {
	id: string;
	user_id: string;
	problem_id: string;
	version_number: number;
	language_id: number;
	status: string;
	submitted_at: string;
	source_stuff_id: string;
};

type VersionRow = {
	problem_id: string;
	version_number: number;
	name: string;
	description: string | null;
};

type ProblemRow = {
	id: string;
	current_version_number: number | null;
};

type LanguageRow = {
	id: number;
	name: string;
};

type UserRow = {
	id: string;
	username: string;
};

type StuffRow = {
	id: string;
	storage_path: string;
};

type TestResultRow = {
	submission_id: string;
	test_case_order: number;
	status: string;
	execution_time_ms: number | null;
	memory_usage_kb: number | null;
};

export class SubmissionHistoryRepository {
	async findHistory(
		userId: string,
		canViewAll: boolean,
	): Promise<SubmissionHistoryGroup[]> {
		let query = supabaseAdmin
			.from("submission")
			.select(
				"id, user_id, problem_id, version_number, language_id, status, submitted_at, source_stuff_id",
			)
			.order("submitted_at", { ascending: false })
			.limit(500);

		if (!canViewAll) {
			query = query.eq("user_id", userId);
		}

		const { data: submissionData, error: submissionError } = await query;

		if (submissionError) {
			console.error("Submission history lookup failed:", submissionError);
			throw new Error("Unable to load submission history.");
		}

		const submissions = (submissionData ?? []) as SubmissionRow[];

		if (submissions.length === 0) {
			return [];
		}

		const problemIds = [...new Set(submissions.map(row => row.problem_id))];
		const submissionIds = submissions.map(row => row.id);
		const languageIds = [
			...new Set(submissions.map(row => row.language_id)),
		];
		const userIds = [...new Set(submissions.map(row => row.user_id))];
		const stuffIds = [
			...new Set(submissions.map(row => row.source_stuff_id)),
		];

		const [
			versionResult,
			problemResult,
			languageResult,
			userResult,
			stuffResult,
			testResult,
		] = await Promise.all([
			supabaseAdmin
				.from("problem_version")
				.select("problem_id, version_number, name, description")
				.in("problem_id", problemIds),

			supabaseAdmin
				.from("problem")
				.select("id, current_version_number")
				.in("id", problemIds),

			supabaseAdmin
				.from("language")
				.select("id, name")
				.in("id", languageIds),

			supabaseAdmin
				.from("app_user")
				.select("id, username")
				.in("id", userIds),

			supabaseAdmin
				.from("stuff")
				.select("id, storage_path")
				.in("id", stuffIds),

			supabaseAdmin
				.from("test_result")
				.select(
					"submission_id, test_case_order, status, execution_time_ms, memory_usage_kb",
				)
				.in("submission_id", submissionIds)
				.order("test_case_order", { ascending: true }),
		]);

		if (
			versionResult.error ||
			problemResult.error ||
			languageResult.error ||
			userResult.error ||
			stuffResult.error ||
			testResult.error
		) {
			console.error("Submission history relationship lookup failed.");
			throw new Error("Unable to load submission history details.");
		}

		const versions = (versionResult.data ?? []) as VersionRow[];
		const problems = (problemResult.data ?? []) as ProblemRow[];
		const languages = (languageResult.data ?? []) as LanguageRow[];
		const users = (userResult.data ?? []) as UserRow[];
		const stuffs = (stuffResult.data ?? []) as StuffRow[];
		const testResults = (testResult.data ?? []) as TestResultRow[];

		const versionByKey = new Map(
			versions.map(version => [
				`${version.problem_id}:${version.version_number}`,
				version,
			]),
		);

		const currentVersionByProblem = new Map(
			problems.map(problem => [
				problem.id,
				problem.current_version_number,
			]),
		);

		const languageById = new Map(
			languages.map(language => [language.id, language.name]),
		);

		const usernameById = new Map(
			users.map(user => [user.id, user.username]),
		);

		const stuffById = new Map(
			stuffs.map(stuff => [stuff.id, stuff]),
		);

		const resultsBySubmission = new Map<
			string,
			SubmissionHistoryTestResult[]
		>();

		for (const result of testResults) {
			const results = resultsBySubmission.get(result.submission_id) ?? [];

			results.push({
				testCaseOrder: result.test_case_order,
				status: result.status,
				executionTimeMs: result.execution_time_ms,
				memoryUsageKb: result.memory_usage_kb,
			});

			resultsBySubmission.set(result.submission_id, results);
		}

		const groupsByProblem = new Map<string, SubmissionHistoryGroup>();

		for (const row of submissions) {
			const submittedVersion = versionByKey.get(
				`${row.problem_id}:${row.version_number}`,
			);

			const currentVersionNumber = currentVersionByProblem.get(
				row.problem_id,
			);

			const currentVersion =
				currentVersionNumber == null
					? undefined
					: versionByKey.get(
							`${row.problem_id}:${currentVersionNumber}`,
						);

			const cardVersion = currentVersion ?? submittedVersion;
			const stuff = stuffById.get(row.source_stuff_id);
			const storagePath = stuff?.storage_path ?? "";
			const sourceFilename =
				storagePath.replace(/\\/g, "/").split("/").pop() ||
				"Source file";

			const item: SubmissionHistoryItem = {
				id: row.id,
				userId: row.user_id,
				username: usernameById.get(row.user_id) ?? "Unknown user",
				problemId: row.problem_id,
				problemName: submittedVersion?.name ?? "Unknown problem",
				problemDescription: submittedVersion?.description ?? null,
				versionNumber: row.version_number,
				languageName: languageById.get(row.language_id) ?? "Unknown",
				status: row.status,
				submittedAt: row.submitted_at,
				sourceFilename,
				isDemoSource: storagePath.startsWith("demo-history/"),
				testResults: resultsBySubmission.get(row.id) ?? [],
			};

			let group = groupsByProblem.get(row.problem_id);

			if (!group) {
				group = {
					problemId: row.problem_id,
					problemName:
						cardVersion?.name ?? item.problemName,
					problemDescription:
						cardVersion?.description ?? item.problemDescription,
					submissions: [],
				};

				groupsByProblem.set(row.problem_id, group);
			}

			group.submissions.push(item);
		}

		return [...groupsByProblem.values()].sort((a, b) => {
			const aDate = a.submissions[0]?.submittedAt ?? "";
			const bDate = b.submissions[0]?.submittedAt ?? "";

			return bDate.localeCompare(aDate);
		});
	}
}

