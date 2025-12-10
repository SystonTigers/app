// Mock implementation of yocto-queue for Cloudflare Workers tests
// Simple FIFO queue implementation

export default class Queue<T = any> {
    private _queue: T[] = [];

    enqueue(value: T): void {
        this._queue.push(value);
    }

    dequeue(): T | undefined {
        return this._queue.shift();
    }

    get size(): number {
        return this._queue.length;
    }

    *[Symbol.iterator](): Iterator<T> {
        for (const item of this._queue) {
            yield item;
        }
    }
}
