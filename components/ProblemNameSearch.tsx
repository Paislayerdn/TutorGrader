"use client";

import type { FormEvent } from "react";

import styles from "./ProblemNameSearch.module.css";

type Props = {
	isSearching: boolean;
	error: string | null;
	onSearch: (query: string) => Promise<void>;
};

export default function ProblemNameSearch({ isSearching, error, onSearch }: Props) {
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		await onSearch(String(formData.get("problemName") ?? "").trim());
	}

	return (
		<div className={styles.container}>
			<form className={styles.form} onSubmit={submit}>
				<label className={styles.label} htmlFor="problem-name-search">
					Search by problem name
				</label>
				<div className={styles.controls}>
					<input
						id="problem-name-search"
						name="problemName"
						type="search"
						className={styles.input}
						placeholder="Enter part of a problem name"
						disabled={isSearching}
					/>
					<button className={styles.button} type="submit" disabled={isSearching}>
						{isSearching ? "Searching..." : "Search"}
					</button>
				</div>
			</form>
			{error && <p className={styles.error} role="alert">{error}</p>}
		</div>
	);
}
