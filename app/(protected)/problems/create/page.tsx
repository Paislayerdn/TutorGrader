import { redirect } from "next/navigation";

import { getCurrentVisitor } from "@/lib/auth";
import { LanguageRepo } from "@/data/supabase/repositories/LanguageRepo";

import CreateProblemForm from "./CreateProblemForm";
import PageFrame from "@/components/PageFrame";
import styles from "./page.module.css";


export default async function CreateProblemPage() {
	const user = await getCurrentVisitor();

	if (!user.canManageProblems) {
		redirect("/problems");
	}

	const languageRepo = new LanguageRepo();
	const languages = await languageRepo.findAll();

	return (
		<PageFrame pageClassName={styles.page} contentClassName={styles.content}>
				<h1>Create Problem</h1>

				<p className={styles.description}>
					Create a new programming problem. You can publish it
					when the draft is ready.
				</p>

				<CreateProblemForm
					languages={languages.map(language => ({
						id: language.id,
						name: language.name,
						extensions: language.extensions,
					}))}
				/>
		</PageFrame>
	);
}
