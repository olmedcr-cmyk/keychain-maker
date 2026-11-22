# Cambios

## 0.1.0 · 2026-11-22

Primera versión pública.

- Diseño desde SVG (arrastrar, elegir o pegar), texto con seis fuentes incluidas o una propia, y cinco formas de ejemplo. Las zonas blancas de un SVG se tratan como huecos y los trazos se convierten en relleno.
- Base en silueta con cierre morfológico para unir piezas sueltas, rectángulo redondeado, círculo o sin base.
- Relieve que sobresale, grabado o incrustado al ras, con la profundidad limitada para no atravesar la base.
- Arandela como anilla exterior o agujero, colocada por ángulo o con un clic en la vista 3D.
- STL binario completo, o base y relieve por separado para dos colores.
- Interfaz de instrumento: módulos con mando de color, teclas físicas y lectura tipo LCD. Abre en claro; el modo oscuro se activa desde el panel y se recuerda.
- 12 tests con Vitest (180 combinaciones de forma, base, estilo y arandela comprobadas como superficies cerradas) y CI en GitHub.
- Despliegue como Worker de Cloudflare con *static assets*.
