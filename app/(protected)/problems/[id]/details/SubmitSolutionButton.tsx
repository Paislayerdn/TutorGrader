"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/web/http/api-client";
import { useApiAction } from "@/web/http/useApiAction";
import Modal from "@/components/Modal";

import styles from "./SubmitSolutionButton.module.css";

type Props = {
	problemId: string;
	extensions: string[];
	hasInProgressSubmission: boolean;
};

export default function SubmitSolutionButton({
	problemId,
	extensions,
	hasInProgressSubmission,
}: Props) {
	const router = useRouter();

	const [isOpen, setIsOpen] = useState(false);
	const [file, setFile] = useState<File | null>(null);
	const [validationError, setValidationError] = useState<string | null>(null);
	const { run, isRunning: isSubmitting, error: actionError, clearError } = useApiAction();
	const error = actionError || validationError;

	function open() {
		setValidationError(null);
		clearError();
		setFile(null);
		setIsOpen(true);
	}

	function close() {
		if (isSubmitting) {
			return;
		}

		setIsOpen(false);
		setValidationError(null);
		clearError();
		setFile(null);
	}

	async function submit() {
		if (!file) {
			setValidationError("Please select a source file.");
			return;
		}

		setValidationError(null);
		clearError();

		const formData = new FormData();
		formData.append("problemId", problemId);
		formData.append("file", file);

		try {
			await run(() => apiFetch("/api/submissions", {
				method: "POST",
				body: formData,
			}, "Unable to submit solution."));

			setIsOpen(false);
			setFile(null);

			router.refresh();
		} catch { /* useApiAction stores the error for rendering. */ }
	}

	return (
		<>
			<button
				type="button"
				className={styles.submitButton}
				disabled={hasInProgressSubmission}
				title={hasInProgressSubmission
					? "Wait for your queued or evaluating submission to finish."
					: undefined}
				onClick={open}
			>
				{hasInProgressSubmission ? "Submission in Progress" : "Submit Solution"}
			</button>
			{hasInProgressSubmission && (
				<p className={styles.inProgressMessage} role="status">
					Wait for your queued or evaluating submission to finish.
				</p>
			)}

			{isOpen && (
				<Modal
					onClose={close}
					closingDisabled={isSubmitting}
					overlayClassName={styles.overlay}
					modalClassName={styles.modal}
					labelledBy="submit-solution-title"
				>
						<header className={styles.header}>
							<div>
								<p className={styles.eyebrow}>
									SUBMISSION
								</p>

								<h2 id="submit-solution-title">
									Submit Solution
								</h2>
							</div>

							<button
								type="button"
								className={styles.closeButton}
								onClick={close}
								disabled={isSubmitting}
								aria-label="Close submission form"
							>
								×
							</button>
						</header>

						<div className={styles.body}>
							<p>
								Upload your source file. The language will be
								detected from the file extension.
							</p>

							<label className={styles.fileLabel}>
								<span>Source file</span>

								<input
									type="file"
									accept={extensions
										.map(extension => `.${extension}`)
										.join(",")}
									disabled={isSubmitting}
									onChange={event => {
										setValidationError(null);
										clearError();
										setFile(
											event.target.files?.[0] ?? null,
										);
									}}
								/>
							</label>

							{file && (
								<p className={styles.selectedFile}>
									Selected: {file.name}
								</p>
							)}

							{error && (
								<p className={styles.error} role="alert">
									{error}
								</p>
							)}

							<div className={styles.actions}>
								<button
									type="button"
									className={styles.cancelButton}
									onClick={close}
									disabled={isSubmitting}
								>
									Cancel
								</button>

								<button
									type="button"
									className={styles.submitModalButton}
									onClick={submit}
									disabled={isSubmitting}
								>
									{isSubmitting
										? "Submitting…"
										: "Submit"}
								</button>
							</div>
						</div>
				</Modal>
			)}
		</>
	);
}
