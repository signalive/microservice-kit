if (!('toJSON' in Error.prototype)) {
    Object.defineProperty(Error.prototype, 'toJSON', {
        value: function (this: Error) {
            const alt: Record<string, any> = {};

            Object.getOwnPropertyNames(this).forEach(function (this: Error, key: string) {
                alt[key] = (this as any)[key];
            }, this);

            return alt;
        },
        configurable: true,
        writable: true
    });
}

export {};

