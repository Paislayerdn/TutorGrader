"use client";

import { useState } from "react";

import styles from "./page.module.css";

type AccountFormProps = {
	username: string;
	registeredName: string;
};

export default function AccountForm({
	username,
	registeredName,
}: AccountFormProps) {
	const [currentUsername, setCurrentUsername] = useState(username);
	const [editingUsername, setEditingUsername] = useState(false);
	const [newUsername, setNewUsername] = useState(username);

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [editingPassword, setEditingPassword] = useState(false);
	const [showDeactivateMenu, setShowDeactivateMenu] = useState(false);

	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [loading, setLoading] = useState(false);

	function showSuccess(message: string) {
		setSuccess(message);

		setTimeout(() => {
			setSuccess("");
		}, 3000);
	}

	async function handleUsernameChange() {
		setError("");
		setLoading(true);

		try {
			const response = await fetch("/api/account", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					action: "username",
					username: newUsername,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.error ?? "Unable to change username.");
				return;
			}

			setCurrentUsername(data.user.username);
			setNewUsername(data.user.username);
			setEditingUsername(false);

			showSuccess("Successfully changed username.");
		} catch {
			setError("Unable to connect to TutorGrader.");
		} finally {
			setLoading(false);
		}
	}

	async function handlePasswordChange() {
			setError("");

			if (newPassword !== confirmPassword) {
				setError("New passwords do not match.");
				return;
			}

			setLoading(true);

			try {
				const response = await fetch("/api/account", {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						action: "password",
						currentPassword,
						newPassword,
					}),
				});

				const data = await response.json();

				if (!response.ok) {
					setError(data.error ?? "Unable to change password.");
					return;
				}

				setCurrentPassword("");
				setNewPassword("");
				setConfirmPassword("");
				setEditingPassword(false);

				showSuccess("Successfully changed password.");
			} catch {
				setError("Unable to connect to TutorGrader.");
			} finally {
				setLoading(false);
			}
		}

		async function handleDeactivate() {
		setError("");
		setLoading(true);

		try {
			const response = await fetch("/api/account", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					action: "deactivate",
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.error ?? "Unable to deactivate account.");
				return;
			}

			window.location.href = "/login";
		} catch {
			setError("Unable to connect to TutorGrader.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<>
			{success && (
				<div className={styles.success}>
					✓ {success}
				</div>
			)}

			<main className={styles.page}>
				<section className={styles.content}>
					<h1>Account</h1>

					<section className={styles.section}>
						<div className={styles.field}>
							<span>Username</span>

							{editingUsername ? (
								<div className={styles.row}>
									<input
										type="text"
										value={newUsername}
										onChange={(event) =>
											setNewUsername(event.target.value)
										}
										disabled={loading}
										autoFocus
									/>

									<button
										type="button"
										onClick={handleUsernameChange}
										disabled={loading}
									>
										Save
									</button>

									<button
										type="button"
										onClick={() => {
											setNewUsername(currentUsername);
											setEditingUsername(false);
											setError("");
										}}
										disabled={loading}
									>
										Cancel
									</button>
								</div>
							) : (
								<div className={styles.row}>
									<input
										type="text"
										value={currentUsername}
										readOnly
									/>

									<button
										type="button"
										onClick={() => {
											setEditingUsername(true);
											setError("");
										}}
									>
										Change
									</button>
								</div>
							)}
						</div>

						<div className={styles.field}>
							<span>Registered name</span>

							<input
								type="text"
								value={registeredName}
								readOnly
							/>
						</div>
					</section>

					<section className={styles.section}>
						<div className={styles.field}>
							<span>Password</span>

							{editingPassword ? (
								<div className={styles.passwordForm}>
									<input
										type="password"
										placeholder="Current password"
										value={currentPassword}
										onChange={(event) =>
											setCurrentPassword(event.target.value)
										}
										disabled={loading}
										autoComplete="current-password"
									/>

									<input
										type="password"
										placeholder="New password"
										value={newPassword}
										onChange={(event) =>
											setNewPassword(event.target.value)
										}
										disabled={loading}
										autoComplete="new-password"
									/>

									<input
										type="password"
										placeholder="Confirm new password"
										value={confirmPassword}
										onChange={(event) =>
											setConfirmPassword(event.target.value)
										}
										disabled={loading}
										autoComplete="new-password"
									/>

									<div className={styles.row}>
										<button
											type="button"
											onClick={handlePasswordChange}
											disabled={loading}
										>
											Save
										</button>

										<button
											type="button"
											onClick={() => {
												setCurrentPassword("");
												setNewPassword("");
												setConfirmPassword("");
												setEditingPassword(false);
												setError("");
											}}
											disabled={loading}
										>
											Cancel
										</button>
									</div>
								</div>
							) : (
								<div className={styles.row}>
									<input
										type="password"
										value="••••••••••••"
										readOnly
									/>

									<button
										type="button"
										onClick={() => {
											setEditingPassword(true);
											setError("");
										}}
									>
										Change password
									</button>
								</div>
							)}
						</div>
					</section>

					{error && (
						<p className={styles.error}>
							{error}
						</p>
					)}

					<section className={`${styles.section} ${styles.danger}`}>
						<h2>Deactivate account</h2>

						<p>
							Deactivating your account will prevent you from
							logging in again.
						</p>

						<button
							type="button"
							className={styles.dangerButton}
							onClick={() => {
								setError("");
								setShowDeactivateMenu(true);
							}}
							disabled={loading}
						>
							Deactivate account
						</button>
					</section>
				</section>
			</main>

			{showDeactivateMenu && (
				<div className={styles.modalOverlay}>
					<div className={styles.modal}>
						<h2>Deactivate account</h2>

						<p>
							Are you sure you want to deactivate your account?
						</p>

						<p>
							You will no longer be able to log in until your account
							is reactivated.
						</p>

						<div className={styles.modalActions}>
							<button
								type="button"
								className={styles.cancelButton}
								onClick={() => setShowDeactivateMenu(false)}
								disabled={loading}
							>
								Cancel
							</button>

							<button
								type="button"
								className={styles.confirmDangerButton}
								onClick={handleDeactivate}
								disabled={loading}
							>
								{loading ? "Deactivating..." : "Deactivate account"}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
