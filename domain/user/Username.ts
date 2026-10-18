export const USERNAME_PATTERN = "[A-Za-z0-9_]{3,30}";
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

export class Username {
	private constructor(public readonly value: string) {}

	public static parse(raw: unknown): Username | null {
		if (typeof raw !== "string") return null;
		const value = raw.trim();
		return /^[A-Za-z0-9_]{3,30}$/.test(value)
			? new Username(value)
			: null;
	}
}
