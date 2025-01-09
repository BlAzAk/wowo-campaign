export function hexToUint8Array(hex) {
    if (hex.length % 2 !== 0) {
        throw new Error('Hex string must have an even length');
    }
    const array = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        array[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return array;
}