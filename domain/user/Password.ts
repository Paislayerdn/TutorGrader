export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export class Password {
	private constructor(public readonly value: string) {}

	public static parseNew(raw: unknown): Password | null {
		if (typeof raw !== "string") return null;
		return raw.length >= PASSWORD_MIN_LENGTH && raw.length <= PASSWORD_MAX_LENGTH
			? new Password(raw)
			: null;
	}
}
