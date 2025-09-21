// PRNG mulberry32: seed -> funzione random [0,1)
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
} // basato su implementazioni note di PRNG seedabili per JS [web:412][web:418]

// Fisher–Yates con RNG iniettato (non usa Math.random di default)
export function shuffle<T>(arr: T[], rng: () => number): T[] {
  // opzionale: lavorare su copia se non si vuole mutare l'array in ingresso
  // const a = arr.slice();
  const a = arr;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
} // algoritmo O(n) raccomandato per mescolare in modo equo [web:415][web:409]
