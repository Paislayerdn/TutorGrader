"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ProblemStatus } from "@/domain/problem/ProblemStatus";

import styles from "./page.module.css";

type Props = {
	problemId: string;
	currentStatus: ProblemStatus;
};

export default function ChangeProblemStatus({
	problemId,
	currentStatus,
}: Props) {
	const router = useRouter();

	const [status, setStatus] = useState(currentStatus);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");

	async function handleChange(nextStatus: ProblemStatus) {
		if (isSaving || nextStatus === status) return;

		const previousStatus = status;

		setStatus(nextStatus);
		setIsSaving(true);
		setError("");

		try {
			const response = await fetch(
				`/api/problems/${problemId}/status`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ status: nextStatus }),
				},
			);

			const result: unknown = await response.json();

			if (!response.ok) {
				const message =
					typeof result === "object" &&
					result !== null &&
					"error" in result &&
					typeof result.error === "string"
						? result.error
						: "Unable to update problem status.";

				throw new Error(message);
			}

			router.refresh();
		} catch (error) {
			setStatus(previousStatus);

			setError(
				error instanceof Error
					? error.message
					: "An unexpected error occurred.",
			);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<div className={styles.statusEditor}>
			<select
				className={styles.statusSelect}
				value={status}
				onChange={event =>
					handleChange(event.target.value as ProblemStatus)
				}
				disabled={isSaving}
				aria-label="Problem status"
			>
				<option value={ProblemStatus.ACTIVE}>ACTIVE</option>
				<option value={ProblemStatus.FIXING}>FIXING</option>
				<option value={ProblemStatus.INACTIVE}>INACTIVE</option>
			</select>

			{error && (
				<p className={styles.statusError}>
					{error}
				</p>
			)}
		</div>
	);
}
