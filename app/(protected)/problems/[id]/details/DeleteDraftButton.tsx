"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./page.module.css";

type Props = {
	problemId: number;
};

export default function DeleteDraftButton({ problemId }: Props) {
	const router = useRouter();

	const [isDeleting, setIsDeleting] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [error, setError] = useState("");

	function handleOpenConfirm() {
		setError("");
		setShowConfirm(true);
	}

	function handleCloseConfirm() {
		if (isDeleting) return;

		setShowConfirm(false);
	}

	async function handleDelete() {
		if (isDeleting) return;

		setIsDeleting(true);
		setError("");

		try {
			const response = await fetch(
				`/api/problems/${problemId}/delete`,
				{
					method: "DELETE",
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
						: "Unable to delete problem draft.";

				throw new Error(message);
			}

			router.push("/problems");
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "An unexpected error occurred.",
			);
			setIsDeleting(false);
		}
	}

	return (
		<>
			<div className={styles.deleteDraftContainer}>
				<button
					type="button"
					className={styles.deleteDraftButton}
					onClick={handleOpenConfirm}
					disabled={isDeleting}
				>
					Delete Draft
				</button>

				{error && (
					<p className={styles.deleteDraftError}>
						{error}
					</p>
				)}
			</div>

			{showConfirm && (
				<div
					className={styles.modalOverlay}
					onClick={handleCloseConfirm}
				>
					<div
						className={styles.modal}
						onClick={event => event.stopPropagation()}
					>
						<h2>Delete draft?</h2>

						<p>
							This will permanently delete this problem,
							its data, and all attached files.
						</p>

						<p>
							This action cannot be undone.
						</p>

						<div className={styles.modalActions}>
							<button
								type="button"
								className={styles.modalCancelButton}
								onClick={handleCloseConfirm}
								disabled={isDeleting}
							>
								Cancel
							</button>

							<button
								type="button"
								className={styles.modalDeleteButton}
								onClick={handleDelete}
								disabled={isDeleting}
							>
								{isDeleting ? "Deleting..." : "Delete"}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
