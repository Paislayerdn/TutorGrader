import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Admin } from "@/domain/user/Admin";
import { LanguageRepository } from "@/domain/language/LanguageRepository";
import { ProblemRepository } from "@/domain/problem/ProblemRepository";

import CreateProblemForm from "../../create/CreateProblemForm";
import styles from "../../create/page.module.css";

type Props = {
	params: Promise<{
		id: string;
	}>;
};

type DraftRow = {
	problem_id: number;
	version_number: number;
};

export default async function EditProblemPage({ params }: Props) {
	const user = await getCurrentUser();

	if (!(user instanceof Admin)) {
		redirect("/problems");
	}

	const { id } = await params;
	const problemId = Number(id);

	if (!Number.isSafeInteger(problemId) || problemId <= 0) {
		notFound();
	}

	const { data, error } = await supabaseAdmin.rpc(
		"create_problem_edit_draft",
		{
			p_problem_id: problemId,
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
		draft.problem_id !== problemId ||
		!Number.isSafeInteger(draft.version_number)
	) {
		notFound();
	}

	const problemRepository = new ProblemRepository();
	const problem = await problemRepository.findById(problemId);

	if (!problem) {
		notFound();
	}

	const version = problem.getVersion(draft.version_number);

	if (!version) {
		notFound();
	}

	const languageRepository = new LanguageRepository();
	const languages = await languageRepository.findAll();

	const initialData = {
		problemId,
		versionNumber: version.versionNumber,
		name: version.name,
		description: version.description ?? "",
		difficulty: version.difficulty ?? "",
		timeLimitMs: version.timeLimitMs,
		memoryLimitKb: version.memoryLimitKb,
		outputComparison: version.outputComparison,
		languageIds: version.languages.map((language) => language.id),
		requirements: version.requirements,
		testCases: version.testCases.map((testCase) => ({
			input: testCase.input,
			expectedOutput: testCase.expectedOutput,
		})),
		attachments: version.stuffs.map((stuff) => ({
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
					languages={languages.map((language) => ({
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
