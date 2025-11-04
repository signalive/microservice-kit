declare module 'async-q' {
    export function mapLimit<T, R>(
        arr: T[],
        limit: number,
        iteratee: (item: T, index: number) => Promise<R>
    ): Promise<R[]>;

    export function map<T, R>(
        arr: T[],
        iteratee: (item: T, index: number) => Promise<R>
    ): Promise<R[]>;

    export function series<T>(
        tasks: ((callback: (err?: Error) => void) => void)[],
        callback: (err?: Error, results?: T[]) => void
    ): void;
}

