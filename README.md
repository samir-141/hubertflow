# Sistema de Digitalización y Auditoría BEEFLOW 🐝

Solución completa para digitalizar, capturar en campo y generar el documento oficial **"Formulario de auditoria de servicio - BEEFLOW"** respetando al 100% su formato visual original para lectura OCR.

---

## 📁 Archivos Disponibles en este Proyecto

| Archivo | Opción | Descripción |
| :--- | :---: | :--- |
| [`index.html`](./index.html) | **Opción B** | **Aplicación Web Interactiva**: Formulario para móvil/tablet + Generador de Lotes + Vista Previa A4 en tiempo real + Exportación a PDF directo. |
| [`style.css`](./style.css) | **Opción A & B** | Sistema de diseño moderno para la interfaz y reglas `@page { size: A4 landscape; }` para impresión idéntica. |
| [`app.js`](./app.js) | **Opción B** | Lógica reactiva, guardado local automático (`localStorage`), cálculo de métricas, paginación en bloques de 40 (20 + 20) y motor PDF. |
| [`template_print.html`](./template_print.html) | **Opción A** | **Plantilla HTML + CSS Standalone**: Plantilla limpia y autocontenida con función JavaScript `renderBeeFlowAudit(data)` para inyección de datos (ideal para Puppeteer, Playwright o headless). |
| [`generate_excel.py`](./generate_excel.py) | **Opción C** | **Script en Python (`openpyxl`)**: Crea la plantilla oficial en Excel (.xlsx) con anchos de columna, estilos y orientación horizontal lista para exportar a PDF. |
| [`server.js`](./server.js) | Utilidad | Servidor local HTTP en Node.js sin dependencias externas. |

---

## 🎯 Características del Formato Reproducido

1. **Orientación y Medidas**: Formato **A4 Horizontal (Landscape: 297mm × 210mm)**.
2. **Encabezado Oficial**:
   - Título centrado: `Formulario de auditoria de servicio - BEEFLOW` (Arial Negrita 15pt).
   - Instrucciones exactas en 2 líneas.
   - Metadatos en cuadrícula: `CAMPO`, `APICULTOR`, `FECHA`, `PROYECTO`, `LOTE`.
3. **Estructura de Columnas (2 tablas idénticas de 20 filas por hoja = 40 colmenas/hoja)**:
   - **N°**: Identificador de colmena (ej. `C104`, `C105`...).
   - **Marcos**: Espacio para el dígito de marcos cubiertos con abejas.
   - **Muerta**: Recuadro de checkbox OCR (`☐` o con `X`).
   - **Maxpoll**: Recuadro de checkbox OCR (`☐` o con `X`).
   - **ToBEE**: Recuadro de checkbox OCR (`☐` o con `X`).
   - **Torta P.**: Recuadro de checkbox OCR (`☐` o con `X`).
4. **Paginación Automática y Ajuste Estricto a 1 Hoja**:
   - Cada hoja alberga exactamente **40 colmenas (20 columna izquierda + 20 columna derecha)**.
   - La altura de cada fila (`5.75mm`) y el espaciado vertical (`172mm` en total) garantizan que las 20 filas **NUNCA se corten ni se desborden** a una segunda hoja dentro del estándar A4 horizontal (`210mm`).
   - El motor de exportación a PDF procesa cada hoja por separado de forma milimétrica (sin divisiones automáticas ni saltos no deseados).
5. **Responsividad al 100%**:
   - La interfaz se adapta dinámicamente a pantallas móviles, tablets, laptops y pantallas de escritorio.
   - En la **Vista Previa**, el selector de Zoom incluye la opción **"Auto (Ajustar a Pantalla)"**, la cual calcula la escala proporcional en tiempo real al cambiar el tamaño de la ventana o girar el dispositivo móvil/tablet.
6. **Nota al pie OCR**:
   - `Nota: la columna N° queda vacia a proposito; el sistema OCR no la interpreta.`

---

## 🚀 Cómo Usar la Solución

### Opción 1: Abrir la Aplicación Web en el Navegador
1. Puedes hacer doble clic en [`index.html`](./index.html) para abrirlo directamente en cualquier navegador (Chrome, Edge, Firefox, Safari).
2. O ejecutar el servidor local incluido:
   ```bash
   node server.js
   ```
   Y abrir `http://localhost:3000/`.

### Flujo de Trabajo en la App:
1. **Completar Metadatos**: Ingresa el Campo, Apicultor, Fecha, Proyecto y Lote.
2. **Generador Rápido de Serie**:
   - Configura el prefijo (`C`), número inicial (`104`), cantidad (`40`) y marcas por defecto.
   - Haz clic en **"Generar Serie"** para poblar el lote en 1 segundo.
3. **Captura Rápida en Campo**:
   - Modifica marcos usando los botones táctiles `+` / `-`.
   - Marca o desmarca casillas con un solo toque.
4. **Exportar a PDF**:
   - Haz clic en **"Descargar PDF"** para generar el archivo de forma automática (1 hoja exacta por cada 40 colmenas).
   - O haz clic en **"Imprimir A4"** para abrir el cuadro de impresión nativo del navegador con máxima calidad vectorial (300 DPI).
"# hubertflow" 
