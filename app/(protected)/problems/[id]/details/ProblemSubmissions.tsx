import type { SubmissionHistoryGroup } from "@/domain/submission/SubmissionHistoryRepository";

import SubmissionList from "@/components/SubmissionList";

import styles from "./ProblemSubmissions.module.css";

type Props = {
	group: SubmissionHistoryGroup | null;
};

export default function ProblemSubmissions({ group }: Props) {
	return (
		<section className={styles.section}>
			<h2>Your Submissions</h2>

			{group ? (
				<SubmissionList submissions={group.submissions} />
			) : (
				<p className={styles.empty}>
					You have not submitted a solution to this problem yet.
				</p>
			)}
		</section>
	);
}
