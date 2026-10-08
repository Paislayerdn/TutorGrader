"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";

export default function LoginPage() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const unauthorized = searchParams.get("error") === "unauthorized";

	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		setError("");
		setLoading(true);

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					username,
					password,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.error ?? "Unable to Log in.");
				return;
			}

			router.push("/dashboard");
			router.refresh();
		} catch {
			setError("Unable to connect to TutorGrader.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className={styles.page}>
			<div className={styles.card}>
				<h1>Log in</h1>

				<p className={styles.description}>
					Log in to continue to TutorGrader.
				</p>

				<form onSubmit={handleSubmit} className={styles.form}>
					<label>
						<span>Username</span>
						<input
							type="text"
							value={username}
							onChange={(event) =>
								setUsername(event.target.value)
							}
							autoComplete="username"
							disabled={loading}
							required
						/>
					</label>

					<label>
						<span>Password</span>
						<input
							type="password"
							value={password}
							onChange={(event) =>
								setPassword(event.target.value)
							}
							autoComplete="current-password"
							disabled={loading}
							required
						/>
					</label>

					{unauthorized && (
						<p className={styles.error}>
							LOG IN, YOU IDIOT.
						</p>
					)}

					{error && (
						<p className={styles.error}>
							{error}
						</p>
					)}

					<button type="submit" disabled={loading}>
						{loading ? "Logging in..." : "Log in"}
					</button>
				</form>

				<p className={styles.help}>
					Forgot your password? Contact the owner.
				</p>
			</div>
		</main>
	);
}
