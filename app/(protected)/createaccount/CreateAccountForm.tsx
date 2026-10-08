"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./page.module.css";

type CreateAccountFormProps = {
	creatorRole: "ADMIN" | "OWNER";
};

export default function CreateAccountForm({
	creatorRole,
}: CreateAccountFormProps) {
	const router = useRouter();

	const [username, setUsername] = useState("");
	const [registeredName, setRegisteredName] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState("USER");

	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const canCreateAdmin = creatorRole === "OWNER";

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		setError("");
		setLoading(true);

		try {
			const response = await fetch("/api/users", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					username,
					registeredName,
					password,
					role,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.error ?? "Unable to create account.");
				return;
			}

			router.push("/dashboard");
		} catch {
			setError("Unable to connect to TutorGrader.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className={styles.page}>
			<section className={styles.card}>
				<p className={styles.eyebrow}>ACCOUNT MANAGEMENT</p>

				<h1>Create account</h1>

				<p className={styles.description}>
					Create a new TutorGrader account.
				</p>

				<form onSubmit={handleSubmit} className={styles.form}>
					<label>
						<span>Username</span>
						<input
							type="text"
							value={username}
							onChange={(event) => setUsername(event.target.value)}
							autoComplete="username"
							disabled={loading}
							required
						/>
					</label>

					<label>
						<span>Registered name</span>
						<input
							type="text"
							value={registeredName}
							onChange={(event) =>
								setRegisteredName(event.target.value)
							}
							disabled={loading}
							required
						/>
					</label>

					<label>
						<span>Initial password</span>
						<input
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							autoComplete="new-password"
							disabled={loading}
							required
						/>
					</label>

					{canCreateAdmin ? (
						<label>
							<span>Role</span>
							<select
								value={role}
								onChange={(event) => setRole(event.target.value)}
								disabled={loading}
							>
								<option value="USER">USER</option>
								<option value="ADMIN">ADMIN</option>
							</select>
						</label>
					) : (
						<p className={styles.roleNote}>
							You will create a USER account.
						</p>
					)}

					{error && (
						<p className={styles.error}>
							{error}
						</p>
					)}

					<button type="submit" disabled={loading}>
						{loading ? "Creating..." : "Create account"}
					</button>
				</form>
			</section>
		</main>
	);
}
