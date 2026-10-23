export class Queue<T> {
	private items: T[] = [];
	private head = 0;

	public static from<T>(values: Iterable<T>): Queue<T> {
		const queue = new Queue<T>();
		for (const value of values) queue.enqueue(value);
		return queue;
	}

	public get size(): number {
		return this.items.length - this.head;
	}

	public get isEmpty(): boolean {
		return this.size === 0;
	}

	public enqueue(item: T): void {
		this.items.push(item);
	}

	public peek(): T | undefined {
		return this.items[this.head];
	}

	public dequeue(): T | undefined {
		if (this.isEmpty) return undefined;

		const item = this.items[this.head];
		this.head++;

		// Drop the consumed front part once it is half of the array, so dequeue stays O(1) on average.
		if (this.head * 2 >= this.items.length) {
			this.items = this.items.slice(this.head);
			this.head = 0;
		}

		return item;
	}
}
