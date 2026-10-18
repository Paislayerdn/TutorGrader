"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ProblemStatus } from "@/domain/problem/ProblemStatus";

import styles from "./page.module.css";
import { apiFetch } from "@/web/http/api-client";
import { useApiAction } from "@/web/http/useApiAction";

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
	const { run, isRunning: isSaving, error } = useApiAction();

	async function handleChange(nextStatus: ProblemStatus) {
		if (isSaving || nextStatus === status) return;

		const previousStatus = status;

		setStatus(nextStatus);
		try {
			await run(() => apiFetch(
				`/api/problems/${problemId}/status`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ status: nextStatus }),
				},
				"Unable to update problem status.",
			));

			router.refresh();
		} catch {
			setStatus(previousStatus);
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
