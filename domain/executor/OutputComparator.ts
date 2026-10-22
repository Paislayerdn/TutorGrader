import { OutputComparison } from "@/domain/problem/version/OutputComparison";

export class OutputComparator {
	static matches(
		actual: string,
		expected: string,
		comparison: OutputComparison,
	): boolean {
		switch (comparison) {
			case OutputComparison.EXACT:
				return actual === expected;

			case OutputComparison.TRIM:
				return actual.trim() === expected.trim();

			case OutputComparison.FREE:
				return this.matchesExpectedTokens(actual, expected);

			default:
				return false;
		}
	}

	private static matchesExpectedTokens(actual: string, expected: string): boolean {
		const actualTokens = actual.trim().split(/\s+/).filter(Boolean);
		const expectedTokens = expected.trim().split(/\s+/).filter(Boolean);
		let actualIndex = 0;

		for (const expectedToken of expectedTokens) {
			while (actualIndex < actualTokens.length && actualTokens[actualIndex] !== expectedToken) {
				actualIndex++;
			}
			if (actualIndex === actualTokens.length) return false;
			actualIndex++;
		}

		return true;
	}
}
