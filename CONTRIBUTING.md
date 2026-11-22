# Contribuir

Gracias por querer mejorar el keychain maker.

## Antes de empezar

```bash
npm install
npm test && npm run build
```

## Criterios

- **Siempre mallas cerradas.** Toda geometría nueva pasa por manifold-3d. Si añades una forma de base, un estilo o un tipo de arandela, súmalo a la matriz de [`test/keychain.test.ts`](test/keychain.test.ts).
- **Libera la memoria de WebAssembly.** Cada objeto de manifold que crees en `buildKeychain()` pasa por `gc()`.
- **Nada sale del navegador.** La app no envía el diseño a ningún servidor. Un cambio que lo haga necesita una razón y un aviso visible.
- **Código y comentarios en inglés; documentación e interfaz en español**, con el README también en inglés.
- **Comentarios que explican el porqué**, no el qué.
- **Figuras.** Si cambias un valor por defecto que aparece en una figura, actualiza [`docs/assets/src/ilustraciones.py`](docs/assets/src/ilustraciones.py) y vuelve a generarlas con `npm run figures`.

## Commits

Mensajes cortos en imperativo, en español o en inglés: «Añade base hexagonal», «Fix ring anchor on concave outlines».
