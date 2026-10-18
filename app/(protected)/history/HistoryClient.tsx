"use client";

import { useState } from "react";

import type {
	SubmissionHistoryGroup,
} from "@/data/supabase/repositories/SubmissionHistoryRepo";

import SubmissionList from "@/components/SubmissionList";

import styles from "./page.module.css";

type Props = {
	groups: SubmissionHistoryGroup[];
};

export default function HistoryClient({ groups }: Props) {
	const [expandedProblems, setExpandedProblems] = useState<string[]>([]);

	function toggleProblem(problemId: string) {
		setExpandedProblems(current =>
			current.includes(problemId)
				? current.filter(id => id !== problemId)
				: [...current, problemId],
		);
	}

	if (groups.length === 0) {
		return (
			<section className={styles.emptyState}>
				<div className={styles.emptyIcon} aria-hidden="true">
					↗
				</div>

				<h2>No submissions yet</h2>

				<p>
					You have not submitted any attempts to any problems.
				</p>
			</section>
		);
	}

	return (
		<div className={styles.problemList}>
			{groups.map(group => {
				const expanded = expandedProblems.includes(group.problemId);

				return (
					<article
						key={group.problemId}
						className={styles.problemCard}
					>
						<button
							type="button"
							className={styles.problemToggle}
							onClick={() => toggleProblem(group.problemId)}
							aria-expanded={expanded}
							aria-controls={`history-${group.problemId}`}
						>
							<div className={styles.problemText}>
								<h2>{group.problemName}</h2>

								<p>
									{group.problemDescription ||
										"No description provided."}
								</p>
							</div>

							<div className={styles.problemSummary}>
								<span className={styles.attemptCount}>
									{group.submissions.length}{" "}
									{group.submissions.length === 1
										? "attempt"
										: "attempts"}
								</span>

								<span
									className={styles.chevron}
									data-expanded={expanded}
									aria-hidden="true"
								>
									⌄
								</span>
							</div>
						</button>

						{expanded && (
							<div
								id={`history-${group.problemId}`}
								className={styles.submissionList}
							>
								<SubmissionList submissions={group.submissions} />
							</div>
						)}
					</article>
				);
			})}
		</div>
	);
}
