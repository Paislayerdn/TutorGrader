"use client";

import { useState } from "react";

import styles from "./GCButton.module.css";

export default function GCButton() {
	const [running, setRunning] = useState(false);
	const [message, setMessage] = useState("");
	const [result, setResult] = useState("");

	async function runGC() {
		if (
			!window.confirm(
				"Run garbage collection? Unreferenced canonical records and eligible Storage files may be permanently deleted.",
			)
		) {
			return;
		}

		setRunning(true);
		setMessage("");
		setResult("");

		try {
			const response = await fetch(
				"/api/owner/gc",
				{
					method: "POST",
				},
			);

			const body: unknown = await response.json();

			setMessage(
				response.status === 207
					? "Cleanup partially completed. Review the details below."
					: response.ok
						? "Garbage collection finished. Review the results below."
						: `Garbage collection failed (HTTP ${response.status}).`,
			);

			setResult(JSON.stringify(body, null, 2));
		} catch {
			setMessage("Unable to contact the server.");
		} finally {
			setRunning(false);
		}
	}

	return (
		<div className={styles.container}>
			<button
				type="button"
				className={styles.button}
				onClick={runGC}
				disabled={running}
			>
				{running
					? "Collecting garbage..."
					: "Run Garbage Collector"}
			</button>

			{message && (
				<aside className={styles.result} role="status" aria-live="polite">
					<div className={styles.resultHeader}>
						<strong>{message}</strong>
						<button
							type="button"
							className={styles.closeButton}
							aria-label="Close garbage collection results"
							onClick={() => {
								setMessage("");
								setResult("");
							}}
						>
							×
						</button>
					</div>

					{result && <pre>{result}</pre>}
				</aside>
			)}
		</div>
	);
}
