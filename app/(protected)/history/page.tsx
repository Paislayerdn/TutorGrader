
import styles from "./page.module.css";

import { requireUser } from "@/lib/auth-guards";
import { SubmissionHistoryRepo } from "@/data/supabase/repositories/SubmissionHistoryRepo";
import PageFrame from "@/components/PageFrame";
import HistoryClient from "./HistoryClient";

export default async function HistoryPage() {
	const user = await requireUser();
	
	const repository = new SubmissionHistoryRepo();
	const groups = await repository.findHistory(user.id);

	return (

		<PageFrame pageClassName={styles.page} contentClassName={styles.content}>
				<header className={styles.header}>
					<div>
						<h1>Submission History</h1>
						<p className={styles.description}>
							Review your attempts and inspect their results.
						</p>
					</div>

				</header>

				<HistoryClient groups={groups} />
		</PageFrame>
	);
}

