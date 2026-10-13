export type TestCaseData = {
	input: string;
	expectedOutput: string;
};

export class TestCase {
	constructor(
		public readonly input: string,
		public readonly expectedOutput: string,
	) {}
}
