# Figuras

Las ilustraciones de `docs/assets/` (`banner`, `llavero`, `estilos`) salen de este script, en versión clara y oscura:

```bash
npm run figures      # o: python3 docs/assets/src/ilustraciones.py
```

`iso.py` es un motor isométrico mínimo que sigue la gramática de [Hairline](https://github.com/lucasmarkes/hairline) (MIT): placas rellenas, trazo fino, una tinta para lo importante y grises para el resto, con los colores de tema de Divina Machina. Hairline dibuja figuras interactivas en el navegador; GitHub solo muestra SVG estáticos, así que estas se dibujan aquí y se guardan como archivos.

Es el mismo motor de [talking-objects](https://github.com/olmedcr-cmyk/talking-objects), con una primitiva más: `prism()`, que extruye un contorno 2D con agujeros y dibuja solo las paredes que miran al espectador.

El llavero es esquemático: las proporciones siguen los valores por defecto de la app (base de 3 mm, relieve de 1,2 mm, anilla de 9 mm con agujero de 5 mm), pero el contorno está dibujado a mano, no exportado.

`app-light.png` es una captura de la app desplegada, hecha con Chrome sin interfaz:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --window-size=1440,900 --force-device-scale-factor=2 --virtual-time-budget=8000 \
  --screenshot=docs/assets/app-light.png https://keychain-maker.olmedcr.workers.dev/
```
