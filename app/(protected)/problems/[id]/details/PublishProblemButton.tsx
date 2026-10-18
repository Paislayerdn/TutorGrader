
"use client";

import { useRouter } from "next/navigation";
import { apiFetch } from "@/web/http/api-client";
import { useApiAction } from "@/web/http/useApiAction";

import styles from "./page.module.css";

type Props = {
	problemId: string;
};

export default function PublishProblemButton({ problemId }: Props) {
	const router = useRouter();
	const { run, isRunning: isPublishing, error } = useApiAction();

	async function handlePublish() {
		if (isPublishing) return;

		try {
			await run(() => apiFetch(
				`/api/problems/${problemId}/publish`,
				{ method: "POST" },
				"Unable to publish the problem.",
			));

			router.refresh();
		} catch { /* useApiAction stores the error for rendering. */ }
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

