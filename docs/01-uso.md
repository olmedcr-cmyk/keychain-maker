# 01 · Uso

La pantalla tiene dos mitades. A la izquierda, el panel con cuatro módulos, cada uno con su mando de color: **diseño** (azul), **base y relieve** (verde), **arandela** (blanco) y **colores de vista previa** (naranja). A la derecha, la lectura con las medidas, la vista 3D y los botones de descarga.

Cada cambio recalcula el llavero al momento. La lectura de arriba dice el tamaño final en milímetros (ancho × fondo × alto), cuántos triángulos tiene y cuánto tardó.

## 1 · Diseño

Tres fuentes, en las teclas de arriba:

- **svg.** Arrastra un archivo a la zona rayada, haz clic para elegirlo o pega el código en *Pegar código SVG*. También puedes soltar el archivo en cualquier parte de la página. El nombre del SVG pasa a ser el nombre del STL.
- **texto.** Escribe una o varias líneas. Elige entre seis fuentes incluidas o sube la tuya (.ttf, .otf o .woff). *Espaciado* separa las letras (en em: 0,05 es un poco más abierto) e *Interlínea* separa las líneas. La alineación importa cuando hay varias líneas.
- **formas.** Cinco ejemplos para probar sin tener nada a mano: corazón, estrella, huella, rayo y aro (el aro tiene un círculo blanco para ver cómo se tratan los huecos).

| Ajuste | Rango | Qué hace |
|---|---|---|
| Tamaño (lado mayor) | 15–150 mm | Escala el diseño para que su lado más largo mida esto. La base y la arandela se añaden alrededor. |
| Las zonas blancas del SVG son huecos | sí / no | Solo con SVG. Ver abajo. |
| Espejo horizontal | sí / no | Invierte el diseño, útil si vas a imprimir boca abajo. |

### Qué SVG funciona bien

- **Rellenos.** Se extruye todo lo que tiene relleno. Los trazos (`stroke`) se convierten en relleno con su grosor.
- **Blanco = hueco.** Con la casilla activada, una forma blanca (o casi) encima de otra oscura la recorta, como en un logo con contraformas o con fondo blanco. Si un SVG es todo blanco, la casilla no hace nada y se extruye igual.
- **Sin imágenes.** Las imágenes incrustadas (`<image>`) y los textos sin convertir a trazados se ignoran. Convierte el texto a contornos en tu editor antes de exportar.
- **Si sale vacío**, la app dice *El SVG no tiene formas rellenas que se puedan extruir*. Suele ser un SVG solo con líneas sin grosor o con todo en `fill="none"`.

## 2 · Base y relieve

| Ajuste | Rango | Qué hace |
|---|---|---|
| Forma de la base | silueta, rectángulo redondeado, círculo, sin base | *Silueta* sigue el contorno del diseño. *Sin base* deja solo el diseño recortado, con su propio grosor. |
| Borde alrededor | 0–12 mm | Margen entre el diseño y el borde de la base. |
| Unir huecos entre piezas | 0–10 mm | Solo en silueta. Funde letras o piezas sueltas en una sola base. Si la base sale en varias piezas, súbelo. |
| Rellenar agujeros interiores | sí / no | Solo en silueta. Tapa los huecos que quedarían dentro de la base (el interior de una «o»). |
| Radio de esquinas | 0–25 mm | Solo en rectángulo. |
| Grosor de la base | 1–10 mm | Altura de la base. 3 mm es firme para un llavero de bolsillo. |
| Estilo del diseño | en relieve, grabado, incrustado al ras | Ver la figura de [estilos](../README.md#tres-estilos-de-relieve). |
| Altura / profundidad | 0,2–6 mm | Cuánto sobresale o se hunde el diseño. |

El grabado y el incrustado nunca atraviesan la base: la profundidad se limita a 0,4 mm menos que el grosor y la app avisa cuando lo hace.

Si la base queda en varias piezas sueltas, la app también avisa. Sube *Borde* o *Unir huecos*, o cambia a rectángulo o círculo.

## 3 · Arandela

| Ajuste | Rango | Qué hace |
|---|---|---|
| Tipo | anilla exterior, agujero dentro, sin arandela | La anilla es una pestaña que sale del borde; el agujero se abre dentro de la base. |
| Colocación | automática, manual | Automática: por ángulo. Manual: haz clic en la vista 3D donde quieres el centro. |
| Posición (ángulo) | 0–360° | 90° es arriba, 0° a la derecha. La anilla busca el punto del borde más lejano en esa dirección. |
| Desplazar hacia fuera / dentro | −6 a 6 mm | Afina la posición automática. |
| Diámetro exterior | 5–20 mm | Tamaño de la anilla. |
| Diámetro del agujero | 2–14 mm | Por donde pasa la argolla. 5 mm vale para la mayoría. |
| Grosor anilla | 0–10 mm | 0 = igual que la base. Más fina se dobla; más gruesa resiste más. |

El agujero atraviesa todo, también el relieve si coincide encima.

## 4 · Colores de vista previa

Solo cambian cómo se ve en pantalla, para hacerte una idea de los dos filamentos. No afectan al STL.

## Descargar

- **descargar stl**: el llavero completo, fundido en un solo sólido. Para imprimir en un color.
- **stl base** y **stl relieve**: las dos piezas por separado, en la misma posición, para imprimir en dos colores. No aparecen con el estilo grabado (es una sola pieza) ni sin base.

El nombre del archivo se edita en el campo *archivo*.

## Tema

El botón del sol, arriba del panel, cambia a modo oscuro. La app recuerda la elección y, por defecto, abre en claro.
