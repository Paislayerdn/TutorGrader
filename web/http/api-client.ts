"use client";

export async function apiFetch<T>(
	input: RequestInfo | URL,
	init?: RequestInit,
	fallbackMessage = "Request failed.",
): Promise<T> {
	const response = await fetch(input, init);
	let payload: unknown;
	try {
		payload = await response.json();
	} catch {
		if (!response.ok) throw new Error(fallbackMessage);
		throw new Error("The server returned an invalid response.");
	}
	if (!response.ok) {
		const message = typeof payload === "object" && payload !== null &&
			"error" in payload && typeof payload.error === "string" && payload.error
			? payload.error
			: fallbackMessage;
		throw new Error(message);
	}
	return payload as T;
}
