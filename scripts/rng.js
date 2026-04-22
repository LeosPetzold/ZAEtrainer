// Seedable RNG for browser JS with a *better seed mixer* so that
// seed+1 produces a very different sequence.
// Still "dumb" (non-crypto), but good for reproducible worksheet variation.

class RandomNumberGenerator {
  constructor(seed = 1) {
    console.log(`Starting RNG with seed ${seed}`);
    // Mix the seed hard into a uint32 state (avalanche effect).
    // Accepts numbers or strings.
    this.state = RandomNumberGenerator._seedToU32(seed);
    if (this.state === 0) this.state = 0xA5A5A5A5; // avoid pathological 0 if it happens
  }

  // LCG step (fast)
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

    // Simple modulo; fine for typical small spans in worksheets.
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

  // --- seed mixing (the important part for "seed+1 shifts everything") ---

  static _seedToU32(seed) {
    // If it's a number, mix it directly.
    if (typeof seed === "number" && Number.isFinite(seed)) {
      return RandomNumberGenerator._mix32(seed | 0);
    }

    // If it's a string (or anything else), hash it then mix.
    const str = String(seed);
    let h = 2166136261 >>> 0; // FNV-1a base
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return RandomNumberGenerator._mix32(h);
  }

  static _mix32(x) {
    // Murmur3-style finalizer: strong avalanche in 32-bit
    x >>>= 0;
    x ^= x >>> 16;
    x = Math.imul(x, 0x85ebca6b) >>> 0;
    x ^= x >>> 13;
    x = Math.imul(x, 0xc2b2ae35) >>> 0;
    x ^= x >>> 16;
    return x >>> 0;
  }
}

/* ===== Browser usage =====
<script>
  const rng1 = new RandomNumberGenerator(1);
  const rng2 = new RandomNumberGenerator(2); // seed+1 => very different stream

  console.log("seed=1:", rng1.int(1, 100), rng1.int(1, 100), rng1.int(1, 100));
  console.log("seed=2:", rng2.int(1, 100), rng2.int(1, 100), rng2.int(1, 100));

  // Reproducible worksheet:
  const rng = new RandomNumberGenerator("worksheet-42");
  console.log(rng.pick(["A","B","C","D"]), rng.int(-10,10), rng.float());
</script>
*/