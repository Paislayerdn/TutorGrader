"use client";

import { useEffect, useState } from "react";
import styles from "./Navbar.module.css";

export default function ThemeToggle() {
	const [dark, setDark] = useState(false);

	useEffect(() => {
		const savedTheme =
			document.cookie
				.split("; ")
				.find((cookie) => cookie.startsWith("theme="))
				?.split("=")[1]
			?? localStorage.getItem("theme");

		const isDark = savedTheme === "dark";

		document.documentElement.dataset.theme = isDark
			? "dark"
			: "light";

		setDark(isDark);

		// Migrate the old localStorage preference to a cookie.
		document.cookie = `theme=${isDark ? "dark" : "light"}; Path=/; Max-Age=31536000; SameSite=Lax`;
	}, []);

	function toggleTheme() {
		const nextDark = !dark;
		const theme = nextDark ? "dark" : "light";

		document.documentElement.dataset.theme = theme;
		localStorage.setItem("theme", theme);
		document.cookie = `theme=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;

		setDark(nextDark);
	}

	return (
		<button
			type="button"
			className={styles.themeToggle}
			onClick={toggleTheme}
			aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
			title={dark ? "Switch to light mode" : "Switch to dark mode"}
		>
			{dark ? "☀" : "☾"}
		</button>
	);
}
