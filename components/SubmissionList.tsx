"use client";

import { useState } from "react";

import type { SubmissionHistoryItem } from "@/data/supabase/repositories/SubmissionHistoryRepo";

import StatusBadge from "./StatusBadge";
import SubmissionDetailsModal from "./SubmissionDetailsModal";
import { formatSubmissionDate, getPassedCount, getSubmissionLabel, getSubmissionLanguageLabel } from "./submission-formatters";
import styles from "./SubmissionList.module.css";

type Props = {
	submissions: SubmissionHistoryItem[];
};

export default function SubmissionList({ submissions }: Props) {
	const [selected, setSelected] =
		useState<SubmissionHistoryItem | null>(null);

	if (submissions.length === 0) {
		return (
			<p className={styles.empty}>
				No submissions yet.
			</p>
		);
	}

	return (
		<>
			<div className={styles.list}>
				{submissions.map(submission => (
					<button
						type="button"
						key={submission.id}
						className={styles.row}
						onClick={() => setSelected(submission)}
					>
						<div className={styles.main}>
							<strong
								className={styles.id}
								title={submission.id}
							>
								Submission #{submission.id.slice(0, 6)}…
							</strong>

							<span className={styles.meta}>
								{getSubmissionLanguageLabel(submission)}
								{" · "}
								{formatSubmissionDate(submission.submittedAt)}
							</span>
						</div>

						<div className={styles.right}>
							<StatusBadge status={submission.status}>
								{getSubmissionLabel(submission)}
							</StatusBadge>

							{submission.testResults.length > 0 && (
								<span className={styles.summary}>
									{getPassedCount(submission)}/
									{submission.testResults.length} passed
								</span>
							)}
						</div>
					</button>
				))}
			</div>

			{selected && (
				<SubmissionDetailsModal
					submission={selected}
					onClose={() => setSelected(null)}
				/>
			)}
		</>
	);
}
