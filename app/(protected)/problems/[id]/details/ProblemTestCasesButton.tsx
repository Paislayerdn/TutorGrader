"use client";

import { useState } from "react";

import Modal from "@/components/Modal";
import type { ProblemDraftTestCaseInput } from "@/domain/problem/ProblemDraftInput";

import styles from "./ProblemTestCasesButton.module.css";

type Props = {
	testCases: ProblemDraftTestCaseInput[];
};

export default function ProblemTestCasesButton({ testCases }: Props) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<button
				type="button"
				className={styles.openButton}
				onClick={() => setIsOpen(true)}
			>
				View test cases
			</button>

			{isOpen && (
				<Modal
					onClose={() => setIsOpen(false)}
					overlayClassName={styles.overlay}
					modalClassName={styles.modal}
					labelledBy="problem-test-cases-title"
				>
					<header className={styles.header}>
						<h2 id="problem-test-cases-title">Test cases</h2>
						<button
							type="button"
							className={styles.closeButton}
							onClick={() => setIsOpen(false)}
							aria-label="Close test cases"
						>
							×
						</button>
					</header>
					<div className={styles.body}>
						{testCases.map((testCase, index) => (
							<section className={styles.testCase} key={index}>
								<h3>Test case {index + 1}</h3>
								<div className={styles.testCaseGrid}>
									<div>
										<strong>Input</strong>
										<pre>{testCase.input}</pre>
									</div>
									<div>
										<strong>Expected output</strong>
										<pre>{testCase.expectedOutput}</pre>
									</div>
								</div>
							</section>
						))}
					</div>
				</Modal>
			)}
		</>
	);
}
