"use client";

import { useEffect, useState } from "react";

import type { SubmissionHistoryItem } from "@/domain/submission/SubmissionHistoryRepository";

import SubmissionDetailsModal from "./SubmissionDetailsModal";
import styles from "./SubmissionList.module.css";

type Props = {
	submissions: SubmissionHistoryItem[];
};

function formatDate(value: string): string {
	return `${new Date(value)
		.toISOString()
		.slice(0, 16)
		.replace("T", " ")} UTC`;
}

function getSubmissionLabel(
	submission: SubmissionHistoryItem,
): string {
	return submission.testResults.length > 0 &&
		submission.testResults.every(result => result.status === "PASS")
		? "Complete"
		: "Incomplete";
}

function getPassedCount(submission: SubmissionHistoryItem): number {
	return submission.testResults.filter(
		result => result.status === "PASS",
	).length;
}

export default function SubmissionList({ submissions }: Props) {
	const [selected, setSelected] =
		useState<SubmissionHistoryItem | null>(null);

	useEffect(() => {
		if (!selected) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setSelected(null);
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [selected]);

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
								{submission.languageName}
								{" · "}
								{formatDate(submission.submittedAt)}
							</span>
						</div>

						<div className={styles.right}>
							<span
								className={styles.status}
								data-status={
									getSubmissionLabel(submission) === "Complete"
										? "COMPLETED"
										: "INCOMPLETE"
								}
							>
								{getSubmissionLabel(submission)}
							</span>

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
