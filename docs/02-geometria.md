# 02 · Geometría

Cómo se pasa de un SVG a dos sólidos imprimibles. Todo vive en [`src/keychain.ts`](../src/keychain.ts) y [`src/svg.ts`](../src/svg.ts); el motor de booleanas es [manifold-3d](https://github.com/elalish/manifold), compilado a WebAssembly.

## 1. Del SVG a capas 2D

`parseSvg()` usa el `SVGLoader` de three.js, que ya entiende trazados, transformaciones, curvas y grupos. Por cada forma con relleno sale una **capa**: sus contornos, su regla de relleno (`nonzero` o `evenodd`) y si es blanca.

- Las curvas se dividen en 24 segmentos.
- El eje Y se invierte: en SVG crece hacia abajo, en el llavero hacia arriba.
- Los trazos se convierten en triángulos con `SVGLoader.pointsToStroke` y se unen con la regla `NonZero`, para que un trazo grueso se comporte como una superficie.
- Una capa es **blanca** si su luminancia pasa de 0,9.

## 2. El diseño

Las capas se combinan en el orden en que se pintan, como en el navegador: una capa oscura se **suma** y, si «blanco = hueco» está activo y hay alguna capa oscura, una blanca **se resta** de lo que hay debajo. El resultado se centra, se escala para que el lado mayor mida lo pedido y se simplifica (tolerancia 0,01 mm).

## 3. La base

- **Silueta.** Un *offset* redondeado de `borde + unir` y luego otro de `−unir`. Esa pareja es un **cierre morfológico**: rellena los huecos estrechos entre letras sin engordar el contorno exterior más allá del borde. Con «rellenar agujeros» se conservan solo los contornos exteriores (área positiva) y desaparecen los huecos interiores.
- **Rectángulo redondeado.** La caja del diseño más el borde, con las esquinas redondeadas por un offset.
- **Círculo.** Centrado en el diseño, con radio hasta el punto más lejano más el borde.
- **Sin base.** La base es el propio diseño.

## 4. La arandela

**Automática.** Con el ángulo se define una dirección. Entre los vértices de la base más lejanos en esa dirección se elige el que está más cerca del eje que pasa por el centro: así la anilla sale centrada aunque el borde sea irregular.

- Una **anilla** se coloca hacia fuera, a `agujero + pared × 0,55 + desplazamiento` del borde. Es el casco convexo de un círculo del diámetro exterior en el centro de la anilla y otro del 80 % en el borde: una pestaña con cuello, no un círculo pegado.
- Un **agujero** se coloca hacia dentro, a `agujero + pared` del borde.

**Manual.** El clic se proyecta sobre el plano superior de la base. Ese punto es el centro y la anilla se une al vértice de la base más cercano.

El agujero se resta de todo: base, anilla y relieve.

## 5. Los sólidos

| Estilo | Base | Relieve |
|---|---|---|
| En relieve | base extruida `T` | diseño extruido `H`, apoyado en `T` |
| Grabado | base menos el diseño desde `T − h` | no hay |
| Incrustado al ras | base menos el diseño desde `T − h` | diseño extruido `h`, desde `T − h` |

`T` es el grosor de la base, `H` la altura del relieve y `h = min(H, T − 0,4)`: el grabado siempre deja al menos 0,4 mm de suelo. El corte del grabado se extruye 0,01 mm de más para que la booleana no deje una lámina de grosor cero en la cara superior.

Si la anilla tiene un grosor distinto al de la base, se extruye aparte y se suma.

La pieza completa es la unión de base y relieve. Al final se cuentan los contornos exteriores de la planta: si hay más de uno, la base está en piezas sueltas y la app avisa.

## 6. Memoria

Cada objeto de manifold vive en la memoria de WebAssembly y hay que liberarlo a mano. `buildKeychain()` apunta todo lo que crea en una lista y lo libera en un `finally`, también si algo falla a mitad.

## 7. STL

[`src/stl.ts`](../src/stl.ts) escribe STL binario: 80 bytes de cabecera, el número de triángulos y 50 bytes por triángulo con su normal calculada. Las unidades son milímetros.

## Tests

[`test/keychain.test.ts`](../test/keychain.test.ts) corre el mismo motor en Node (happy-dom aporta el `DOMParser` que necesita el lector de SVG). La comprobación central mira que cada arista dirigida `a→b` tenga su pareja `b→a`: eso es una superficie cerrada y orientada, lo que necesita un laminador.

```bash
npm test
```
