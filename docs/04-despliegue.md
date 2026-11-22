# 04 · Despliegue

Es un sitio estático. [Vite](https://vite.dev) lo construye en `dist/` y un Worker de Cloudflare con *static assets* lo sirve. No hay código de servidor ni secretos.

## Requisitos

- Node 22 o posterior.
- Una cuenta de Cloudflare (el plan gratuito basta).

## Local

```bash
npm install
npm run dev          # servidor de desarrollo en http://localhost:5173
npm test             # tests
npm run build        # comprueba tipos y construye dist/
npm run preview      # sirve dist/ para revisarlo
npm run cf:dev       # build + el runtime de Cloudflare en local
```

## Cloudflare

```bash
npx wrangler login   # una vez; abre el navegador
npm run deploy       # build + wrangler deploy
```

La configuración está en [`wrangler.jsonc`](../wrangler.jsonc):

```jsonc
{
  "name": "keychain-maker",
  "compatibility_date": "2026-11-01",
  "assets": { "directory": "./dist", "not_found_handling": "single-page-application" }
}
```

Al terminar, Wrangler imprime la dirección (`https://keychain-maker.<tu-subdominio>.workers.dev`). Para un dominio propio, añádelo en el panel de Cloudflare, en *Workers & Pages → keychain-maker → Settings → Domains & Routes*.

### Si el deploy falla

- **`Authentication error [code: 10000]`.** Wrangler tiene abierta otra cuenta. `npx wrangler whoami` dice cuál; `npx wrangler login` cambia.
- **`Timed out waiting for authorization code`.** El navegador no completó el permiso a tiempo. Vuelve a lanzar `npx wrangler login` y pulsa *Allow*.
- **`Missing script: "deploy"`.** El comando se lanzó fuera de la carpeta del proyecto.

## Otras plataformas

`dist/` funciona en cualquier hosting estático (GitHub Pages, Netlify, Vercel). La única condición es servir `.wasm` con el tipo `application/wasm`, cosa que hacen todos por defecto.

## Tamaño

La app pesa unos 250 kB comprimida, más 210 kB del motor WebAssembly y las fuentes, que se descargan solo cuando se usan.
