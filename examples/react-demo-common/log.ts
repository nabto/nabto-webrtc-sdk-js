export type Logger = {
    e: (...args: unknown[]) => void
    w: (...args: unknown[]) => void
    d: (...args: unknown[]) => void
}

export function createLogger(id: string) {
    return {
        e: Function.prototype.bind.call(console.error, console, `(${id})[ERROR]:`),
        w: Function.prototype.bind.call(console.log, console, `(${id})[WARNING]:`),
        d: Function.prototype.bind.call(console.log, console, `(${id})[DEBUG]:`)
    };
}
