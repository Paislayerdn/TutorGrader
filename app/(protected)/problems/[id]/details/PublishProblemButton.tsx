
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./page.module.css";

type Props = {
	problemId: string;
};

export default function PublishProblemButton({ problemId }: Props) {
	const router = useRouter();
	const [isPublishing, setIsPublishing] = useState(false);
	const [error, setError] = useState("");

	async function handlePublish() {
		if (isPublishing) return;

		setIsPublishing(true);
		setError("");

		try {
			const response = await fetch(
				`/api/problems/${problemId}/publish`,
				{ method: "POST" },
			);

			const result: unknown = await response.json();

			if (!response.ok) {
				const message =
					typeof result === "object" &&
					result !== null &&
					"error" in result &&
					typeof result.error === "string"
						? result.error
						: "Unable to publish the problem.";

				throw new Error(message);
			}

			router.refresh();
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "An unexpected error occurred.",
			);
		} finally {
			setIsPublishing(false);
		}
	}

	return (
		<div className={styles.publishContainer}>
			<button
				type="button"
				className={styles.publishButton}
				onClick={handlePublish}
				disabled={isPublishing}
			>
				{isPublishing ? "Publishing..." : "Publish Problem"}
			</button>

			{error && <p className={styles.publishError}>{error}</p>}
		</div>
	);
}

