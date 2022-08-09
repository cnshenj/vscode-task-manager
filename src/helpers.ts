export function compareStrings(a: string, b: string): number {
    return a < b ? -1 : (a > b ? 1 : 0);
}

export function getOrAdd<K, V>(map: Map<K, V>, key: K, factory: () => V): V {
    return (map.has(key) ? map : map.set(key, factory())).get(key)!;
}