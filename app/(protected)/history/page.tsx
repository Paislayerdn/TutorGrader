
import styles from "./page.module.css";

import { requireUser } from "@/lib/auth-guards";
import { SubmissionHistoryRepository } from "@/domain/submission/SubmissionHistoryRepository";
import HistoryClient from "./HistoryClient";

export default async function HistoryPage() {
	const user = await requireUser();
	
	const repository = new SubmissionHistoryRepository();
	const groups = await repository.findHistory(user.id);

	return (

		<main className={styles.page}>
			<section className={styles.content}>
				<header className={styles.header}>
					<div>
						<h1>Submission History</h1>
						<p className={styles.description}>
							Review your attempts and inspect their results.
						</p>
					</div>

					<div className={styles.count}>
						<strong>
							{groups.reduce(
								(total, group) =>
									total + group.submissions.length,
								0,
							)}
						</strong>
						<span>submissions</span>
					</div>
				</header>

				<HistoryClient groups={groups} />
			</section>
		</main>
	);
}

