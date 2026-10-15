import { notFound, redirect } from "next/navigation";

import { getCurrentVisitor } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Admin } from "@/domain/user/Admin";
import { LanguageRepository } from "@/domain/language/LanguageRepository";
import { ProblemRepository } from "@/domain/problem/ProblemRepository";
import { isUuid } from "@/lib/isUuid";

import CreateProblemForm from "../../create/CreateProblemForm";
import styles from "../../create/page.module.css";

type Props = {
	params: Promise<{
		id: string;
	}>;
};

type DraftRow = {
	problem_id: string;
	version_number: number;
};

type TestCaseRow = {
	input: string;
	expected_output: string;
};

export default async function EditProblemPage({ params }: Props) {
	const user = await getCurrentVisitor();

	if (!(user instanceof Admin)) {
		redirect("/problems");
	}

	const { id } = await params;

	if (!isUuid(id)) {
		notFound();
	}

	const { data, error } = await supabaseAdmin.rpc(
		"create_problem_edit_draft",
		{
			p_problem_id: id,
		},
	);

	if (error) {
		console.error("Unable to prepare problem edit draft:", {
			message: error.message,
			code: error.code,
			details: error.details,
			hint: error.hint,
		});

		notFound();
	}

	const draftRows = (data ?? []) as DraftRow[];
	const draft = draftRows[0];

	if (
		!draft ||
		draft.problem_id !== id ||
		!Number.isSafeInteger(draft.version_number)
	) {
		notFound();
	}

	const problemRepository = new ProblemRepository();
	const problem = await problemRepository.findById(id);

	if (!problem) {
		notFound();
	}

	const version =
		problem.draft?.versionNumber === draft.version_number
			? problem.draft
			: null;

	if (!version) {
		notFound();
	}

	const { data: testCaseRows, error: testCaseError } =
		await supabaseAdmin
			.from("problem_version_test_case")
			.select(`
				test_case (
					input,
					expected_output
				)
			`)
			.eq("problem_id", id)
			.eq("version_number", draft.version_number)
			.order("order", { ascending: true });

	if (testCaseError) {
		console.error("Unable to load draft test cases:", testCaseError);
		notFound();
	}

	const testCases = ((testCaseRows ?? []) as Array<{
		test_case:
			| TestCaseRow
			| TestCaseRow[]
			| null;
	}>).flatMap(row => {
		if (!row.test_case) return [];
		return Array.isArray(row.test_case)
			? row.test_case
			: [row.test_case];
	});

	const languageRepository = new LanguageRepository();
	const languages = await languageRepository.findAll();

	const initialData = {
		problemId: id,
		versionNumber: version.versionNumber,
		name: version.name,
		description: version.description ?? "",
		difficulty: version.difficulty ?? "",
		timeLimitMs: version.timeLimitMs,
		memoryLimitKb: version.memoryLimitKb,
		outputComparison: version.outputComparison,
		languageIds: version.languages.map(language => language.id),
		testCases: testCases.map(testCase => ({
			input: testCase.input,
			expectedOutput: testCase.expected_output,
		})),
		attachments: version.stuffs.map(stuff => ({
			id: stuff.id,
			filename:
				stuff.storagePath
					.replace(/\\/g, "/")
					.split("/")
					.pop() || "attachment",
		})),
	};

	return (
		<main className={styles.page}>
			<section className={styles.content}>
				<h1>Edit Problem</h1>

				<p className={styles.description}>
					Edit the draft for this problem. Published versions remain
					unchanged until the draft is published.
				</p>

				<CreateProblemForm
					languages={languages.map(language => ({
						id: language.id,
						name: language.name,
						extensions: language.extensions,
					}))}
					initialData={initialData}
				/>
			</section>
		</main>
	);
}
