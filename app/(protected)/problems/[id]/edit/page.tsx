import { notFound, redirect } from "next/navigation";

import { getCurrentVisitor } from "@/lib/auth";
import { LanguageRepo } from "@/data/supabase/repositories/LanguageRepo";
import { ProblemRepo } from "@/data/supabase/repositories/ProblemRepo";
import { isUuid } from "@/lib/isUuid";

import CreateProblemForm from "../../create/CreateProblemForm";
import styles from "../../create/page.module.css";

type Props = {
	params: Promise<{
		id: string;
	}>;
};

export default async function EditProblemPage({ params }: Props) {
	const user = await getCurrentVisitor();

	if (!user.canManageProblems) {
		redirect("/problems");
	}

	const { id } = await params;

	if (!isUuid(id)) {
		notFound();
	}

	const problemRepo = new ProblemRepo();
	let version;
	try {
		version = await problemRepo.openDraftForEditing(id);
	} catch (error) {
		console.error("Unable to prepare problem edit draft:", error);
		notFound();
	}
	let testCases;
	try {
		testCases = await problemRepo.findTestCases(id, version.versionNumber);
	} catch (error) {
		console.error("Unable to load draft test cases:", error);
		notFound();
	}

	const languageRepo = new LanguageRepo();
	const languages = await languageRepo.findAll();

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
			expectedOutput: testCase.expectedOutput,
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
