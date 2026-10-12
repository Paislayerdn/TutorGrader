"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import styles from "./CreateProblemForm.module.css";

type LanguageOption = {
	id: number;
	name: string;
	extensions: string[];
};

type TestCaseInput = {
	input: string;
	expectedOutput: string;
};

type AttachmentInput = {
	id: string;
	file: File;
};

type RequirementInput = {
	id: number;
	value: string;
};

type Props = {
	languages: LanguageOption[];
};

export default function CreateProblemForm({ languages }: Props) {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [difficulty, setDifficulty] = useState("");
	const [timeLimitMs, setTimeLimitMs] = useState("1000");
	const [memoryLimitKb, setMemoryLimitKb] = useState("262144");
	const [outputComparison, setOutputComparison] = useState("TRIM");

	const [requirements, setRequirements] = useState<RequirementInput[]>([]);
	const [selectedLanguages, setSelectedLanguages] = useState<number[]>([]);
	const [languageToAdd, setLanguageToAdd] = useState("");

	const [attachments, setAttachments] = useState<AttachmentInput[]>([]);
	const [testCases, setTestCases] = useState<TestCaseInput[]>([
		{ input: "", expectedOutput: "" },
	]);

	const [error, setError] = useState("");
	const [message, setMessage] = useState("");

	function addRequirement() {
		setRequirements(current => [
			...current,
			{ id: Date.now() + Math.random(), value: "" },
		]);
	}

	function updateRequirement(id: number, value: string) {
		setRequirements(current =>
			current.map(item =>
				item.id === id ? { ...item, value } : item,
			),
		);
	}

	function removeRequirement(id: number) {
		setRequirements(current => current.filter(item => item.id !== id));
	}

	function addLanguage() {
		const id = Number(languageToAdd);

		if (!id || selectedLanguages.includes(id)) return;

		setSelectedLanguages(current => [...current, id]);
		setLanguageToAdd("");
	}

	function removeLanguage(id: number) {
		setSelectedLanguages(current =>
			current.filter(languageId => languageId !== id),
		);
	}

	function addAttachments(fileList: FileList | null) {
		if (!fileList) return;

		const accepted: AttachmentInput[] = [];
		const rejected: string[] = [];

		for (const file of Array.from(fileList)) {
			const isPdf = file.type === "application/pdf";
			const isImage = file.type.startsWith("image/");

			if (!isPdf && !isImage) {
				rejected.push(file.name);
				continue;
			}

			accepted.push({
				id: `${file.name}-${file.size}-${Math.random()}`,
				file,
			});
		}

		setAttachments(current => [...current, ...accepted]);

		if (rejected.length > 0) {
			setError(`Only PDF and image files are accepted. Rejected: ${rejected.join(", ")}`,);
		} else {
			setError("");
		}
	}

	function removeAttachment(id: string) {
		setAttachments(current => current.filter(item => item.id !== id));
	}

	function addTestCase() {
		setTestCases(current => [
			...current,
			{ input: "", expectedOutput: "" },
		]);
	}

	function updateTestCase(
		index: number,
		field: keyof TestCaseInput,
		value: string,
	) {
		setTestCases(current =>
			current.map((testCase, i) =>
				i === index ? { ...testCase, [field]: value } : testCase,
			),
		);
	}

	function removeTestCase(index: number) {
		if (index === 0) return;

		setTestCases(current =>
			current.filter((_, i) => i !== index),
		);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError("");
		setMessage("");

		if (isSubmitting) return;

		const trimmedName = name.trim();

		if (!trimmedName) {
			setError("Problem name cannot be empty.");
			return;
		}

		if (selectedLanguages.length === 0) {
			setError("Select at least one supported language.");
			return;
		}

		if (
			timeLimitMs.trim() === "" ||
			memoryLimitKb.trim() === "" ||
			!Number.isSafeInteger(Number(timeLimitMs)) ||
			Number(timeLimitMs) < 0 ||
			!Number.isSafeInteger(Number(memoryLimitKb)) ||
			Number(memoryLimitKb) < 0
		) {
			setError("Time and memory limits must be non-negative integers.");
			return;
		}

		if (attachments.length > 0) {
			setError(
				"File uploads aren't implemented yet. Remove the selected attachments before saving this draft.",
			);
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch("/api/problems", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: trimmedName,
					description: description.trim() || null,
					difficulty: difficulty.trim() || null,
					timeLimitMs: Number(timeLimitMs),
					memoryLimitKb: Number(memoryLimitKb),
					outputComparison,
					languageIds: selectedLanguages,
					requirements: requirements
						.map(requirement => requirement.value.trim())
						.filter(Boolean),
					testCases,
				}),
			});

			const result: unknown = await response.json();

			if (!response.ok) {
				const serverError =
					typeof result === "object" &&
					result !== null &&
					"error" in result &&
					typeof result.error === "string"
						? result.error
						: "Unable to save the problem draft.";

				throw new Error(serverError);
			}

			router.push("/problems");
			router.refresh();
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "An unexpected error occurred while saving the draft.",
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form className={styles.form} onSubmit={handleSubmit}>
			<div className={styles.formBox}>
				<section className={styles.section}>
					<h2>Basic Information</h2>

					<label className={styles.field}>
						<span>Problem name</span>
						<input
							required
							value={name}
							onChange={event => setName(event.target.value)}
							placeholder="e.g. Sum of Two Numbers"
						/>
					</label>

					<label className={styles.field}>
						<span>Description</span>
						<textarea
							rows={7}
							value={description}
							onChange={event => setDescription(event.target.value)}
							placeholder="Describe the problem..."
						/>
					</label>

					<div className={styles.grid}>
						<label className={styles.field}>
							<span>Difficulty</span>
							<input
								value={difficulty}
								onChange={event => setDifficulty(event.target.value)}
								placeholder="e.g. Easy"
							/>
						</label>

						<label className={styles.field}>
							<span>Time limit (milliseconds)</span>
							<input
								type="number"
								min="0"
								required
								value={timeLimitMs}
								onChange={event => setTimeLimitMs(event.target.value)}
							/>
							<p className={styles.hint}>
								0 means unlimited time. The execution provider may still impose
								its own timeout.
							</p>
						</label>

						<label className={styles.field}>
							<span>Memory limit (KB)</span>
							<input
								type="number"
								min="0"
								required
								value={memoryLimitKb}
								onChange={event => setMemoryLimitKb(event.target.value)}
							/>
							<p className={styles.hint}>
								0 means unlimited memory. The execution provider
								may still impose its own memory limit.
							</p>
						</label>

						<label className={styles.field}>
							<span>Output comparison</span>
							<select
								value={outputComparison}
								onChange={event => setOutputComparison(event.target.value)}
							>
								<option value="EXACT">Exact</option>
								<option value="TRIM">Trim whitespace</option>
								<option value="FREE">Free comparison</option>
							</select>
						</label>
					</div>
				</section>

				<section className={styles.section}>
					<h2>Attachments</h2>
					<p className={styles.hint}>
						Add PDF documents or images. Files are currently selected
						locally and have not been uploaded.
					</p>

					<label className={styles.addButton}>
						+ Add file
						<input
							type="file"
							accept=".pdf,image/*"
							multiple
							className={styles.hiddenInput}
							onChange={event => {
								addAttachments(event.target.files);
								event.target.value = "";
							}}
						/>
					</label>

					{attachments.length > 0 && (
						<ul className={styles.itemList}>
							{attachments.map(attachment => (
								<li key={attachment.id} className={styles.item}>
									<span>{attachment.file.name}</span>
									<button
										type="button"
										className={styles.removeButton}
										onClick={() => removeAttachment(attachment.id)}
									>
										Remove
									</button>
								</li>
							))}
						</ul>
					)}
				</section>

				<section className={styles.section}>
					<div className={styles.sectionHeader}>
						<h2>Requirements</h2>
						<button
							type="button"
							className={styles.secondaryButton}
							onClick={addRequirement}
						>
							+ Add requirement
						</button>
					</div>

					{requirements.length === 0 && (
						<p className={styles.hint}>No requirements added.</p>
					)}

					{requirements.map((requirement, index) => (
						<div key={requirement.id} className={styles.itemRow}>
							<input
								aria-label={`Requirement ${index + 1}`}
								value={requirement.value}
								onChange={event =>
									updateRequirement(requirement.id, event.target.value)
								}
								placeholder={`Requirement ${index + 1}`}
							/>
							<button
								type="button"
								className={styles.removeButton}
								onClick={() => removeRequirement(requirement.id)}
							>
								Remove
							</button>
						</div>
					))}
				</section>

				<section className={styles.section}>
					<h2>Supported Languages</h2>

					{selectedLanguages.length > 0 && (
						<ul className={styles.itemList}>
							{selectedLanguages.map(id => {
								const language = languages.find(item => item.id === id);
								if (!language) return null;

								return (
									<li key={id} className={styles.item}>
										<div>
											<strong>{language.name}</strong>
											{language.extensions.length > 0 && (
												<p className={styles.hint}>
													Extensions: {language.extensions.join(", ")}
												</p>
											)}
										</div>

										<button
											type="button"
											className={styles.removeButton}
											onClick={() => removeLanguage(id)}
										>
											Remove
										</button>
									</li>
								);
							})}
						</ul>
					)}

					<div className={styles.itemRow}>
						<select
							aria-label="Language to add"
							value={languageToAdd}
							onChange={event => setLanguageToAdd(event.target.value)}
						>
							<option value="">Choose a language...</option>
							{languages
								.filter(language => !selectedLanguages.includes(language.id))
								.map(language => (
									<option key={language.id} value={language.id}>
										{language.name}
									</option>
								))}
						</select>

						<button
							type="button"
							className={styles.secondaryButton}
							onClick={addLanguage}
							disabled={!languageToAdd}
						>
							+ Add language
						</button>
					</div>
				</section>

				<section className={styles.section}>
					<div className={styles.sectionHeader}>
						<h2>Test Cases</h2>
						<button
							type="button"
							className={styles.secondaryButton}
							onClick={addTestCase}
						>
							+ Add test case
						</button>
					</div>

					{testCases.map((testCase, index) => (
						<article key={index} className={styles.testCase}>
							<h3>Test Case {index + 1}</h3>

							<div className={styles.testCaseGrid}>
								<label className={styles.field}>
									<span>Input</span>
									<textarea
										rows={4}
										value={testCase.input}
										onChange={event =>
											updateTestCase(index, "input", event.target.value)
										}
										placeholder="Test case input..."
									/>
								</label>

								<label className={styles.field}>
									<span>Expected output</span>
									<textarea
										rows={4}
										value={testCase.expectedOutput}
										onChange={event =>
											updateTestCase(
												index,
												"expectedOutput",
												event.target.value,
											)
										}
										placeholder="Expected output..."
									/>
								</label>
							</div>
						</article>
					))}
				</section>
			</div>
			
			{error && <p className={styles.error}>{error}</p>}
			{message && <p className={styles.message}>{message}</p>}

			<button
				type="submit"
				className={styles.primaryButton}
				disabled={isSubmitting}
			>
				{isSubmitting ? "Saving Draft..." : "Save Draft"}
			</button>
			
		</form>
	);
}
