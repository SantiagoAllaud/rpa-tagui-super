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
│   ├── test_suite.js            # Batería completa de 33 pruebas unitarias determinísticas (Tests 1-24 + 31-39)
│   └── smoke_tagui.tag          # Smoke test para verificar operatividad del motor TagUI
│
├── menu_interactivo.js          # Menú interactivo de selección determinística desde terminal
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

## 🛡️ Política Obligatoria de Atributos Ausentes y Contradicciones (Reglas 1 a 16)

El sistema implementa una política formal y determinística de identidad comercial, asegurando que ningún producto sustituto o incompatible sea aceptado bajo ninguna circunstancia.

### Estados de Atributo
Todo atributo evaluado durante la validación posee exclusivamente uno de estos tres estados:
- **`MATCH`**: Existe evidencia suficiente y positiva en la ficha y coincide con el catálogo.
- **`MISMATCH`**: Existe evidencia explícita de contradicción (prioridad absoluta; siempre obliga a rechazar).
- **`UNKNOWN`**: Falta de evidencia (no aparece, no puede extraerse o el sitio no lo expone). **UNKNOWN jamás significa MATCH**.

---

### Reglas Centrales de la Política

| Regla | Principio | Comportamiento del RPA |
| :--- | :--- | :--- |
| **Regla 1 (MATCH)** | Evidencia positiva | Coincidencia confirmada (ej. catálogo 1 L = PDP "1 Lt."). |
| **Regla 2 (MISMATCH)** | Contradicción explícita | Prioridad sobre cualquier UNKNOWN. Obliga a rechazar de inmediato. |
| **Regla 3 (UNKNOWN)** | Falta de evidencia | No demuestra coincidencia ni ausencia. |
| **Regla 4 (Atributos Obligatorios)** | Demostración de identidad | `producto/tipo`, `marca`, `cantidad` y `unidad` son obligatorios. Si alguno es UNKNOWN -> `INVALID_INSUFFICIENT_DATA` -> Rechazar. |
| **Regla 5 (Atributos Adicionales)** | Variantes, SKU, EAN | Si coinciden: MATCH; si contradicen: MISMATCH; si no aparecen: UNKNOWN. |
| **Regla 6 (UNKNOWN Admisible)** | Ausencia sin riesgo | Un adicional UNKNOWN solo se acepta si obligatorios son MATCH, no hay MISMATCH y no hay ambigüedad. |
| **Regla 7 (Ambigüedad)** | Competidores en catálogo | Si faltan atributos distintivos frente a otros productos posibles (ej. Coca Original vs Zero) -> `INVALID_AMBIGUOUS` -> Rechazar. |
| **Regla 8 (SKU)** | Identificador de tienda | Coincide: MATCH. Difiere: MISMATCH. No expuesto: UNKNOWN. |
| **Regla 9 (EAN)** | Código de barras global | Coincide: MATCH. Difiere: MISMATCH. No expuesto: UNKNOWN. |
| **Regla 10 (Presentación)** | Determinación unívoca | Reconstrucción rigurosa desde cantidad, unidad, título y descripción. Nunca asumir por omisión. |
| **Regla 11 (Prohibición)** | No inferir desde ausencia | **PROHIBIDO**: "no dice vegetal" no implica leche animal; "no dice zero" no implica original. |
| **Regla 12 (Prioridad)** | Contradicción manda | Ante al menos un MISMATCH -> `INVALID_MISMATCH` inmediato. |
| **Regla 13 (Resultados)** | Función formal | `validarIdentidadPDP(...)` devuelve exclusivamente: `VALID_EXACT`, `INVALID_MISMATCH`, `INVALID_AMBIGUOUS`, `INVALID_INSUFFICIENT_DATA`, junto con diagnóstico detallado. |
| **Regla 14 (VALID_EXACT)** | Condiciones de éxito | Cumplimiento simultáneo de todos los obligatorios, 0 contradicciones y 0 ambigüedades. |
| **Regla 15 (Dos Capas)** | Listado y PDP | **Capa 1 (Tarjetas):** Filtro DOM previo al clic para descartar incompatibles. **Capa 2 (PDP):** Evaluación estructural completa. |
| **Regla 16 (Caso Lechería)** | Erradicación de falsos positivos | Solicitud: `Leche La Serenísima 1L`. Hallazgo en Día: `Bebida Vegetal Almendra...` -> Detecta `producto/tipo = MISMATCH` -> `INVALID_MISMATCH` -> Rechazado, `EsEquivalente = 'NO'`, `Precio = 'N/D'`. |

> **REGLA DE ORO:**
> `MATCH` = evidencia positiva de coincidencia.
> `MISMATCH` = evidencia positiva de contradicción.
> `UNKNOWN` = falta de evidencia.
> `UNKNOWN` jamás puede transformarse automáticamente en `MATCH`.
> `MISMATCH` siempre obliga a rechazar.

---

## 🧪 Pruebas Automatizadas y Verificación

El proyecto cuenta con verificación automatizada integral en múltiples capas:

### 1. Batería de 50 Pruebas Unitarias Determinísticas (Tests 1-24, 31-39 y 40-56)
Ejecuta la suite completa de 50 pruebas unitarias en Node.js que verifican campos de entrada, separación de productos, jerarquía DOM, PDP, parseo de precios, stock, promociones, menú interactivo y las 16 reglas de la política de identidad:
```bash
node tests/test_suite.js
```
*Salida esperada:* `[EXITO TOTAL] Las 50 pruebas pasaron satisfactoriamente.`

### 2. Smoke Test de TagUI en Modo Visible
Verifica que el motor TagUI opera correctamente interactuando con Chrome a pantalla completa, manipulando el DOM y persistiendo archivos locales:
```bash
tagui tests/smoke_tagui.tag
```
*Salida esperada:* `[OK] Motor TagUI operativo, interactua con DOM y escribe archivos.`

### 3. Verificación de Integridad y Atributos del Catálogo
Verifica que no existan duplicados de ID, SKU o EAN y que todos los productos contengan sus metadatos de identidad:
```bash
node catalogo/actualizar_catalogo.js verificar
```

---

## 🚀 Instrucciones de Uso en Vivo

### 1. Modo Interactivo desde Terminal (Por Defecto)
Hacer doble clic sobre el archivo:
```
ejecutar.bat
```
O ejecutar en la terminal:
```bash
node menu_interactivo.js
```

Flujo interactivo paso a paso:
1. **Menú Principal:**
   ```text
   ============================================================
   RPA COMPARADOR DE PRECIOS - UTN FRCU
   ====================================

   1 - Elegir producto del catálogo
   2 - Salir
   ```
2. **Búsqueda / Filtrado:** Ingrese un término (ej. `oreo`) o presione Enter para listar todo el catálogo activo.
3. **Listado Numérico Temporal:**
   ```text
   1 - Galletitas | Oreo | 118g
   2 - Galletitas | Oreo | 154g
   ```
4. **Selección:** Ingrese el número temporal (ej. `1`). El sistema recupera el registro original de `catalogo/productos.json` y valida su integridad e inmutabilidad.
5. **Ficha Resumen y Confirmación:**
   ```text
   ============================================================
   PRODUCTO SELECCIONADO
   =====================
   Producto: Galletitas
   Marca: Oreo
   Cantidad: 118
   Unidad: g
   Presentación: 118g
   ID: GAL_OREO_118G

   Disponibilidad de referencias:
   Carrefour: SI
   COTO: SI
   Día %: SI
   ============================================================

   ¿Ejecutar RPA con este producto? [S/N]: S
   ```
6. **Ejecución Automática:** Genera la entrada de trabajo, ejecuta la barrera obligatoria `validar_input.js` e inicia el RPA en Google Chrome visible.

### 2. Modo Manual Alternativo (`input.csv`)
Si se desea correr un lote predefinido o realizar pruebas sin interacción:
- Editar directamente `input.csv` con las 4 columnas (`producto,marca,cantidad,unidad`).
- Ejecutar:
  ```bash
  ejecutar.bat manual
  ```
  *(O definir la variable `set MODO=MANUAL`)*.

El lanzador omitirá el menú de terminal y ejecutará directamente `validar_input.js input.csv` y TagUI.

---

## ⚙️ Requisitos del Entorno
- **Sistema Operativo:** Windows 10 / 11.
- **Google Chrome** instalado y actualizado.
- **Node.js** (v14 o superior) disponible en el `PATH`.
- **TagUI** (v6+) disponible en el `PATH`.

