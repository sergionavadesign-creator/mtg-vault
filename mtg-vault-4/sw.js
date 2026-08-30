// Service worker minimo per rendere l'app installabile come PWA.
// Strategia DELIBERATAMENTE prudente: "network-first" per index.html, mai
// "cache-first" — in questo progetto abbiamo già avuto più volte il problema
// di vedere una versione vecchia dell'app per colpa della cache del browser;
// questo service worker non deve MAI aggiungersi a quel problema.
// Va in cache solo l'essenziale per un'esperienza offline minima; i dati
// (Supabase, Scryfall) passano sempre dalla rete, mai dalla cache.

const CACHE_VERSION = "mycommander-shell-v1";
const SHELL_FILES = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_FILES).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // mai intercettare scritture

  // Solo per i file della shell locale: network-first, con la cache come
  // ripiego SOLO se la rete non risponde (offline vero, non "cache più veloce").
  const url = new URL(req.url);
  const isShellFile = url.origin === self.location.origin;
  if (!isShellFile) return; // Supabase, Scryfall, font, CDN: sempre e solo rete

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});
