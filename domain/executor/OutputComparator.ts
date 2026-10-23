import { OutputComparison } from "@/domain/problem/version/OutputComparison";
import { Queue } from "@/lib/Queue";

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
		const actualQueue = Queue.from(this.tokenize(actual));
		const expectedQueue = Queue.from(this.tokenize(expected));

		while (!actualQueue.isEmpty && !expectedQueue.isEmpty) {
			if (actualQueue.dequeue() === expectedQueue.peek()) expectedQueue.dequeue();
		}

		return expectedQueue.isEmpty;
	}

	private static tokenize(text: string): string[] {
		return text.trim().split(/\s+/).filter(Boolean);
	}
}
