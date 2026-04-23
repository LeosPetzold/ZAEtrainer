class RandomNumberGenerator {
  constructor(seed = 1) {
    console.log(`Starting RNG with seed ${seed}`);
    this.state = RandomNumberGenerator._seedToU32(seed);
    if (this.state === 0) this.state = 0xA5A5A5A5; // avoid pathological 0 if it happens
  }

  nextU32() {
    this.state = (Math.imul(1664525, this.state) + 1013904223) >>> 0;
    return this.state;
  }

  float() {
    return this.nextU32() / 4294967296; // [0,1)
  }

  int(min, max) {
    min = Math.trunc(min);
    max = Math.trunc(max);
    if (max < min) [min, max] = [max, min];

    const span = max - min + 1;
    if (span <= 0) throw new RangeError("Range too large");

    return min + (this.nextU32() % span);
  }

  pick(arr) {
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new TypeError("pick() expects a non-empty array");
    }
    return arr[this.int(0, arr.length - 1)];
  }

  reseed(seed) {
    this.state = RandomNumberGenerator._seedToU32(seed) || 0xA5A5A5A5;
    return this;
  }

  static _seedToU32(seed) {
    // If it's a number, mix it directly.
    if (typeof seed === "number" && Number.isFinite(seed)) {
      return RandomNumberGenerator._mix32(seed | 0);
    }
    
    const str = String(seed);
    let h = 2166136261 >>> 0; // FNV-1a base
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return RandomNumberGenerator._mix32(h);
  }

  static _mix32(x) {
    x >>>= 0;
    x ^= x >>> 16;
    x = Math.imul(x, 0x85ebca6b) >>> 0;
    x ^= x >>> 13;
    x = Math.imul(x, 0xc2b2ae35) >>> 0;
    x ^= x >>> 16;
    return x >>> 0;
  }
}