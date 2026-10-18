
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/web/http/api-client";
import { useApiAction } from "@/web/http/useApiAction";
import Modal from "@/components/Modal";

import styles from "./page.module.css";

type Props = {
	problemId: string;
	isPublished: boolean;
	returnToProblems?: boolean;
};

export default function DeleteDraftButton({
	problemId,
	isPublished,
	returnToProblems = false,
}: Props) {
	const router = useRouter();

	const [showConfirm, setShowConfirm] = useState(false);
	const { run, isRunning: isDeleting, error, clearError } = useApiAction();

	function handleOpenConfirm() {
		clearError();
		setShowConfirm(true);
	}

	function handleCloseConfirm() {
		if (isDeleting) return;

		setShowConfirm(false);
	}

	async function handleDelete() {
		if (isDeleting) return;

		try {
			await run(() => apiFetch(
				`/api/problems/${problemId}/delete`,
				{
					method: "DELETE",
				},
				"Unable to delete problem draft.",
			));

			router.push(
				returnToProblems
					? "/problems"
					: isPublished
						? `/problems/${problemId}/details`
						: "/problems",
			);
			router.refresh();
		} catch { /* useApiAction stores the error for rendering. */ }
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
				<Modal
					onClose={handleCloseConfirm}
					closingDisabled={isDeleting}
					overlayClassName={styles.modalOverlay}
					modalClassName={styles.modal}
					labelledBy="delete-draft-title"
				>
						<h2 id="delete-draft-title">Delete draft?</h2>

						<p>
							{isPublished
								? "This will permanently delete the unpublished changes. The currently published version will remain unchanged."
								: "This will permanently delete this problem, its draft, and its attached files."}
						</p>

						<p>This action cannot be undone.</p>

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
				</Modal>
			)}
		</>
	);
}
