# 03 · Impresión

Consejos para que el llavero salga a la primera. Los valores por defecto de la app (base de 3 mm, relieve de 1,2 mm, anilla de 9 mm con agujero de 5 mm) están pensados para una boquilla de 0,4 mm y PLA.

## Un color

Descarga **descargar stl** e imprímelo plano, con la base sobre la cama. No necesita soportes.

| Ajuste | Valor orientativo |
|---|---|
| Altura de capa | 0,2 mm (0,12 mm si el relieve tiene detalle fino) |
| Paredes | 3 |
| Relleno | 20–40 % |
| Material | PLA o PETG. El PETG aguanta mejor el roce de las llaves. |

## Dos colores

### Con un cambio de filamento (sin AMS)

Con el estilo **en relieve**, la base y el relieve empiezan a distinta altura. En el laminador añade una pausa o un cambio de filamento (`M600`) en la primera capa del relieve, a la altura del grosor de la base (3 mm por defecto). Basta con el STL completo.

### Con AMS, MMU o varios cabezales

1. Descarga **stl base** y **stl relieve**.
2. Ábrelos a la vez en el laminador e indica que son **un solo objeto con dos partes** (en Bambu Studio y PrusaSlicer, al importar varios archivos te lo pregunta). Las dos piezas comparten origen, así que encajan sin moverlas.
3. Asigna un filamento a cada parte.

El estilo **incrustado al ras** es el más limpio en dos colores: la cara de arriba queda plana y el dibujo no se desgasta con el roce.

## La arandela

- El agujero de **5 mm** deja pasar la mayoría de argollas. Si tu argolla es gruesa, sube a 6 mm.
- La pared alrededor del agujero es `(exterior − agujero) / 2`. Con los valores por defecto son 2 mm. Por debajo de 1,5 mm la anilla puede partirse.
- Las capas de la anilla son horizontales, así que la fuerza de tirar de la argolla va a lo largo de las fibras: aguanta bien. Si se rompe, sube el grosor de la anilla en vez del diámetro.

## Texto

- Por debajo de unos 3 mm de alto por letra, los trazos finos se pierden con boquilla de 0,4 mm. Sube el tamaño o elige una fuente gruesa (Lilita One, Archivo Black, Fredoka Bold).
- En fuentes caligráficas como Pacifico, *Unir huecos* funde las letras en una sola base. Si la app avisa de piezas sueltas, súbelo uno o dos milímetros.

## Si algo falla

- **El laminador dice que la malla tiene errores.** No debería: todos los sólidos salen cerrados y los tests lo comprueban. Abre un issue con el STL y los ajustes.
- **El relieve se despega.** En dos colores con AMS, revisa que las dos partes sean un solo objeto y no dos objetos superpuestos.
