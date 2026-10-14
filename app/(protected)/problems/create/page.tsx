import { redirect } from "next/navigation";

import { getCurrentVisitor } from "@/lib/auth";
import { LanguageRepository } from "@/domain/language/LanguageRepository";

import CreateProblemForm from "./CreateProblemForm";
import styles from "./page.module.css";

import { Admin } from "@/domain/user/Admin";

export default async function CreateProblemPage() {
	const user = await getCurrentVisitor();

	if (!(user instanceof Admin)) {
		redirect("/problems");
	}

	const languageRepository = new LanguageRepository();
	const languages = await languageRepository.findAll();

	return (
		<main className={styles.page}>
			<section className={styles.content}>
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
			</section>
		</main>
	);
}
