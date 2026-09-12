// ==============================================================================
// RPA Supermercados: Carrefour, COTO y Día %
// Materia: Tecnologías para la Automatización - UTN FRCU
// Arquitectura: TagUI -> Google Chrome Visible -> DOM -> resultados.csv
// Ejecución: tagui scraper_supermercados.tag input.csv
// ==============================================================================

// 1. INICIALIZACIÓN EN LA PRIMERA ITERACIÓN
if iteration equals to 1
    echo ============================================================
    echo INICIANDO AUTOMATIZACION RPA DE SUPERMERCADOS (MODO VISIBLE)
    echo Leyendo lista de productos desde input.csv...
    echo ============================================================
    // Inicializar cabeceras del archivo de persistencia local resultados.csv (13 columnas)
    dump "Nombre","Precio","Supermercado","URL","Fecha","Estado","ProductoSolicitado","Marca","Cantidad","Unidad","Presentacion","PrecioNumerico","EsEquivalente" to resultados.csv

// 2. PREPARACIÓN Y PARSEO DE LA SOLICITUD
fechaActual = getFechaActual()
solicitudObj = parseSolicitud(producto)
solTerm = solicitudObj.producto
encodedProd = encodeSearchTerm(solTerm)

echo 
echo ============================================================
echo RPA SUPERMERCADOS - ITERACION `iteration`
echo ============================================================
echo Solicitud: `producto`
echo Producto base: `solicitudObj.producto`
echo Cantidad requerida: `solicitudObj.cantidad`
echo Unidad requerida: `solicitudObj.unidad`
echo Marca requerida: `solicitudObj.marca`
echo Presentacion requerida: `solicitudObj.presentacion`
echo Fecha: `fechaActual`


// ==============================================================================
// [1/3] CARREFOUR ARGENTINA
// ==============================================================================
echo ------------------------------------------------------------
echo [1/3] CARREFOUR
echo ------------------------------------------------------------
echo -> Abriendo supermercado...
https://www.carrefour.com.ar/
wait 4

echo -> Limpiando cookies y modales...
if (present('//button[@aria-label="Cerrar"]'))
    click //button[@aria-label="Cerrar"]
if (present('//*[@id="onetrust-accept-btn-handler"]'))
    click //*[@id="onetrust-accept-btn-handler"]
if (present('//button[contains(@class,"close")]'))
    click //button[contains(@class,"close")]

xpCarrefourInput = '//input[contains(@placeholder, "buscar") or contains(@placeholder, "Buscar") or @type="search"]'
if (present(xpCarrefourInput))
    echo -> Buscador detectado.
    echo -> Escribiendo: `solTerm`
    click `xpCarrefourInput`
    type `xpCarrefourInput` as [clear]`solTerm`[enter]
    wait 4
else
    echo -> Buscador no visible directamente, navegando a resultados...
    https://www.carrefour.com.ar/`encodedProd`?_q=`encodedProd`
    wait 4

// Fallback de navegación si la página sigue en la home
if (!present('//article[contains(@class,"product")] | //div[contains(@class,"product-summary")]'))
    https://www.carrefour.com.ar/`encodedProd`?_q=`encodedProd`
    wait 4

echo -> Extrayendo candidatos desde el DOM...
dom return (function() { var cards = document.querySelectorAll('article, div[class*="product-summary"], [class*="productCard"]'); var list = []; for (var i = 0; i < Math.min(10, cards.length); i++) { var c = cards[i]; var titleEl = c.querySelector('h2, h3, [class*="productName"], [class*="productBrand"]'); var priceText = 'N/D'; var sp = c.querySelector('[class*="sellingPrice"], [class*="currencyContainer"]'); if (sp && sp.innerText && sp.innerText.indexOf('$') !== -1) { priceText = sp.innerText.trim(); } else { var all = c.querySelectorAll('*'); for (var j = 0; j < all.length; j++) { var t = (all[j].innerText || '').trim(); var m = t.match(/\$\s*[\d\.\,]+/); if (m && t.length < 30) { priceText = m[0]; break; } } } var linkEl = c.querySelector('a[href*="/p"]') || c.querySelector('a[href]'); if (titleEl && priceText !== 'N/D') { list.push({ nombre: titleEl.innerText.trim(), precio: priceText, url: linkEl ? linkEl.href : window.location.href }); } } return JSON.stringify(list); })()

js carrefourCandidatos = JSON.parse(dom_result)
js carrefourSel = seleccionarProductoCorrecto(carrefourCandidatos, solicitudObj)
js carrefourSel.supermercado = "Carrefour"
js carrefourSel.url = formatUrl("https://www.carrefour.com.ar", carrefourSel.url)

echo -> Candidatos analizados: `carrefourCandidatos.length`
echo -> Producto seleccionado: `carrefourSel.nombre`
echo -> Precio: `carrefourSel.precio`
echo -> Estado: `carrefourSel.estado`


// ==============================================================================
// [2/3] COTO DIGITAL
// ==============================================================================
echo ------------------------------------------------------------
echo [2/3] COTO
echo ------------------------------------------------------------
echo -> Abriendo supermercado...
https://www.coto.com.ar/
wait 4

echo -> Limpiando avisos y promociones...
if (present('//button[contains(@class,"close")]'))
    click //button[contains(@class,"close")]
if (present('//button[@aria-label="Cerrar"]'))
    click //button[@aria-label="Cerrar"]

xpCotoInput = '//input[@id="cio-autocomplete-0-input"] | //input[contains(@placeholder, "comprar") or contains(@placeholder, "buscar")]'
if (present(xpCotoInput))
    echo -> Buscador detectado.
    echo -> Escribiendo: `solTerm`
    click `xpCotoInput`
    type `xpCotoInput` as [clear]`solTerm`[enter]
    wait 5
else
    echo -> Buscador no visible directamente, navegando a resultados...
    https://www.coto.com.ar/productos/`encodedProd`
    wait 5

// Fallback de navegación directa a productos si no cargó resultados
if (!present('//div[contains(@class,"centro-precios")]'))
    https://www.coto.com.ar/productos/`encodedProd`
    wait 5

echo -> Extrayendo candidatos desde el DOM...
dom return (function() { var cards = document.querySelectorAll('.centro-precios'); var list = []; for (var i = 0; i < Math.min(10, cards.length); i++) { var cp = cards[i]; var text = cp.innerText || ''; var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; }); var priceMatch = text.match(/\$\s*[\d\.\,]+/); if (lines.length > 0 && priceMatch) { list.push({ nombre: lines[0], precio: priceMatch[0], url: window.location.href }); } } return JSON.stringify(list); })()

js cotoCandidatos = JSON.parse(dom_result)
js cotoSel = seleccionarProductoCorrecto(cotoCandidatos, solicitudObj)
js cotoSel.supermercado = "COTO"
js cotoSel.url = formatUrl("https://www.coto.com.ar/productos/" + encodedProd, cotoSel.url)

echo -> Candidatos analizados: `cotoCandidatos.length`
echo -> Producto seleccionado: `cotoSel.nombre`
echo -> Precio: `cotoSel.precio`
echo -> Estado: `cotoSel.estado`


// ==============================================================================
// [3/3] SUPERMERCADOS DIA %
// ==============================================================================
echo ------------------------------------------------------------
echo [3/3] DÍA
echo ------------------------------------------------------------
echo -> Abriendo supermercado...
https://diaonline.supermercadosdia.com.ar/
wait 4

echo -> Limpiando avisos y modal de codigo postal...
if (present('//button[@aria-label="Cerrar"]'))
    click //button[@aria-label="Cerrar"]
if (present('//button[contains(@class,"close")]'))
    click //button[contains(@class,"close")]

xpDiaInput = '//input[contains(@placeholder, "buscar") or contains(@placeholder, "Buscar") or @type="search"]'
if (present(xpDiaInput))
    echo -> Buscador detectado.
    echo -> Escribiendo: `solTerm`
    click `xpDiaInput`
    type `xpDiaInput` as [clear]`solTerm`[enter]
    wait 4
else
    echo -> Buscador no visible directamente, navegando a resultados...
    https://diaonline.supermercadosdia.com.ar/`encodedProd`?_q=`encodedProd`
    wait 4

// Fallback de navegación si la página sigue en la home
if (!present('//section//article | //div[contains(@class,"product-summary")] | //article[contains(@class,"product")]'))
    https://diaonline.supermercadosdia.com.ar/`encodedProd`?_q=`encodedProd`
    wait 4

echo -> Extrayendo candidatos desde el DOM...
dom return (function() { var cards = document.querySelectorAll('section article, div[class*="product-summary"], article[class*="product"]'); var list = []; for (var i = 0; i < Math.min(10, cards.length); i++) { var c = cards[i]; var titleEl = c.querySelector('span[class*="productBrand"], [class*="productName"], h3, h2'); var priceText = 'N/D'; var sp = c.querySelector('[class*="sellingPrice"], [class*="currencyContainer"]'); if (sp && sp.innerText && sp.innerText.indexOf('$') !== -1) { priceText = sp.innerText.trim(); } else { var all = c.querySelectorAll('*'); for (var j = 0; j < all.length; j++) { var t = (all[j].innerText || '').trim(); var m = t.match(/\$\s*[\d\.\,]+/); if (m && t.length < 30) { priceText = m[0]; break; } } } var linkEl = c.querySelector('a[href*="/p"]') || c.querySelector('a[href]'); if (titleEl && priceText !== 'N/D') { list.push({ nombre: titleEl.innerText.trim(), precio: priceText, url: linkEl ? linkEl.href : window.location.href }); } } return JSON.stringify(list); })()

js diaCandidatos = JSON.parse(dom_result)
js diaSel = seleccionarProductoCorrecto(diaCandidatos, solicitudObj)
js diaSel.supermercado = "Día %"
js diaSel.url = formatUrl("https://diaonline.supermercadosdia.com.ar", diaSel.url)

echo -> Candidatos analizados: `diaCandidatos.length`
echo -> Producto seleccionado: `diaSel.nombre`
echo -> Precio: `diaSel.precio`
echo -> Estado: `diaSel.estado`


// ==============================================================================
// COMPARACIÓN FINAL Y PERSISTENCIA
// ==============================================================================
js comparacion = compararYOrdenar([carrefourSel, cotoSel, diaSel], solicitudObj)

// Persistencia en resultados.csv con esquema completo de 13 columnas
write "`cleanCsv(carrefourSel.nombre)`","`cleanPrice(carrefourSel.precio)`","Carrefour","`carrefourSel.url`","`fechaActual`","`carrefourSel.estado`","`cleanCsv(solicitudObj.raw)`","`cleanCsv(carrefourSel.marca)`","`carrefourSel.cantidad`","`carrefourSel.unidad`","`carrefourSel.presentacion`","`carrefourSel.precioNumerico`","`carrefourSel.esEquivalente`" to resultados.csv
write "`cleanCsv(cotoSel.nombre)`","`cleanPrice(cotoSel.precio)`","COTO","`cotoSel.url`","`fechaActual`","`cotoSel.estado`","`cleanCsv(solicitudObj.raw)`","`cleanCsv(cotoSel.marca)`","`cotoSel.cantidad`","`cotoSel.unidad`","`cotoSel.presentacion`","`cotoSel.precioNumerico`","`cotoSel.esEquivalente`" to resultados.csv
write "`cleanCsv(diaSel.nombre)`","`cleanPrice(diaSel.precio)`","Día %","`diaSel.url`","`fechaActual`","`diaSel.estado`","`cleanCsv(solicitudObj.raw)`","`cleanCsv(diaSel.marca)`","`diaSel.cantidad`","`diaSel.unidad`","`diaSel.presentacion`","`diaSel.precioNumerico`","`diaSel.esEquivalente`" to resultados.csv

echo 
echo [OK] Persistidos resultados para "`producto`" en resultados.csv
echo 
