// Mock implementation of p-limit for Cloudflare Workers tests
// This avoids module resolution issues with the real p-limit package

export default function pLimit(concurrency: number) {
    const queue: Array<() => Promise<any>> = [];
    let activeCount = 0;

    const next = () => {
        activeCount--;
        if (queue.length > 0) {
            const fn = queue.shift();
            if (fn) {
                run(fn);
            }
        }
    };

    const run = async (fn: () => Promise<any>) => {
        activeCount++;
        try {
            await fn();
        } finally {
            next();
        }
    };

    const generator = (fn: (...args: any[]) => Promise<any>, ...args: any[]) => {
        return new Promise((resolve, reject) => {
            const execute = async () => {
                try {
                    const result = await fn(...args);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };

            if (activeCount < concurrency) {
                run(execute);
            } else {
                queue.push(execute);
            }
        });
    };

    Object.defineProperties(generator, {
        activeCount: {
            get: () => activeCount,
        },
        pendingCount: {
            get: () => queue.length,
        },
        clearQueue: {
            value: () => {
                queue.length = 0;
            },
        },
    });

    return generator;
}
