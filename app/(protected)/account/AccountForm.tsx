"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { USERNAME_PATTERN, USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH } from "@/domain/user/Username";
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "@/domain/user/Password";
import PageFrame from "@/components/PageFrame";

import styles from "./page.module.css";

type AccountFormProps = {
	username: string;
	registeredName: string;
	createdAt: string;
	createdBy: string;
};

export default function AccountForm({
	username,
	registeredName,
	createdAt,
	createdBy,
}: AccountFormProps) {
	const router = useRouter();

	const [currentUsername, setCurrentUsername] = useState(username);
	const [editingUsername, setEditingUsername] = useState(false);
	const [newUsername, setNewUsername] = useState(username);

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [editingPassword, setEditingPassword] = useState(false);
	const passwordChanging = useRef(false);
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
	if (passwordChanging.current) {
		return;
	}

	passwordChanging.current = true;
	setError("");

	if (newPassword !== confirmPassword) {
		passwordChanging.current = false;
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
		passwordChanging.current = false;
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

			router.replace("/login");
			router.refresh();
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

			<PageFrame pageClassName={styles.page} contentClassName={styles.content}>
					<h1>Account</h1>

					<section className={styles.section}>
						<div className={styles.field}>
							<span>Username</span>

							{editingUsername ? (
								<div className={styles.row}>
									<input
										type="text"
						minLength={USERNAME_MIN_LENGTH}
						maxLength={USERNAME_MAX_LENGTH}
						pattern={USERNAME_PATTERN}
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

						<div className={styles.field}>
							<span>Created at</span>

							<input
								type="text"
								value={new Date(createdAt).toLocaleString()}
								readOnly
							/>
						</div>

						<div className={styles.field}>
							<span>Created by</span>

							<input
								type="text"
								value={createdBy}
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
						maxLength={PASSWORD_MAX_LENGTH}
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
						minLength={PASSWORD_MIN_LENGTH}
						maxLength={PASSWORD_MAX_LENGTH}
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
						minLength={PASSWORD_MIN_LENGTH}
						maxLength={PASSWORD_MAX_LENGTH}
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
			</PageFrame>

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
