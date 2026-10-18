"use client";

import { useCallback, useState } from "react";

export function useApiAction() {
	const [isRunning, setIsRunning] = useState(false);
	const [error, setError] = useState("");

	const clearError = useCallback(() => setError(""), []);
	const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
		setIsRunning(true);
		setError("");
		try {
			return await action();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "An unexpected error occurred.");
			throw caught;
		} finally {
			setIsRunning(false);
		}
	}, []);

	return { run, isRunning, error, clearError };
}
