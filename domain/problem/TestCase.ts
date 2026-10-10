export type TestCaseData = {
	order: number;
	input: string;
	expectedOutput: string;
};

export class TestCase {
	private readonly _order: number;
	private readonly _input: string;
	private readonly _expectedOutput: string;

	constructor(data: TestCaseData) {
		if (!Number.isInteger(data.order) || data.order <= 0) {
			throw new Error("Test case order must be a positive integer.");
		}

		this._order = data.order;
		this._input = data.input;
		this._expectedOutput = data.expectedOutput;
	}

	public get order(): number { return this._order; }
	public get input(): string { return this._input; }
	public get expectedOutput(): string { return this._expectedOutput; }
}
