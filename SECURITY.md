# Seguridad

Si encuentras una vulnerabilidad, **no abras un issue público**. Usa los avisos privados de seguridad de GitHub en este repositorio, o escribe a Divina Machina.

Superficie a tener en cuenta:

- **SVG de terceros.** El SVG se lee con `DOMParser` para sacar la geometría; nunca se inserta en la página. No lo cambies por `innerHTML`: un SVG puede llevar scripts.
- **Fuentes de terceros.** Las fuentes que sube el usuario se leen con opentype.js en memoria y no se registran en la página.
- **Sin servidor.** El Worker solo sirve archivos estáticos. No guarda nada ni tiene secretos.
- **Datos personales.** El último diseño, el texto incluido, se guarda en el `localStorage` del navegador de quien lo usa y en ningún otro sitio.
