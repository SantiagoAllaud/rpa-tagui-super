# 🛒 UTN FRCU – Tecnologías para la Automatización
## RPA Supermercados: Comparador Determinístico con Catálogo Previo y TagUI

Automatización robótica de procesos (RPA) desarrollada en **TagUI + JavaScript** para consultar, extraer en vivo y comparar precios, stock y promociones de una canasta de productos en los principales supermercados de Argentina: **Carrefour**, **COTO Digital** y **Día %**, ejecutada de manera **VISIBLE en Google Chrome** mediante una **arquitectura basada en catálogo local previo**.

---

## 📌 Descripción del Proyecto y Nueva Arquitectura

El sistema elimina la necesidad de que el robot intente interpretar o adivinar en tiempo real si un producto corresponde al solicitado. En su lugar, el flujo opera de manera **determinística**:

1. **Catálogo Local Normalizado (`catalogo/productos.json`)**: Almacena los productos con su identificador interno (`id_producto`), producto, marca, cantidad, unidad y las referencias directas (URLs/términos exactos) para cada supermercado.
2. **Entrada Estricta del Usuario (`input.csv`)**: El usuario debe especificar obligatoriamente los 4 campos del producto:
   - **Producto** (ej. `Galletitas`)
   - **Marca** (ej. `Oreo`)
   - **Cantidad** (ej. `117`)
   - **Unidad** (ej. `g`)
   *(No se admiten búsquedas genéricas o incompletas)*.
3. **Validación Previa Inmediata (`validar_input.js`)**: Antes de abrir el navegador, el sistema valida la combinación contra el catálogo:
   - Si es válido: Genera `input_tagui.csv` con las referencias resueltas para cada tienda y da paso al RPA.
   - Si es inválido o no existe: Emite un error explícito en consola y **aborta la ejecución sin iniciar TagUI**.
4. **Ejecución Visual en Vivo de TagUI (`scraper_supermercados.tag`)**:
   - Google Chrome abre visible y se maximiza a pantalla completa (`F11`).
   - Navega a Carrefour, COTO y Día % de forma visible.
   - Realiza la búsqueda, ordenamiento por menor precio y scroll pedagógico en 3 oleadas.
   - Hace clic real en la tarjeta del producto, ingresa a la ficha individual y permanece **4 segundos visibles**.
   - Extrae en tiempo real: **Precio actual**, **Stock** (`DISPONIBLE` / `AGOTADO`) y **Promociones** (ej. `"2x1"`, `"70% en la 2da unidad"`).
5. **Persistencia y Cuadro Comparativo (`resultados.csv`)**:
   - Guarda los resultados en un archivo CSV de **15 columnas** y genera el ranking en consola indicando cuál es el más barato y la diferencia contra el más caro.

---

## 🏛️ Flujo del Sistema

```text
               CATÁLOGO LOCAL (catalogo/productos.json)
                                ↓
                 USUARIO DEFINE EN input.csv:
               Producto + Marca + Cantidad + Unidad
                                ↓
                    EJECUTAR (ejecutar.bat)
                                ↓
                    VALIDACIÓN PREVIA
                                ↓
                   ¿Existe en el catálogo?
                      ↙            ↘
                    NO              SÍ
                    ↓                ↓
             Muestra ERROR     Producto identificado
            y NO inicia TagUI        ↓
                               INICIA TAGUI (Chrome visible F11)
                                     ↓
                               Carrefour / COTO / Día %
                               (Búsqueda directa + scroll + 
                                click en ficha + 4s visuales)
                                     ↓
                               Obtiene Precio / Stock / Promo
                                     ↓
                           RANKING Y RESULTADOS CSV
```

---

## 📂 Estructura de Archivos

```plaintext
rpa tagui super/
│
├── catalogo/
│   ├── productos.json           # Catálogo local de productos normalizados y referencias de tiendas
│   └── actualizar_catalogo.js   # Script administrativo para listar, verificar o actualizar el catálogo
│
├── tests/
│   ├── test_suite.js            # Batería completa de 24 pruebas unitarias determinísticas
│   └── smoke_tagui.tag          # Smoke test para verificar operatividad del motor TagUI
│
├── validar_input.js             # Validador estricto previo a la ejecución de TagUI
├── input.csv                    # Archivo de entrada con las 4 columnas obligatorias
├── input_tagui.csv              # Archivo intermedio generado con referencias resueltas para TagUI
├── resultados.csv               # Archivo consolidado de salida con 15 columnas
├── scraper_supermercados.tag    # Script principal de TagUI (flujo visual en Chrome)
├── tagui_local.js               # Funciones auxiliares JS (precios, stock, promociones, ranking)
├── ejecutar.bat                 # Lanzador interactivo por doble clic en Windows
└── README.md                    # Documentación del proyecto
```

---

## 📊 Formato de Datos

### 1. Entrada Obligatoria (`input.csv`)
El archivo requiere las 4 columnas para garantizar que el producto esté unívocamente determinado:

```csv
producto,marca,cantidad,unidad
Galletitas,Oreo,118,g
Leche,La Serenisima,1,L
Yerba,Playadito,1,kg
Aceite,Natura,900,ml
Fideos,Matarazzo,500,g
```

> **Nota sobre identidad estricta (ej. 117g vs 118g):**
> La identidad del producto se verifica de manera exacta. Por ejemplo, `GAL_OREO_118G` corresponde al producto real actualmente disponible en góndola en Argentina con EAN y SKUs verificados. Si se ingresa una presentación histórica no disponible como `117g`, el sistema no adivina ni toma arbitrariamente `118g` o `154g`, marcando el resultado fehacientemente como no coincidente salvo justificación explícita de equivalencia en el catálogo.

### 2. Salida Enriquecida (`resultados.csv`)
Archivo CSV con esquema completo y sanitizado de **15 columnas**:

```csv
Nombre,Precio,Supermercado,URL,Fecha,Estado,ProductoSolicitado,Marca,Cantidad,Unidad,Presentacion,PrecioNumerico,Stock,Promocion,EsEquivalente
"Galletitas Dulces Rellenas OREO 118 Gr","$ 1.450,00","Carrefour","https://...","12/09/2026","OK","Galletitas Oreo 118g","Oreo","118","g","118g","1450","DISPONIBLE","2do al 70%","SI"
"Galletitas Dulces Rellenas OREO 118 Gr","$ 1.390,00","COTO","https://...","12/09/2026","OK","Galletitas Oreo 118g","Oreo","118","g","118g","1390","DISPONIBLE","Sin promocion","SI"
"Galletitas Rellenas Vainilla Oreo 118 Gr.","$ 1.420,00","Día %","https://...","12/09/2026","OK","Galletitas Oreo 118g","Oreo","118","g","118g","1420","DISPONIBLE","Precio Club","SI"
```

- **Stock:** Refleja fehacientemente `DISPONIBLE`, `AGOTADO` o `NO_VERIFICADO`.
- **Promocion:** Captura textos reales de oferta (`2x1`, `36% OFF`, `Precio Club`) o reporta `Sin promocion`.
- **EsEquivalente:** Vale `'SI'` exclusivamente si el producto superó con éxito los criterios estrictos de identidad.

---

## 🧪 Pruebas Automatizadas y Verificación

El proyecto cuenta con verificación automatizada en múltiples niveles:

### 1. Batería de 24 Pruebas Unitarias Determinísticas
Ejecuta la suite completa de 24 pruebas que validan entradas, identidad, jerarquía DOM, PDP, parseo de precios, stock y promociones:
```bash
node tests/test_suite.js
```
*Salida esperada:* `[EXITO TOTAL] Las 24 pruebas pasaron satisfactoriamente.`

### 2. Smoke Test de TagUI
Verifica que TagUI puede lanzar el navegador, interactuar con el DOM y escribir archivos locales:
```bash
tagui tests/smoke_tagui.tag -h
```
*Salida esperada:* `[OK] Motor TagUI operativo, interactua con DOM y escribe archivos.`

### 3. Verificación de Integridad del Catálogo
Verifica que no existan duplicados ni inconsistencias en `catalogo/productos.json`:
```bash
node catalogo/actualizar_catalogo.js verificar
```

---

## 🚀 Instrucciones de Uso en Vivo

### Ejecución Directa (Recomendado)
Hacer doble clic sobre el archivo:
```
ejecutar.bat
```
El script realiza los siguientes pasos automatizados:
1. Limpia procesos huérfanos propios de TagUI (`php.exe`, `tee.exe`) y libera el puerto de depuración 9222 **sin afectar aplicaciones del usuario como Excel**.
2. Ejecuta `node validar_input.js input.csv`. Si alguna fila es inválida o no coincide con el catálogo, aborta inmediatamente con código 1 sin abrir Chrome ni generar archivos parciales.
3. Si todas las filas son válidas, abre **Google Chrome en modo VISIBLE y pantalla completa (F11)**.
4. Para cada tienda (Carrefour, COTO y Día %):
   - Localiza la tarjeta en el DOM siguiendo la jerarquía estricta: `SKU -> EAN -> URL -> Tokens de Identidad`.
   - Realiza scroll visual y clic real sobre la tarjeta confirmada.
   - Valida en la ficha individual (PDP) los 5 criterios obligatorios (Marca, Producto, Cantidad, Unidad, Presentación).
   - Permanece **4 segundos pedagógicos visibles** en la ficha para demostración ante la cátedra.
5. Genera `resultados.csv` (15 columnas) y proyecta en la terminal el ranking comparativo por menor precio.

---

## ⚙️ Requisitos del Entorno
- **Sistema Operativo:** Windows 10 / 11.
- **Google Chrome** instalado y actualizado.
- **Node.js** (v14 o superior) disponible en el `PATH`.
- **TagUI** (v6+) disponible en el `PATH`.

