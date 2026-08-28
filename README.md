# Catálogo Automotriz 2026 — Imagen Perfecta Sie7e

Mini sitio interactivo para presentar el catálogo de productos promocionales en la feria de Corferias.

## Cómo verlo

Es un sitio 100% estático (HTML/CSS/JS, sin dependencias ni build). Para subirlo a tu hosting, sube toda la carpeta `web/` tal cual (o su contenido) a la raíz del dominio/subdominio que vayas a usar. `index.html` debe quedar en la raíz de esa ruta.

Para probarlo en tu computador antes de subirlo, ábrelo con cualquier servidor estático local (por ejemplo la extensión "Live Server" de VS Code), ya que algunos navegadores restringen `localStorage`/rutas relativas si abres el archivo `index.html` directamente con doble clic (`file://`).

## Cómo subirlo a GitHub y publicarlo en Vercel

Esta carpeta (`web/`) ya está lista como repositorio Git — es la raíz del proyecto, no la subas dentro de otra carpeta.

**1. Crear el repositorio en GitHub**

1. Entra a [github.com/new](https://github.com/new) y crea un repositorio (puede ser privado o público). No marques "Add a README" ni ".gitignore" — ya existen aquí.
2. Copia la URL que te da GitHub (algo como `https://github.com/tu-usuario/catalogo-automotriz.git`).
3. En una terminal, dentro de esta carpeta (`web/`), ejecuta:
   ```bash
   git remote add origin https://github.com/tu-usuario/catalogo-automotriz.git
   git branch -M main
   git push -u origin main
   ```
   (Te pedirá iniciar sesión en GitHub la primera vez.)

**2. Publicarlo en Vercel**

1. Entra a [vercel.com/new](https://vercel.com/new) e inicia sesión con tu cuenta de GitHub.
2. Elige "Import" sobre el repositorio que acabas de subir.
3. Vercel detecta automáticamente que es un sitio estático (Framework Preset: "Other") — no hay que tocar nada de configuración de build ni Root Directory, ya que `index.html` está en la raíz del repo.
4. Dale clic a "Deploy". En un minuto tendrás una URL pública (`tu-proyecto.vercel.app`).
5. Cada vez que hagas `git push` a `main`, Vercel vuelve a publicar automáticamente la nueva versión.

Si más adelante quieres conectar un dominio propio, eso se hace desde el panel del proyecto en Vercel → pestaña "Domains".

## Antes de publicarlo — pendientes importantes

Edita **`assets/js/main.js`**, bloque `CONFIG` al inicio del archivo:

```js
const CONFIG = {
  quoteEmail: "mercadeo@ip7.com.co",
};
```

Ese es el correo al que llegan las solicitudes de cotización (con todos los productos y cantidades). Justo debajo está el arreglo `EXECUTIVES`, con los comerciales que se muestran en "Hablar con tu ejecutivo":

```js
const EXECUTIVES = [
  { name: "Yanira Silva", email: "ejecutivo.comercial8@ip7.com.co" },
  { name: "Margarita Salinas", email: "margaritasalinas@ip7.com.co" },
  { name: "Elizabeth Leon", email: "ejecutivo.comercial5@ip7.com.co" },
  { name: "Sevastian Velosa", email: "ejecutivo.comercial3@ip7.com.co" },
  { name: "Daniel Alvarez", email: "ejecutivo.comercial4@ip7.com.co" },
  { name: "Servicio al cliente", email: "servicioalcliente@ip7.com.co", general: true },
];
```

Para agregar, quitar o cambiar un comercial, edita este arreglo. El que tenga `general: true` (hoy "Servicio al cliente") se marca como "(opción general)" en el selector, pensado para clientes que no tienen un comercial asignado todavía.

Justo debajo hay un segundo arreglo, `WHATSAPP_EXECUTIVES`, con los mismos comerciales pero con su número de celular (sin Margarita Salinas, que hoy no tiene WhatsApp asignado) — este es el que se usa en los botones "Contactar a mi ejecutivo" / "Hablar con un ejecutivo" repartidos por el sitio:

```js
const WHATSAPP_EXECUTIVES = [
  { name: "Yanira Silva", phone: "573001715354" },
  { name: "Elizabeth Leon", phone: "573006015812" },
  { name: "Sevastian Velosa", phone: "573001715355" },
  { name: "Daniel Alvarez", phone: "573001715339" },
  { name: "Servicio al cliente", phone: "573008181464", general: true },
];
```

El teléfono va en formato internacional, solo dígitos (57 + celular, sin `+` ni espacios).

## Dos formas de contactar, con propósitos distintos

- **"Contactar a mi ejecutivo" / "Hablar con un ejecutivo"** (header, hero, CTA final, barra móvil): abre una ventana con la lista de `WHATSAPP_EXECUTIVES` — el cliente elige a quién escribirle y se abre WhatsApp con un saludo ya redactado. Pensado para una consulta rápida.
- **"Solicitar cotización"** (desde el carrito de productos seleccionados): abre el formulario completo, que incluye el campo obligatorio "¿A quién quieres dirigir tu cotización?" con la lista de `EXECUTIVES` (por correo). Pensado para dejar una solicitud formal con productos y cantidades.

El sitio no tiene backend propio, así que al enviar la cotización:

1. Se arma un correo (`mailto:`) dirigido al **comercial que el cliente eligió** en el formulario, con copia (`cc`) a `mercadeo@ip7.com.co` para que el equipo de marketing también quede al tanto.
2. **Copiar solicitud** sigue disponible como respaldo — copia el texto al portapapeles por si el cliente prefiere pegarlo en otro canal.

Si más adelante quieres que el formulario se envíe automáticamente sin depender del correo del cliente (por ejemplo con EmailJS, Formspree o un backend propio), en `assets/js/main.js` busca la función `sendQuoteRequest` (comentada, con un ejemplo de `fetch`) y las líneas:

```js
// sendQuoteRequest(payload); // <- conecta aquí tu backend/API cuando esté listo
```

Descomenta y ajusta esa llamada — `payload` ya trae los datos del cliente y la lista de productos con cantidades, listos para enviar.

## Cómo agregar, editar o quitar productos

Todo el catálogo vive en **`assets/js/products.js`**, no hay que tocar el HTML.

1. Copia un objeto de producto existente.
2. Cambia `id` (único), `name`, `code`, `category` (debe ser uno de los slugs definidos en `CATEGORIES`, arriba del archivo), `description`, `features` (2-3 recomendado) y `minQty` (ver siguiente sección).
3. Pon la(s) foto(s) del producto en `assets/img/productos/` y apúntalas en `images`.

Para agregar una categoría nueva, agrégala también al arreglo `CATEGORIES` al inicio del archivo (define el orden de aparición) **y** agrega su botón de filtro en `index.html`, dentro de `<div class="filter-pills" id="filterPills">` (copia un botón existente y cambia `data-filter` al slug y el texto visible). El orden actual es: Boutique, Accesorios, Viaje, Tecnología, Café, Herramientas, Llaveros, Litografía, Comestibles, Sets, Paraguas, Bolsas.

## Cantidad mínima por producto

Cada producto tiene su propio campo `minQty` en `assets/js/products.js` (por ejemplo `minQty: 20`), así que cada uno puede tener un mínimo distinto — no hay un solo número global. La tarjeta de cada producto usa ese valor para el mínimo del selector, el valor inicial y los 4 botones rápidos de cantidad (que se calculan automáticamente como `minQty × 1, × 2, × 5, × 10`, con un tope de 50.000 unidades). El carrito también respeta el mínimo de cada producto al editar la cantidad.

Si un producto no trae `minQty`, se usa 5 por defecto (constante `DEFAULT_MIN_QTY` al inicio de `assets/js/main.js`).

### Cómo agregar más de una foto por producto

Cada producto tiene un campo `images` (un arreglo, no un solo texto). Con una foto:

```js
images: ["assets/img/productos/mi-producto.jpg"],
```

Con varias fotos (distintos ángulos, colores, usos, etc.):

```js
images: [
  "assets/img/productos/mi-producto-1.jpg",
  "assets/img/productos/mi-producto-2.jpg",
  "assets/img/productos/mi-producto-3.jpg",
],
```

En cuanto un producto tenga más de una imagen, la tarjeta arma sola un mini carrusel (flechas al pasar el mouse, puntos indicadores, deslizar con el dedo en celular). No hay límite de fotos. El producto "Buso con Capota" (`assets/js/products.js`) ya usa 4 fotos como ejemplo de referencia.

## Fotos de producto

La mayoría de las fotos se recortaron en alta resolución directamente del archivo fuente (`Catalogo Automotriz.ai`, que internamente es un PDF) para que se vean nítidas y no pixeladas. Las fotos de la línea **Llaveros** quedaron en menor resolución porque esa página no existe en ese archivo fuente — si tienes ese diseño en mejor calidad, reemplaza los archivos en `assets/img/productos/llavero-*.jpg` (mismo nombre) para mejorarlas.

También encontré que el archivo fuente tiene una versión alterna del 6º producto de Tecnología: un "Cargador Emmet" (código TE-484) en vez de los "Audífonos Bluetooth Air i7" que ya estaban en el catálogo. Dejé el producto tal como estaba (Audífonos), pero ya recorté esa foto en alta resolución por si prefieres usarla: `assets/img/productos/cargador-emmet-te484.jpg` (no está referenciada en `products.js` todavía).

Si tienes fotos de mejor calidad o más productos, solo reemplaza el archivo en `assets/img/productos/` (mismo nombre) o agrega uno nuevo y referencia su ruta en `products.js` — o usa el **editor de fotos** (ver siguiente sección), que hace esto sin tocar archivos a mano.

**Nota sobre "Botellas de Agua" (MER-TE):** en la página fuente, las 8 referencias vienen como una sola franja panorámica de fotos muy pequeñas, sin espacio suficiente para recortar cada una por separado con buena calidad. Por ahora se usa esa franja completa como una sola foto del producto. Si tienes una foto individual de cada botella (o de mejor resolución), puedo separarlo en 8 productos o en una galería de 8 fotos dentro de este mismo producto.

Las descripciones y características de cada producto son textos de referencia/borrador — reemplázalos por la información real (materiales, tiempos de entrega, técnicas de marcación, precios si aplica) cuando la tengas disponible.

## Editor de fotos (`admin.html`)

Herramienta interna — no aparece en la navegación del catálogo público, solo hay un enlace discreto al final del pie de página ("Editor de fotos (equipo interno)"). Ábrela en `admin.html`.

Cómo usarla:
1. Haz clic en cualquier foto del listado para abrir el editor.
2. Elige una foto nueva de tu computador (o arrástrala).
3. Ajusta el encuadre: arrastra la imagen para moverla, usa el control de zoom para acercar/alejar.
4. Guarda:
   - **"Guardar en la carpeta"** (Chrome/Edge en computador): la primera vez te pide seleccionar la carpeta `assets/img/productos` de este proyecto — dale permiso una sola vez. Desde ahí, cada "Guardar" reemplaza el archivo directamente, con el nombre correcto. Solo recarga el catálogo (F5) para ver el cambio — no hay que tocar código.
   - **"Descargar imagen"** (cualquier navegador): descarga el archivo ya con el nombre correcto; solo tienes que arrastrarlo a `assets/img/productos/` tú mismo (por ejemplo por FTP o el administrador de archivos de tu hosting).

Nota: el editor reemplaza fotos que **ya existen** en el catálogo (cualquiera de las 51 fotos actuales, incluidas las 4 del "Buso con Capota"). Si quieres agregar una foto adicional a un producto que hoy solo tiene una (es decir, una posición nueva en su carrusel), sigue haciendo falta agregar esa ruta en `images` dentro de `products.js` (ver sección anterior) — el editor no crea productos ni posiciones nuevas por sí solo.

## Tamaño recomendado de las imágenes

- **Fotos de producto:** el editor siempre guarda en 1200×1200 px (cuadradas), formato JPG. Para que se vean nítidas, sube fotos originales de **al menos 1200 px** en su lado más corto — entre más grande la original, mejor se ve el acercamiento/zoom dentro del editor.
- **Logo:** PNG con fondo transparente, apaisado (más ancho que alto, como el tuyo). Recomendado exportarlo a unos **150–200 px de alto** (se muestra a 38 px en el menú y 34 px en el pie de página, así que ese tamaño da margen de sobra para que se vea nítido en pantallas de alta resolución) — el ancho queda proporcional. Procura que el archivo pese poco (idealmente bajo 100 KB); un PNG optimizado a ese tamaño normalmente lo logra sin perder calidad.

## Logo según el tema (modo día / modo noche)

El sitio ya está preparado para mostrar un logo distinto según el modo:

- `assets/img/brand/logo-blanco.png` — se usa en **modo noche** (fondo oscuro).
- `assets/img/brand/logo-azul.png` — se usa en **modo día** (fondo blanco).

Coloca ahí esos dos archivos PNG con fondo transparente (mismo nombre exacto) y el logo cambiará solo al hacer clic en el botón de día/noche del menú. Mientras no existan esos archivos, el sitio sigue mostrando el logo actual (`logo.jpg`) en ambos modos, así que nada se rompe si aún no los has subido.

## Estructura

```
web/
├── index.html
├── admin.html                ← editor de fotos (uso interno)
├── assets/
│   ├── css/styles.css       ← estilos y animaciones del catálogo
│   ├── css/admin.css        ← estilos propios del editor de fotos
│   ├── js/products.js       ← datos del catálogo (editar aquí para agregar productos)
│   ├── js/main.js           ← lógica del catálogo: filtros, carrito, formulario, WhatsApp/correo
│   ├── js/admin.js          ← lógica del editor de fotos
│   └── img/
│       ├── brand/           ← logo(s) y foto de héroe
│       └── productos/       ← fotos de cada producto
└── README.md
```
