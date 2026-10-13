"use client";

import { useEffect } from "react";
import styles from "./Navbar.module.css";

export default function ThemeToggle() {
	useEffect(() => {
		const savedTheme =
			document.cookie
				.split("; ")
				.find((cookie) => cookie.startsWith("theme="))
				?.split("=")[1]
			?? localStorage.getItem("theme");

		const theme = savedTheme === "dark" ? "dark" : "light";

		document.documentElement.dataset.theme = theme;

		// Migrate the old localStorage preference to a cookie.
		document.cookie = `theme=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
	}, []);

	function toggleTheme() {
		const root = document.documentElement;
		const nextTheme =
			root.dataset.theme === "dark" ? "light" : "dark";

		root.dataset.theme = nextTheme;
		localStorage.setItem("theme", nextTheme);
		document.cookie = `theme=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax`;
	}

	return (
		<button
			type="button"
			className={styles.themeToggle}
			onClick={toggleTheme}
			aria-label="Toggle color theme"
			title="Toggle color theme"
		>
			<span className={styles.lightIcon}>☾</span>
			<span className={styles.darkIcon}>☀</span>
		</button>
	);
}
