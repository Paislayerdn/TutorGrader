"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./SubmitSolutionButton.module.css";

type Props = {
	problemId: string;
	extensions: string[];
};

export default function SubmitSolutionButton({
	problemId,
	extensions,
}: Props) {
	const router = useRouter();

	const [isOpen, setIsOpen] = useState(false);
	const [file, setFile] = useState<File | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	function open() {
		setError(null);
		setFile(null);
		setIsOpen(true);
	}

	function close() {
		if (isSubmitting) {
			return;
		}

		setIsOpen(false);
		setError(null);
		setFile(null);
	}

	async function submit() {
		if (!file) {
			setError("Please select a source file.");
			return;
		}

		setError(null);
		setIsSubmitting(true);

		const formData = new FormData();
		formData.append("problemId", problemId);
		formData.append("file", file);

		try {
			const response = await fetch("/api/submissions", {
				method: "POST",
				body: formData,
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.error ?? "Unable to submit solution.");
				return;
			}

			setIsOpen(false);
			setFile(null);

			router.refresh();
		} catch {
			setError("Unable to submit solution.");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<>
			<button
				type="button"
				className={styles.submitButton}
				onClick={open}
			>
				Submit Solution
			</button>

			{isOpen && (
				<div
					className={styles.overlay}
					role="presentation"
					onMouseDown={event => {
						if (
							event.target === event.currentTarget &&
							!isSubmitting
						) {
							close();
						}
					}}
				>
					<section
						className={styles.modal}
						role="dialog"
						aria-modal="true"
						aria-labelledby="submit-solution-title"
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
										setError(null);
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
					</section>
				</div>
			)}
		</>
	);
}
