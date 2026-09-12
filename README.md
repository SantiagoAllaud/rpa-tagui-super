# 🛒 UTN FRCU – Tecnologías para la Automatización
## RPA Supermercados: Comparador y Extractor de Precios con TagUI

Automatización robótica de procesos (RPA) desarrollada en **TagUI** para consultar, validar equivalencias y comparar precios de una canasta de productos en los principales supermercados de Argentina: **Carrefour**, **COTO Digital** y **Día %**, ejecutada de manera **VISIBLE** en **Google Chrome**.

---

## 📌 Descripción del Proyecto

El robot automatiza la búsqueda periódica de productos comestibles y de limpieza con soporte para especificación de **presentación** (cantidad y unidad) y **marca**.

A partir de un archivo de entrada (`input.csv`), el robot:
1. Abre **Google Chrome** de manera visible.
2. Ingresa de forma independiente a **Carrefour**, **COTO** y **Día %**.
3. Cierra de forma no bloqueante cookies, avisos de ubicación, códigos postales y promociones.
4. Detecta el campo de búsqueda mediante una estrategia por niveles (priorizando atributos, IDs, placeholders y selectores semánticos).
5. Escribe el producto y ejecuta la búsqueda.
6. Extrae múltiples candidatos del árbol DOM.
7. **Valida equivalencia real**: compara cantidad, unidad normalizada (`G`, `KG`, `ML`, `L`) y marca solicitada (descartando automáticamente diferencias de tamaño como `200ml` cuando se solicitó `1L`).
8. Clasifica el resultado en estados claros: `OK`, `PRODUCTO_NO_ENCONTRADO`, `PRESENTACION_NO_ENCONTRADA`, `MARCA_NO_ENCONTRADA`, `ERROR_TIMEOUT`, etc.
9. **Compara únicamente productos equivalentes**, los ordena de menor a mayor precio y señala cuál es el **MÁS BARATO** y el **MÁS CARO**.
10. Persiste los resultados consolidados en `resultados.csv` con un esquema enriquecido de 13 columnas.

---

## 🏛️ Diagrama de Arquitectura

![Arquitectura del Bot](estructura.png)

---

## 📂 Estructura de Archivos

```plaintext
rpa tagui super/
│
├── estructura.png             # Diagrama de arquitectura del flujo RPA
├── input.csv                  # Archivo de entrada con la lista de productos (soporta cantidad/unidad)
├── resultados.csv             # Archivo generado con los datos extraídos y clasificados (13 columnas)
├── scraper_supermercados.tag  # Script principal de TagUI (flujo visible en Chrome)
├── tagui_local.js             # Funciones auxiliares JS (parsing, normalización, equivalencias, comparación)
├── ejecutar.bat               # Lanzador por doble clic en Windows (Chrome visible)
└── README.md                  # Documentación del proyecto
```

---

## 📊 Formato de Datos

### 1. Entrada (`input.csv`)
Archivo CSV con cabecera `producto`, soportando solicitudes genéricas o con presentación y marca:

```csv
producto
leche 1L
arroz 500g
fideos 500g
yerba mate 1kg
aceite 900ml
```

### 2. Salida (`resultados.csv`)
Archivo CSV con esquema completo de 13 columnas:

```csv
Nombre,Precio,Supermercado,URL,Fecha,Estado,ProductoSolicitado,Marca,Cantidad,Unidad,Presentacion,PrecioNumerico,EsEquivalente
"Leche Protein La Serenisima 1L","$ 2.340,00","Carrefour","https://...","11/09/2026","OK","leche 1L","Generica","1","L","1L","2340","SI"
"Leche Larga Vida Parcialmente Descremada COTO 1l","$1.698,97","COTO","https://...","11/09/2026","OK","leche 1L","Generica","1","L","1L","1698.97","SI"
"Leche Semi Descremada DIA Larga Vida 1 Lt.","$ 1.700","Día %","https://...","11/09/2026","OK","leche 1L","Generica","1","L","1L","1700","SI"
```

---

## 🛠️ Instalación y Requisitos

1. **Google Chrome**: Asegurarse de tener instalado el navegador Google Chrome.
2. **TagUI**:
   - Descargar la última versión desde el repositorio oficial: [TagUI Releases](https://github.com/aisingapore/TagUI/releases).
   - Descomprimir el archivo `.zip` en una carpeta permanente (ejemplo: `C:\tagui` o `C:\Users\<usuario>\tagui`).
   - Agregar la ruta de la carpeta `src` (ejemplo: `C:\Users\<usuario>\tagui\src`) a la variable de entorno `PATH` de Windows.
   - Para verificar la instalación, abrir CMD y ejecutar:
     ```cmd
     tagui
     ```

---

## 🚀 Instrucciones de Uso

### Opción A: Mediante el archivo ejecutable (Recomendado)
Hacer doble clic sobre el archivo:
```
ejecutar.bat
```
El script liberará automáticamente cualquier puerto bloqueado, validará `tagui` e `input.csv`, abrirá **Google Chrome VISIBLE** y mostrará los logs en consola paso a paso.

### Opción B: Mediante línea de comandos (CLI)
Abrir una terminal en el directorio del proyecto y ejecutar:

```bash
# Modo VISIBLE en Chrome (Requerido)
tagui scraper_supermercados.tag input.csv

# Modo con reporte HTML detallado
tagui scraper_supermercados.tag input.csv -report
```

---

## ⚙️ Características Técnicas y Robustez

- **Sin mouse virtual**: Interacción directa con el DOM real (clics por XPath y tipeo de búsqueda).
- **Extracción multicandidato**: Analiza hasta 10 productos por tienda para encontrar la mejor coincidencia en vez de tomar ciegamente el primer ítem.
- **Normalización de Unidades**:
  - `g`, `gr`, `gramos` → `G`
  - `kg`, `kilo`, `kilos`, `kilogramo` → `KG` (1 KG = 1000 G)
  - `ml`, `mililitros` → `ML`
  - `l`, `lt`, `litro`, `litros` → `L` (1 L = 1000 ML)
- **Comparación de Equivalencia**: Descarta de la comparación de precios a los productos que no coincidan en tamaño (ej. `200ml` vs `1L`) o en la marca explícita solicitada.
- **Resiliencia ante fallos**: Si un supermercado presenta timeout o error, se registra su estado específico (`ERROR_TIMEOUT`, `PRODUCTO_NO_ENCONTRADO`, etc.) y el bot continúa con el siguiente sin detenerse.
