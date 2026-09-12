// ==============================================================================
// RPA Supermercados: Carrefour Argentina, COTO Digital y Día %
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

// 2. PREPARACIÓN Y PARSEO DINÁMICO DE LA SOLICITUD
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
echo 
echo ------------------------------------------------------------
echo [1/3] CARREFOUR ARGENTINA
echo ------------------------------------------------------------
carrefourResuelto = false
carrefourCandidatos = []
carrefourSel = null

for intentoCarrefour from 1 to 3
    if carrefourResuelto equals to false
        echo -> Intento `intentoCarrefour` de 3 en Carrefour...
        if intentoCarrefour equals to 1
            echo -> Abriendo supermercado Carrefour...
            https://www.carrefour.com.ar/
            wait 3
            echo -> Limpiando obstaculos, banners y modales...
            dom (function(){ var sels = ['button[aria-label="Cerrar"]', '#onetrust-accept-btn-handler', 'button.close', '[class*="modal"] button']; for (var i=0; i<sels.length; i++) { var el = document.querySelector(sels[i]); if(el) try{el.click();}catch(e){} } })()
            
            xpCarrefourInput = '//input[contains(@placeholder, "buscar") or contains(@placeholder, "Buscar") or @type="search"]'
            if (present(xpCarrefourInput))
                echo -> Buscador detectado. Posicionando cursor y escribiendo: `solTerm`
                click `xpCarrefourInput`
                wait 1
                type `xpCarrefourInput` as [clear]`solTerm`
                wait 2
                echo -> Ejecutando busqueda interactiva en Carrefour...
                type `xpCarrefourInput` as [enter]
                wait 4
            else
                echo -> Buscador interactivo no visible, navegando a resultados...
                https://www.carrefour.com.ar/`encodedProd`?_q=`encodedProd`
                wait 4
        else
            echo -> Reintentando navegacion directa en Carrefour...
            https://www.carrefour.com.ar/`encodedProd`?_q=`encodedProd`
            wait 5
        
        // Limpieza de modales y banners
        dom (function(){ var sels = ['button[aria-label="Cerrar"]', '#onetrust-accept-btn-handler', 'button.close', '[class*="modal"] button']; for (var i=0; i<sels.length; i++) { var el = document.querySelector(sels[i]); if(el) try{el.click();}catch(e){} } })()
        
        // Extracción de candidatos desde el DOM
        echo -> Extrayendo candidatos desde el catalogo de Carrefour...
        dom return (function() { var cards = document.querySelectorAll('article, div[class*="product-summary"], [class*="productCard"], [class*="product-card"]'); var list = []; for (var i = 0; i < Math.min(10, cards.length); i++) { var c = cards[i]; var titleEl = c.querySelector('h2, h3, [class*="productName"], [class*="productBrand"], [class*="brandName"]'); var priceText = 'N/D'; var sp = c.querySelector('[class*="sellingPrice"], [class*="currencyContainer"], [class*="price-best"]'); if (sp && sp.innerText && sp.innerText.indexOf('$') !== -1) { priceText = sp.innerText.trim(); } else { var all = c.querySelectorAll('*'); for (var j = 0; j < all.length; j++) { var t = (all[j].innerText || '').trim(); var m = t.match(/\$\s*[\d\.\,]+/); if (m && t.length < 30 && t.indexOf('%') === -1) { priceText = m[0]; break; } } } var linkEl = c.querySelector('a[href*="/p"]') || c.querySelector('a[href]'); if (titleEl && priceText !== 'N/D') { list.push({ nombre: titleEl.innerText.trim(), precio: priceText, url: linkEl ? linkEl.href : window.location.href }); } } return JSON.stringify(list); })()
        
        js carrefourCandidatos = JSON.parse(dom_result || '[]')
        if carrefourCandidatos.length > 0
            carrefourResuelto = true
            echo -> Candidatos obtenidos en Carrefour: `carrefourCandidatos.length`
        else
            echo -> Sin candidatos en Carrefour en intento `intentoCarrefour`
            wait 2

if carrefourResuelto equals to true
    js carrefourSel = seleccionarProductoCorrecto(carrefourCandidatos, solicitudObj)
else
    js carrefourSel = crearResultadoError("Carrefour", "PRODUCTO_NO_ENCONTRADO", "No se obtuvieron candidatos tras 3 intentos", solicitudObj)

js carrefourSel.supermercado = "Carrefour"
js carrefourSel.url = formatUrl("https://www.carrefour.com.ar", carrefourSel.url)

// Mostrar en pantalla el análisis detallado candidato por candidato
echo `carrefourSel.analisisTexto`

// Ingresar a la página individual del producto seleccionado para confirmación visual
if carrefourSel.estado equals to 'OK'
    echo -> Accediendo a la ficha individual del producto en Carrefour...
    targetCarrefourUrl = carrefourSel.url.replace(/^https?:\/\//, '')
    https://`targetCarrefourUrl`
    wait 3
    echo -> Ficha de producto visualizada y confirmada en vivo: `carrefourSel.nombre` (`carrefourSel.precio`)
    wait 1


// ==============================================================================
// [2/3] COTO DIGITAL
// ==============================================================================
echo 
echo ------------------------------------------------------------
echo [2/3] COTO DIGITAL
echo ------------------------------------------------------------
cotoResuelto = false
cotoCandidatos = []
cotoSel = null

for intentoCoto from 1 to 3
    if cotoResuelto equals to false
        echo -> Intento `intentoCoto` de 3 en COTO...
        if intentoCoto equals to 1
            echo -> Abriendo supermercado COTO...
            https://www.coto.com.ar/
            wait 3
            echo -> Limpiando avisos y modales...
            dom (function(){ var sels = ['button[aria-label="Cerrar"]', 'button.close', '[class*="modal"] button']; for (var i=0; i<sels.length; i++) { var el = document.querySelector(sels[i]); if(el) try{el.click();}catch(e){} } })()
            
            xpCotoInput = '//input[contains(@class,"cio-input") or contains(@id,"cio-autocomplete")] | //input[contains(@placeholder, "comprar") or contains(@placeholder, "buscar")]'
            if (present(xpCotoInput))
                echo -> Buscador detectado. Posicionando cursor y escribiendo: `solTerm`
                click `xpCotoInput`
                wait 1
                type `xpCotoInput` as [clear]`solTerm`
                wait 2
                echo -> Sugerencias desplegadas. Haciendo click en boton de busqueda real...
                xpCotoBtn = '//button[contains(@class,"cio-submit-btn") or @aria-label="Submit Search"]'
                if (present(xpCotoBtn))
                    click `xpCotoBtn`
                else
                    type `xpCotoInput` as [enter]
                wait 5
            else
                echo -> Buscador interactivo no visible, navegando a resultados...
                https://www.coto.com.ar/productos/`encodedProd`
                wait 5
        else
            echo -> Reintentando navegacion directa en COTO...
            https://www.coto.com.ar/productos/`encodedProd`
            wait 5
            
        // Limpieza de modales
        dom (function(){ var sels = ['button[aria-label="Cerrar"]', 'button.close', '[class*="modal"] button']; for (var i=0; i<sels.length; i++) { var el = document.querySelector(sels[i]); if(el) try{el.click();}catch(e){} } })()
        
        // Extracción de candidatos desde el DOM
        echo -> Extrayendo candidatos desde el catalogo de COTO...
        dom return (function() { var cards = document.querySelectorAll('.centro-precios, div[class*="product-item"], div[class*="card"]'); var list = []; for (var i = 0; i < Math.min(10, cards.length); i++) { var cp = cards[i]; var text = cp.innerText || ''; var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; }); var priceMatch = text.match(/\$\s*[\d\.\,]+/); var linkEl = cp.querySelector('a[href]'); if (lines.length > 0 && priceMatch) { list.push({ nombre: lines[0], precio: priceMatch[0], url: linkEl ? linkEl.href : window.location.href }); } } return JSON.stringify(list); })()
        
        js cotoCandidatos = JSON.parse(dom_result || '[]')
        if cotoCandidatos.length > 0
            cotoResuelto = true
            echo -> Candidatos obtenidos en COTO: `cotoCandidatos.length`
        else
            echo -> Sin candidatos en COTO en intento `intentoCoto`
            wait 2

if cotoResuelto equals to true
    js cotoSel = seleccionarProductoCorrecto(cotoCandidatos, solicitudObj)
else
    js cotoSel = crearResultadoError("COTO", "PRODUCTO_NO_ENCONTRADO", "No se obtuvieron candidatos tras 3 intentos", solicitudObj)

js cotoSel.supermercado = "COTO"
js cotoSel.url = formatUrl("https://www.coto.com.ar/productos/" + encodedProd, cotoSel.url)

// Mostrar en pantalla el análisis detallado candidato por candidato
echo `cotoSel.analisisTexto`

// Ingresar a la página individual del producto seleccionado para confirmación visual
if cotoSel.estado equals to 'OK'
    echo -> Accediendo a la ficha individual del producto en COTO...
    targetCotoUrl = cotoSel.url.replace(/^https?:\/\//, '')
    https://`targetCotoUrl`
    wait 3
    echo -> Ficha de producto visualizada y confirmada en vivo: `cotoSel.nombre` (`cotoSel.precio`)
    wait 1


// ==============================================================================
// [3/3] SUPERMERCADOS DIA %
// ==============================================================================
echo 
echo ------------------------------------------------------------
echo [3/3] SUPERMERCADOS DÍA %
echo ------------------------------------------------------------
diaResuelto = false
diaCandidatos = []
diaSel = null

for intentoDia from 1 to 3
    if diaResuelto equals to false
        echo -> Intento `intentoDia` de 3 en Día %...
        if intentoDia equals to 1
            echo -> Abriendo supermercado Día %...
            https://diaonline.supermercadosdia.com.ar/
            wait 3
            echo -> Limpiando avisos y modal de codigo postal...
            dom (function(){ var sels = ['button[aria-label="Cerrar"]', 'button.close', '[class*="modal"] button']; for (var i=0; i<sels.length; i++) { var el = document.querySelector(sels[i]); if(el) try{el.click();}catch(e){} } })()
            
            xpDiaInput = '//input[contains(@id, "downshift-") or contains(@placeholder, "buscar") or contains(@placeholder, "Buscar") or @type="search"]'
            if (present(xpDiaInput))
                echo -> Buscador detectado. Posicionando cursor y escribiendo: `solTerm`
                click `xpDiaInput`
                wait 1
                type `xpDiaInput` as [clear]`solTerm`
                wait 2
                echo -> Autocomplete desplegado. Transicionando al listado completo de resultados...
                xpDiaVerTodos = '//section[contains(@class,"biggy-autocomplete")]//a[contains(text(),"Ver todos") or contains(@href,"_q=")]'
                xpDiaLupa = '//button[contains(@class,"vtex-store-components-3-x-searchBarIcon--search") or @aria-label="Buscar Productos"]'
                if (present(xpDiaVerTodos))
                    click `xpDiaVerTodos`
                else
                    if (present(xpDiaLupa))
                        click `xpDiaLupa`
                    else
                        type `xpDiaInput` as [enter]
                wait 5
            else
                echo -> Buscador interactivo no visible, navegando a resultados...
                https://diaonline.supermercadosdia.com.ar/`encodedProd`?_q=`encodedProd`
                wait 5
        else
            echo -> Reintentando navegacion directa en Día %...
            https://diaonline.supermercadosdia.com.ar/`encodedProd`?_q=`encodedProd`
            wait 5
            
        // Limpieza de modales
        dom (function(){ var sels = ['button[aria-label="Cerrar"]', 'button.close', '[class*="modal"] button']; for (var i=0; i<sels.length; i++) { var el = document.querySelector(sels[i]); if(el) try{el.click();}catch(e){} } })()
        
        // Extracción de candidatos desde el DOM
        echo -> Extrayendo candidatos desde el catalogo de Día %...
        dom return (function() { var cards = document.querySelectorAll('section article, div[class*="product-summary"], article[class*="product"], [class*="productCard"]'); var list = []; for (var i = 0; i < Math.min(10, cards.length); i++) { var c = cards[i]; var titleEl = c.querySelector('span[class*="productBrand"], [class*="productName"], h3, h2, [class*="brandName"]'); var priceText = 'N/D'; var sp = c.querySelector('[class*="sellingPrice"], [class*="currencyContainer"]'); if (sp && sp.innerText && sp.innerText.indexOf('$') !== -1 && sp.innerText.indexOf('%') === -1) { priceText = sp.innerText.trim(); } else { var all = c.querySelectorAll('*'); for (var j = 0; j < all.length; j++) { var t = (all[j].innerText || '').trim(); var m = t.match(/\$\s*[\d\.\,]+/); if (m && t.length < 30 && t.indexOf('%') === -1) { priceText = m[0]; break; } } } var linkEl = c.querySelector('a[href*="/p"]') || c.querySelector('a[href]'); if (titleEl && priceText !== 'N/D') { list.push({ nombre: titleEl.innerText.trim(), precio: priceText, url: linkEl ? linkEl.href : window.location.href }); } } return JSON.stringify(list); })()
        
        js diaCandidatos = JSON.parse(dom_result || '[]')
        if diaCandidatos.length > 0
            diaResuelto = true
            echo -> Candidatos obtenidos en Día %: `diaCandidatos.length`
        else
            echo -> Sin candidatos en Día % en intento `intentoDia`
            wait 2

if diaResuelto equals to true
    js diaSel = seleccionarProductoCorrecto(diaCandidatos, solicitudObj)
else
    js diaSel = crearResultadoError("Día %", "PRODUCTO_NO_ENCONTRADO", "No se obtuvieron candidatos tras 3 intentos", solicitudObj)

js diaSel.supermercado = "Día %"
js diaSel.url = formatUrl("https://diaonline.supermercadosdia.com.ar", diaSel.url)

// Mostrar en pantalla el análisis detallado candidato por candidato
echo `diaSel.analisisTexto`

// Ingresar a la página individual del producto seleccionado para confirmación visual
if diaSel.estado equals to 'OK'
    echo -> Accediendo a la ficha individual del producto en Día %...
    targetDiaUrl = diaSel.url.replace(/^https?:\/\//, '')
    https://`targetDiaUrl`
    wait 3
    echo -> Ficha de producto visualizada y confirmada en vivo: `diaSel.nombre` (`diaSel.precio`)
    wait 1


// ==============================================================================
// COMPARACIÓN FINAL Y PERSISTENCIA
// ==============================================================================
js comparacion = compararYOrdenar([carrefourSel, cotoSel, diaSel], solicitudObj)

// Persistencia en resultados.csv con esquema completo de 13 columnas
write "`cleanCsv(carrefourSel.nombre)`","`cleanPrice(carrefourSel.precio)`","Carrefour","`carrefourSel.url`","`fechaActual`","`carrefourSel.estado`","`cleanCsv(solicitudObj.raw)`","`cleanCsv(carrefourSel.marca)`","`carrefourSel.cantidad`","`carrefourSel.unidad`","`carrefourSel.presentacion`","`carrefourSel.precioNumerico`","`carrefourSel.esEquivalente`" to resultados.csv
write "`cleanCsv(cotoSel.nombre)`","`cleanPrice(cotoSel.precio)`","COTO","`cotoSel.url`","`fechaActual`","`cotoSel.estado`","`cleanCsv(solicitudObj.raw)`","`cleanCsv(cotoSel.marca)`","`cotoSel.cantidad`","`cotoSel.unidad`","`cotoSel.presentacion`","`cotoSel.precioNumerico`","`cotoSel.esEquivalente`" to resultados.csv
write "`cleanCsv(diaSel.nombre)`","`cleanPrice(diaSel.precio)`","Día %","`diaSel.url`","`fechaActual`","`diaSel.estado`","`cleanCsv(solicitudObj.raw)`","`cleanCsv(diaSel.marca)`","`diaSel.cantidad`","`diaSel.unidad`","`diaSel.presentacion`","`diaSel.precioNumerico`","`diaSel.esEquivalente`" to resultados.csv

echo [OK] Persistidos resultados para "`producto`" en resultados.csv
echo 
