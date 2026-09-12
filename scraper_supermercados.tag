// ==============================================================================
// RPA Supermercados: Carrefour Argentina, COTO Digital y Día %
// Materia: Tecnologías para la Automatización - UTN FRCU
// Arquitectura: Catálogo Local Previo -> TagUI Visible Determinístico -> resultados.csv
// Ejecución: tagui scraper_supermercados.tag input_tagui.csv
// ==============================================================================

// 1. INICIALIZACIÓN EN LA PRIMERA ITERACIÓN
if iteration equals to 1
    echo ============================================================
    echo INICIANDO AUTOMATIZACION RPA DE SUPERMERCADOS (MODO VISIBLE)
    echo Leyendo referencias validadas desde input_tagui.csv...
    echo ============================================================
    // Inicializar cabeceras del archivo de persistencia local resultados.csv (15 columnas)
    dump "Nombre","Precio","Supermercado","URL","Fecha","Estado","ProductoSolicitado","Marca","Cantidad","Unidad","Presentacion","PrecioNumerico","Stock","Promocion","EsEquivalente" to resultados.csv
    js catalogoCompleto = []; try { var fsCasper = require('fs'); if (fsCasper.exists('catalogo/productos.json')) { catalogoCompleto = JSON.parse(fsCasper.read('catalogo/productos.json')); } } catch(e){}

    echo -> Inicializando ventana de Google Chrome para demostracion pedagogica...
    wait 2

// 2. PREPARACIÓN DE LA SOLICITUD DETERMINÍSTICA
fechaActual = getFechaActual()
js solicitudObj = { id_producto: id_producto, producto: producto, marca: marca, cantidad: cantidad, unidad: unidad, presentacion: presentacion, carrefour_sku: carrefour_sku, coto_sku: coto_sku, dia_sku: dia_sku, ean: ean, justificacion_equivalencia: justificacion_equivalencia, atributos_identidad: { tipo: atributos_tipo, variante: atributos_variante, incompatibles: (atributos_incompatibles ? atributos_incompatibles.split('|') : []) }, raw: (producto + ' ' + marca + ' ' + presentacion) }

echo 
echo ============================================================
echo RPA SUPERMERCADOS - ITERACION `iteration`
echo ============================================================
echo ID Catalogo: `id_producto`
echo Producto: `producto`
echo Marca: `marca`
echo Presentacion: `presentacion`
echo Fecha: `fechaActual`



// ==============================================================================
// [1/3] CARREFOUR ARGENTINA
// ==============================================================================
echo 
echo ------------------------------------------------------------
echo [1/3] CARREFOUR ARGENTINA - `producto` `marca` `presentacion`
echo ------------------------------------------------------------
carrefourSel = null

echo -> Enfocando barra de direcciones real de Google Chrome (Ctrl + L)...
echo -> Escribiendo URL real letra por letra: https://www.carrefour.com.ar/
run cscript //nologo scripts/escribir_url_chrome.vbs https://www.carrefour.com.ar/
https://www.carrefour.com.ar/
wait 4

echo -> Ejecutando prepararSitio("Carrefour"): verificando cookies y modales...
dom return JSON.stringify(detectarObstaculosDOM('Carrefour'))
js obsCarrefour = JSON.parse(dom_result || '{"obstaculoDetectado":false}')
if obsCarrefour.obstaculoDetectado equals to true
    echo -> Obstaculo detectado: `obsCarrefour.descripcion`. Realizando click real con TagUI...
    wait 1
    click #tagui_obstaculo_btn
    wait 2
    echo -> Obstaculo cerrado. Verificando disponibilidad del buscador...
    dom return JSON.stringify(detectarObstaculosDOM('Carrefour'))

xpCarrefourInput = '//input[contains(@placeholder, "buscar") or contains(@placeholder, "Buscar") or @type="search"]'
if (present(xpCarrefourInput))
    echo -> Buscador interactivo detectado en Carrefour. Haciendo click real...
    click `xpCarrefourInput`
    wait 1
    echo -> Escribiendo termino de busqueda en el input: `carrefour_query`
    type `xpCarrefourInput` as [clear]`carrefour_query`
    wait 2
    echo -> Presionando ENTER para ejecutar busqueda real en Carrefour...
    type `xpCarrefourInput` as [enter]
    wait 4
else
    echo -> Buscador interactivo no visible, abriendo catalogo de busqueda...
    targetCarrefourSearch = 'https://www.carrefour.com.ar/' + encodeSearchTerm(carrefour_query) + '?_q=' + encodeSearchTerm(carrefour_query)
    targetCarrefourSearch = targetCarrefourSearch.replace(/^https?:\/\//, '')
    https://`targetCarrefourSearch`
    wait 4

// Verificación post-búsqueda de modales
dom return JSON.stringify(detectarObstaculosDOM('Carrefour'))
js obsCarrefour2 = JSON.parse(dom_result || '{"obstaculoDetectado":false}')
if obsCarrefour2.obstaculoDetectado equals to true
    click #tagui_obstaculo_btn
    wait 1

// Recorrido y scroll visual del catálogo
echo -> Recorriendo y scrolleando el catalogo visualmente...
dom window.scrollTo(0, 300);
wait 2
echo -> Scrolleando catalogo hacia abajo (bloque 1)...
dom window.scrollBy(0, 600);
wait 2
echo -> Scrolleando catalogo hacia abajo (bloque 2)...
dom window.scrollBy(0, 600);
wait 2
echo -> Reubicando vista en los productos...
dom window.scrollTo(0, 350);
wait 1

// LOCALIZAR EN EL DOM LA TARJETA QUE REALMENTE CORRESPONDE A LA JERARQUÍA (SKU -> EAN -> URL -> TOKENS)
echo -> Localizando en el DOM de Carrefour: `marca` (`producto` `presentacion`)...
dom return (function(sku, ean, refUrl, brand, prod, cant, unidad, incStr) { function norm(s){ return (s && typeof s.normalize === 'function') ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() : String(s || '').toLowerCase().trim(); } var cards = document.querySelectorAll('article, div[class*="product-summary"], [class*="productCard"]'); var bNorm = norm(brand); var pNorm = norm(prod); var cNorm = parseFloat(String(cant || '').replace(',', '.')); var uNorm = norm(unidad); var sNorm = (sku && sku !== 'N/D') ? norm(sku) : ''; var eNorm = (ean && ean !== 'N/D') ? norm(ean) : ''; var urlNorm = (refUrl && refUrl.length > 5) ? norm(refUrl) : ''; var incs = (incStr && incStr !== 'N/D') ? incStr.split('|') : []; var regex = /\b(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?|g|gr|grs|gramos?|ml|cc|cm3|l|lt|lts|litros?)\b/i; var candidate = null; for (var i = 0; i < cards.length; i++) { var c = cards[i]; var link = c.querySelector('a[href*="/p"]') || c.querySelector('a'); var href = link ? norm(link.href || '') : ''; var text = norm(c.innerText); var dataSku = norm(c.getAttribute('data-sku') || c.getAttribute('data-product-id') || ''); var tieneInc = false; for (var j = 0; j < incs.length; j++) { var incNorm = norm(incs[j]); if (incNorm && text.indexOf(incNorm) !== -1) { tieneInc = true; break; } } if (tieneInc) continue; if (sNorm && (dataSku === sNorm || href.indexOf(sNorm) !== -1 || text.indexOf(sNorm) !== -1)) { candidate = { card: c, link: link }; break; } if (eNorm && (text.indexOf(eNorm) !== -1 || href.indexOf(eNorm) !== -1)) { candidate = { card: c, link: link }; break; } if (urlNorm && href && (href.indexOf(urlNorm) !== -1 || urlNorm.indexOf(href) !== -1)) { candidate = { card: c, link: link }; break; } if (bNorm && text.indexOf(bNorm) !== -1) { var match = text.match(regex); var cardCant = match ? parseFloat(match[1].replace(',', '.')) : null; var cardUnit = match ? norm(match[2]) : ''; if (['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].indexOf(cardUnit) !== -1) cardUnit = 'kg'; else if (['g', 'gr', 'grs', 'gramo', 'gramos'].indexOf(cardUnit) !== -1) cardUnit = 'g'; else if (['ml', 'cc', 'cm3'].indexOf(cardUnit) !== -1) cardUnit = 'ml'; else if (['l', 'lt', 'lts', 'litro', 'litros'].indexOf(cardUnit) !== -1) cardUnit = 'l'; var presCompact = norm(String(cant || '')) + (uNorm ? uNorm.toLowerCase() : ''); var cantCoincide = (cardCant !== null && Math.abs(cardCant - cNorm) < 0.001 && (!cardUnit || cardUnit === uNorm)) || (text.indexOf(presCompact) !== -1); if (cantCoincide) { candidate = { card: c, link: link }; break; } } } if (candidate && candidate.card) { try { candidate.card.style.outline = '4px solid #00E676'; candidate.card.style.boxShadow = '0 0 15px #00E676'; candidate.card.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e){} var targetEl = candidate.link || candidate.card; targetEl.setAttribute('id', 'tagui_target_carrefour'); return 'FOUND_EXACT'; } return 'NOT_FOUND'; })('`carrefour_sku`', '`ean`', '`carrefour_url`', '`marca`', '`producto`', '`cantidad`', '`unidad`', '`atributos_incompatibles`')

if dom_result equals to 'FOUND_EXACT'
    echo -> Producto exacto localizado en Carrefour. Haciendo click real...
    wait 1
    click #tagui_target_carrefour
    wait 4
else
    echo -> No se localizo tarjeta con marca `marca` y presentacion `presentacion` en el listado de Carrefour.
    if (carrefour_url != '')
        echo -> Accediendo a la referencia de catalogo para verificar ficha: `carrefour_url`
        targetCarrefourUrl = carrefour_url.replace(/^https?:\/\//, '')
        https://`targetCarrefourUrl`
        wait 4

js hayNavegacionCarrefour = (dom_result === 'FOUND_EXACT' || (typeof carrefour_url !== 'undefined' && carrefour_url !== ''))

if hayNavegacionCarrefour equals to true
    // VALIDACIÓN ESTRICTA DE LA FICHA INDIVIDUAL (CAPA 2 - POLÍTICA DE IDENTIDAD REGLAS 1-16)
    echo -> Extrayendo datos de la ficha individual en Carrefour...
    dom return (function() { var titleEl = document.querySelector('h1, span[class*="productName"], [class*="product-name"], [class*="product-title"], [class*="desc_prod"]'); var title = titleEl ? titleEl.innerText.trim() : ''; var specsEl = document.querySelector('[class*="specification"], [class*="features"], [class*="description"], [class*="breadcrumb"], [class*="category"]'); var specs = specsEl ? specsEl.innerText.trim() : ''; var price = document.querySelector('[class*="sellingPrice"], [class*="currencyContainer"], [class*="price-best"], [class*="price"]'); var priceText = price ? price.innerText.trim() : 'N/D'; var stockBtn = document.querySelector('button[class*="add-to-cart"], button[class*="buy-button"], button[class*="comprar"], input[value*="Comprar"]'); var agotadoTxt = document.body.innerText.match(/agotado|sin stock|no disponible/i); var hayBotonActivo = (stockBtn && !stockBtn.disabled && !stockBtn.classList.contains('disabled')); var hayBotonDeshabilitado = (stockBtn && (stockBtn.disabled || stockBtn.classList.contains('disabled'))); var stock = 'NO_VERIFICADO'; if (!!agotadoTxt || hayBotonDeshabilitado) stock = 'AGOTADO'; else if (hayBotonActivo) stock = 'DISPONIBLE'; var promoBadge = document.querySelector('[class*="discount"], [class*="highlight"], [class*="badge"], [class*="promotion"], [class*="descuento"], [class*="oferta"]'); var promo = promoBadge ? promoBadge.innerText.trim() : 'Sin promocion'; return JSON.stringify({ titulo: title, cuerpo: specs, precio: priceText, stock: stock, promo: promo, url: window.location.href }); })()

    js pdpDataCarrefour = JSON.parse(dom_result || '{"titulo":""}')
    js pdpDataCarrefour.supermercado = "Carrefour"
    js carrefourCheck = validarIdentidadPDP(solicitudObj, pdpDataCarrefour, catalogoCompleto)

    if carrefourCheck.valido equals to true
        js carrefourSel = crearResultadoExitoso("Carrefour", pdpDataCarrefour.titulo, pdpDataCarrefour.precio, pdpDataCarrefour.url, pdpDataCarrefour.stock, pdpDataCarrefour.promo, solicitudObj, 'SI')
        echo -> [VERIFICADO OK - `carrefourCheck.resultado`] `carrefourSel.nombre` (`carrefourSel.precio`)
        echo -> Stock: `carrefourSel.stock` | Promocion: `carrefourSel.promocion`
        echo -> Permanencia visual pedagogica de 4 segundos en ficha...
        wait 4
    else
        echo -> [RECHAZADO CARREFOUR - `carrefourCheck.resultado`] `carrefourCheck.motivo`
        js carrefourSel = crearResultadoError("Carrefour", "ERROR_VALIDACION_FICHA", carrefourCheck.resultado + ": " + carrefourCheck.motivo, solicitudObj)
else
    echo -> [NO ENCONTRADO CARREFOUR] Producto no disponible en listado ni en catalogo directo.
    js carrefourSel = crearResultadoError("Carrefour", "ERROR_VALIDACION_FICHA", "INVALID_INSUFFICIENT_DATA: Producto no encontrado en listado ni en catalogo directo", solicitudObj)



// ==============================================================================
// [2/3] COTO DIGITAL
// ==============================================================================
echo 
echo ------------------------------------------------------------
echo [2/3] COTO DIGITAL - `producto` `marca` `presentacion`
echo ------------------------------------------------------------
cotoSel = null

echo -> Enfocando barra de direcciones real de Google Chrome (Ctrl + L)...
echo -> Escribiendo URL real letra por letra: https://www.coto.com.ar/
run cscript //nologo scripts/escribir_url_chrome.vbs https://www.coto.com.ar/
https://www.coto.com.ar/
wait 4

echo -> Ejecutando prepararSitio("COTO"): verificando cookies y modales...
dom return JSON.stringify(detectarObstaculosDOM('COTO'))
js obsCoto = JSON.parse(dom_result || '{"obstaculoDetectado":false}')
if obsCoto.obstaculoDetectado equals to true
    echo -> Obstaculo detectado: `obsCoto.descripcion`. Realizando click real con TagUI...
    wait 1
    click #tagui_obstaculo_btn
    wait 2
    echo -> Obstaculo cerrado. Verificando disponibilidad del buscador...
    dom return JSON.stringify(detectarObstaculosDOM('COTO'))

xpCotoInput = '//input[contains(@class,"cio-input") or contains(@id,"cio-autocomplete")] | //input[contains(@placeholder, "comprar") or contains(@placeholder, "buscar")]'
if (present(xpCotoInput))
    echo -> Buscador de COTO detectado. Haciendo click real...
    click `xpCotoInput`
    wait 1
    echo -> Escribiendo termino de busqueda en el input: `coto_query`
    type `xpCotoInput` as [clear]`coto_query`
    wait 2
    
    xpCotoBtn = '//button[contains(@class,"cio-submit-btn")] | //button[contains(@class,"search-btn")] | //button[@type="submit"]'
    if (present(xpCotoBtn))
        echo -> Haciendo click en el boton de busqueda de COTO...
        click `xpCotoBtn`
    else
        echo -> Presionando ENTER para ejecutar la busqueda en COTO...
        type `xpCotoInput` as [enter]
    wait 4
else
    echo -> Buscador interactivo de COTO no visible, abriendo catalogo de busqueda...
    targetCotoSearch = 'https://www.coto.com.ar/buscar?q=' + encodeSearchTerm(coto_query)
    targetCotoSearch = targetCotoSearch.replace(/^https?:\/\//, '')
    https://`targetCotoSearch`
    wait 4

// Verificación post-búsqueda de modales en COTO
dom return JSON.stringify(detectarObstaculosDOM('COTO'))
js obsCoto2 = JSON.parse(dom_result || '{"obstaculoDetectado":false}')
if obsCoto2.obstaculoDetectado equals to true
    click #tagui_obstaculo_btn
    wait 1

// Recorrido y scroll visual del catálogo de COTO
echo -> Recorriendo y scrolleando el catalogo de COTO visualmente...
dom window.scrollTo({ top: 350, behavior: 'smooth' });
wait 2
echo -> Explorando productos hacia abajo (bloque 1)...
dom window.scrollBy({ top: 600, behavior: 'smooth' });
wait 2
echo -> Explorando productos hacia abajo (bloque 2)...
dom window.scrollBy({ top: 600, behavior: 'smooth' });
wait 2
echo -> Reubicando vista hacia la seleccion...
dom window.scrollTo({ top: 350, behavior: 'smooth' });
wait 1

// LOCALIZAR EN EL DOM LA TARJETA QUE REALMENTE CORRESPONDE A LA JERARQUÍA (SKU -> EAN -> URL -> TOKENS) EN COTO
echo -> Localizando en el DOM de COTO: `marca` (`producto` `presentacion`)...
dom return (function(sku, ean, refUrl, brand, prod, cant, unidad, incStr) { function norm(s){ return (s && typeof s.normalize === 'function') ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() : String(s || '').toLowerCase().trim(); } var cards = document.querySelectorAll('div.product-card, div:has(> product-add-show-remove), article, div[class*="card"]'); var bNorm = norm(brand); var pNorm = norm(prod); var cNorm = parseFloat(String(cant || '').replace(',', '.')); var uNorm = norm(unidad); var sNorm = (sku && sku !== 'N/D') ? norm(sku) : ''; var eNorm = (ean && ean !== 'N/D') ? norm(ean) : ''; var urlNorm = (refUrl && refUrl.length > 5) ? norm(refUrl) : ''; var incs = (incStr && incStr !== 'N/D') ? incStr.split('|') : []; var regex = /\b(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?|g|gr|grs|gramos?|ml|cc|cm3|l|lt|lts|litros?)\b/i; var candidate = null; for (var i = 0; i < cards.length; i++) { var c = cards[i]; var link = c.querySelector('a[href*="/productos/"]') || c.querySelector('a'); var href = link ? norm(link.href || '') : ''; var text = norm(c.innerText); var dataSku = norm(c.getAttribute('data-sku') || c.getAttribute('data-id') || c.getAttribute('id') || ''); var tieneInc = false; for (var j = 0; j < incs.length; j++) { var incNorm = norm(incs[j]); if (incNorm && text.indexOf(incNorm) !== -1) { tieneInc = true; break; } } if (tieneInc) continue; if (sNorm && (dataSku === sNorm || href.indexOf(sNorm) !== -1 || text.indexOf(sNorm) !== -1)) { candidate = { card: c, link: link }; break; } if (eNorm && (text.indexOf(eNorm) !== -1 || href.indexOf(eNorm) !== -1)) { candidate = { card: c, link: link }; break; } if (urlNorm && href && (href.indexOf(urlNorm) !== -1 || urlNorm.indexOf(href) !== -1)) { candidate = { card: c, link: link }; break; } if (bNorm && text.indexOf(bNorm) !== -1) { var match = text.match(regex); var cardCant = match ? parseFloat(match[1].replace(',', '.')) : null; var cardUnit = match ? norm(match[2]) : ''; if (['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].indexOf(cardUnit) !== -1) cardUnit = 'kg'; else if (['g', 'gr', 'grs', 'gramo', 'gramos'].indexOf(cardUnit) !== -1) cardUnit = 'g'; else if (['ml', 'cc', 'cm3'].indexOf(cardUnit) !== -1) cardUnit = 'ml'; else if (['l', 'lt', 'lts', 'litro', 'litros'].indexOf(cardUnit) !== -1) cardUnit = 'l'; var presCompact = norm(String(cant || '')) + (uNorm ? uNorm.toLowerCase() : ''); var cantCoincide = (cardCant !== null && Math.abs(cardCant - cNorm) < 0.001 && (!cardUnit || cardUnit === uNorm)) || (text.indexOf(presCompact) !== -1); if (cantCoincide) { candidate = { card: c, link: link }; break; } } } if (candidate && candidate.card) { try { candidate.card.style.outline = '4px solid #00E676'; candidate.card.style.boxShadow = '0 0 20px #00E676'; candidate.card.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e){} var targetEl = candidate.link || candidate.card; targetEl.setAttribute('id', 'tagui_target_coto'); return 'FOUND_EXACT'; } return 'NOT_FOUND'; })('`coto_sku`', '`ean`', '`coto_url`', '`marca`', '`producto`', '`cantidad`', '`unidad`', '`atributos_incompatibles`')

if dom_result equals to 'FOUND_EXACT'
    echo -> Tarjeta candidata resaltada en pantalla con borde luminoso.
    echo -> Realizando click real con TagUI en la tarjeta de COTO...
    wait 2
    click #tagui_target_coto
    wait 4
else
    echo -> No se localizo tarjeta con marca `marca` y presentacion `presentacion` en el listado de COTO.
    if (coto_url != '')
        echo -> Accediendo a la referencia auxiliar de catalogo: `coto_url`
        targetCotoUrl = coto_url.replace(/^https?:\/\//, '')
        https://`targetCotoUrl`
        wait 4

js hayNavegacionCoto = (dom_result === 'FOUND_EXACT' || (typeof coto_url !== 'undefined' && coto_url !== ''))

if hayNavegacionCoto equals to true
    // VALIDACIÓN ESTRICTA DE LA FICHA INDIVIDUAL (CAPA 2 - POLÍTICA DE IDENTIDAD REGLAS 1-16) EN COTO
    echo -> Navegacion a ficha completada. Permaneciendo visible 4 segundos...
    wait 4
    echo -> Extrayendo datos de la ficha individual en COTO...
    dom return (function() { var titleEl = document.querySelector('h1, [class*="product-title"], [class*="desc_prod"]'); var title = titleEl ? titleEl.innerText.trim() : ''; var specsEl = document.querySelector('[class*="specification"], [class*="features"], [class*="description"], [class*="breadcrumb"], [class*="category"]'); var specs = specsEl ? specsEl.innerText.trim() : ''; var price = document.querySelector('[class*="atg_store_newPrice"], [class*="sellingPrice"], [class*="price"], [class*="precio"]'); var priceText = price ? price.innerText.trim() : 'N/D'; var stockBtn = document.querySelector('button[class*="comprar"], button[class*="add-to-cart"], input[value*="Comprar"]'); var agotadoTxt = document.body.innerText.match(/agotado|sin stock|no disponible/i); var hayBotonActivo = (stockBtn && !stockBtn.disabled && !stockBtn.classList.contains('disabled')); var hayBotonDeshabilitado = (stockBtn && (stockBtn.disabled || stockBtn.classList.contains('disabled'))); var stock = 'NO_VERIFICADO'; if (!!agotadoTxt || hayBotonDeshabilitado) stock = 'AGOTADO'; else if (hayBotonActivo) stock = 'DISPONIBLE'; var promoBadge = document.querySelector('[class*="descuento"], [class*="promo"], [class*="banner_oferta"]'); var promo = promoBadge ? promoBadge.innerText.trim() : 'Sin promocion'; return JSON.stringify({ titulo: title, cuerpo: specs, precio: priceText, stock: stock, promo: promo, url: window.location.href }); })()

    js pdpDataCoto = JSON.parse(dom_result || '{"titulo":""}')
    js pdpDataCoto.supermercado = "COTO"
    js cotoCheck = validarIdentidadPDP(solicitudObj, pdpDataCoto, catalogoCompleto)

    if cotoCheck.valido equals to true
        js cotoSel = crearResultadoExitoso("COTO", pdpDataCoto.titulo, pdpDataCoto.precio, pdpDataCoto.url, pdpDataCoto.stock, pdpDataCoto.promo, solicitudObj, 'SI')
        echo -> [VERIFICADO OK - `cotoCheck.resultado`] `cotoSel.nombre` (`cotoSel.precio`)
        echo -> Stock: `cotoSel.stock` | Promocion: `cotoSel.promocion`
        echo -> Permanencia pedagogica de 4 segundos en ficha verificada...
        wait 4
    else
        echo -> [RECHAZADO COTO - `cotoCheck.resultado`] `cotoCheck.motivo`
        js cotoSel = crearResultadoError("COTO", "ERROR_VALIDACION_FICHA", cotoCheck.resultado + ": " + cotoCheck.motivo, solicitudObj)
else
    echo -> [NO ENCONTRADO COTO] Producto no disponible en listado ni en catalogo directo.
    js cotoSel = crearResultadoError("COTO", "ERROR_VALIDACION_FICHA", "INVALID_INSUFFICIENT_DATA: Producto no encontrado en listado ni en catalogo directo", solicitudObj)



// ==============================================================================
// [3/3] SUPERMERCADOS DÍA %
// ==============================================================================
echo 
echo ------------------------------------------------------------
echo [3/3] SUPERMERCADOS DIA % - `producto` `marca` `presentacion`
echo ------------------------------------------------------------
diaSel = null

echo -> Enfocando barra de direcciones real de Google Chrome (Ctrl + L)...
echo -> Escribiendo URL real letra por letra: https://diaonline.supermercadosdia.com.ar/
run cscript //nologo scripts/escribir_url_chrome.vbs https://diaonline.supermercadosdia.com.ar/
https://diaonline.supermercadosdia.com.ar/
wait 4

echo -> Ejecutando prepararSitio("Dia %"): verificando cookies y modales...
dom return JSON.stringify(detectarObstaculosDOM('Día %'))
js obsDia = JSON.parse(dom_result || '{"obstaculoDetectado":false}')
if obsDia.obstaculoDetectado equals to true
    echo -> Obstaculo detectado: `obsDia.descripcion`. Realizando click real con TagUI...
    wait 1
    click #tagui_obstaculo_btn
    wait 2
    echo -> Obstaculo cerrado. Verificando disponibilidad del buscador...
    dom return JSON.stringify(detectarObstaculosDOM('Día %'))

xpDiaInput = '//input[contains(@placeholder, "buscar") or contains(@placeholder, "Buscar")]'
if (present(xpDiaInput))
    echo -> Buscador de Día % detectado. Haciendo click real...
    click `xpDiaInput`
    wait 1
    echo -> Escribiendo termino de busqueda en el input: `dia_query`
    type `xpDiaInput` as [clear]`dia_query`
    wait 2
    
    xpDiaVerTodos = '//a[contains(text(), "Ver todos") or contains(text(), "ver todos")]'
    if (present(xpDiaVerTodos))
        echo -> Haciendo click en Ver todos los resultados...
        click `xpDiaVerTodos`
        wait 4
    else
        echo -> Presionando ENTER para ejecutar busqueda en Día %...
        type `xpDiaInput` as [enter]
        wait 4
else
    echo -> Buscador interactivo de Día % no visible, abriendo catalogo de busqueda...
    targetDiaSearch = 'https://diaonline.supermercadosdia.com.ar/' + encodeSearchTerm(dia_query) + '?_q=' + encodeSearchTerm(dia_query)
    targetDiaSearch = targetDiaSearch.replace(/^https?:\/\//, '')
    https://`targetDiaSearch`
    wait 4

// Verificación post-búsqueda de modales en Día %
dom return JSON.stringify(detectarObstaculosDOM('Día %'))
js obsDia2 = JSON.parse(dom_result || '{"obstaculoDetectado":false}')
if obsDia2.obstaculoDetectado equals to true
    click #tagui_obstaculo_btn
    wait 1

// Recorrido y scroll visual del catálogo de Día %
echo -> Recorriendo y scrolleando el catalogo de Día % visualmente...
dom window.scrollTo({ top: 350, behavior: 'smooth' });
wait 2
echo -> Explorando productos hacia abajo (bloque 1)...
dom window.scrollBy({ top: 600, behavior: 'smooth' });
wait 2
echo -> Explorando productos hacia abajo (bloque 2)...
dom window.scrollBy({ top: 600, behavior: 'smooth' });
wait 2
echo -> Reubicando vista hacia la seleccion...
dom window.scrollTo({ top: 350, behavior: 'smooth' });
wait 1

// LOCALIZAR EN EL DOM LA TARJETA QUE REALMENTE CORRESPONDE A LA JERARQUÍA (SKU -> EAN -> URL -> TOKENS) EN DÍA %
echo -> Localizando en el DOM de Día %: `marca` (`producto` `presentacion`)...
dom return (function(sku, ean, refUrl, brand, prod, cant, unidad, incStr) { function norm(s){ return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); } var cards = document.querySelectorAll('section article, div[class*="product-summary"], article[class*="product"]'); var bNorm = norm(brand); var pNorm = norm(prod); var cNorm = parseFloat(String(cant || '').replace(',', '.')); var uNorm = norm(unidad); var sNorm = (sku && sku !== 'N/D') ? norm(sku) : ''; var eNorm = (ean && ean !== 'N/D') ? norm(ean) : ''; var urlNorm = (refUrl && refUrl.length > 5) ? norm(refUrl) : ''; var incs = (incStr && incStr !== 'N/D') ? incStr.split('|') : []; var regex = /\b(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?|g|gr|grs|gramos?|ml|cc|cm3|l|lt|lts|litros?)\b/i; var candidate = null; for (var i = 0; i < cards.length; i++) { var c = cards[i]; var link = c.querySelector('a[href*="/p"]') || c.querySelector('a'); var href = link ? norm(link.href || '') : ''; var text = norm(c.innerText); var dataSku = norm(c.getAttribute('data-sku') || c.getAttribute('data-product-id') || ''); var tieneInc = false; for (var j = 0; j < incs.length; j++) { var incNorm = norm(incs[j]); if (incNorm && text.indexOf(incNorm) !== -1) { tieneInc = true; break; } } if (tieneInc) continue; if (sNorm && (dataSku === sNorm || href.indexOf(sNorm) !== -1 || text.indexOf(sNorm) !== -1)) { candidate = { card: c, link: link }; break; } if (eNorm && (text.indexOf(eNorm) !== -1 || href.indexOf(eNorm) !== -1)) { candidate = { card: c, link: link }; break; } if (urlNorm && href && (href.indexOf(urlNorm) !== -1 || urlNorm.indexOf(href) !== -1)) { candidate = { card: c, link: link }; break; } if (bNorm && text.indexOf(bNorm) !== -1) { var match = text.match(regex); var cardCant = match ? parseFloat(match[1].replace(',', '.')) : null; var cardUnit = match ? norm(match[2]) : ''; if (['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].indexOf(cardUnit) !== -1) cardUnit = 'kg'; else if (['g', 'gr', 'grs', 'gramo', 'gramos'].indexOf(cardUnit) !== -1) cardUnit = 'g'; else if (['ml', 'cc', 'cm3'].indexOf(cardUnit) !== -1) cardUnit = 'ml'; else if (['l', 'lt', 'lts', 'litro', 'litros'].indexOf(cardUnit) !== -1) cardUnit = 'l'; var presCompact = norm(String(cant || '')) + (uNorm ? uNorm.toLowerCase() : ''); var cantCoincide = (cardCant !== null && Math.abs(cardCant - cNorm) < 0.001 && (!cardUnit || cardUnit === uNorm)) || (text.indexOf(presCompact) !== -1); if (cantCoincide) { candidate = { card: c, link: link }; break; } } } if (candidate && candidate.card) { try { candidate.card.style.outline = '4px solid #00E676'; candidate.card.style.boxShadow = '0 0 20px #00E676'; candidate.card.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e){} var targetEl = candidate.link || candidate.card; targetEl.setAttribute('id', 'tagui_target_dia'); return 'FOUND_EXACT'; } return 'NOT_FOUND'; })('`dia_sku`', '`ean`', '`dia_url`', '`marca`', '`producto`', '`cantidad`', '`unidad`', '`atributos_incompatibles`')

if dom_result equals to 'FOUND_EXACT'
    echo -> Tarjeta candidata resaltada en pantalla con borde luminoso.
    echo -> Realizando click real con TagUI en la tarjeta de Día %...
    wait 2
    click #tagui_target_dia
    wait 4
else
    echo -> No se localizo tarjeta con marca `marca` y presentacion `presentacion` en el listado de Día %.
    if (dia_url != '')
        echo -> Accediendo a la referencia auxiliar de catalogo: `dia_url`
        targetDiaUrl = dia_url.replace(/^https?:\/\//, '')
        https://`targetDiaUrl`
        wait 4

js hayNavegacionDia = (dom_result === 'FOUND_EXACT' || (typeof dia_url !== 'undefined' && dia_url !== ''))

if hayNavegacionDia equals to true
    // VALIDACIÓN ESTRICTA DE LA FICHA INDIVIDUAL (CAPA 2 - POLÍTICA DE IDENTIDAD REGLAS 1-16) EN DÍA %
    echo -> Navegacion a ficha completada. Permaneciendo visible 4 segundos...
    wait 4
    echo -> Extrayendo datos de la ficha individual en Día %...
    dom return (function() { var titleEl = document.querySelector('h1, span[class*="productName"], [class*="product-name"]'); var title = titleEl ? titleEl.innerText.trim() : ''; var specsEl = document.querySelector('[class*="specification"], [class*="features"], [class*="description"], [class*="breadcrumb"], [class*="category"]'); var specs = specsEl ? specsEl.innerText.trim() : ''; var price = document.querySelector('[class*="sellingPrice"], [class*="currencyContainer"], [class*="price-best"]'); var priceText = price ? price.innerText.trim() : 'N/D'; var stockBtn = document.querySelector('button[class*="add-to-cart"], button[class*="buy-button"]'); var agotadoTxt = document.body.innerText.match(/agotado|sin stock|no disponible/i); var hayBotonActivo = (stockBtn && !stockBtn.disabled && !stockBtn.classList.contains('disabled')); var hayBotonDeshabilitado = (stockBtn && (stockBtn.disabled || stockBtn.classList.contains('disabled'))); var stock = 'NO_VERIFICADO'; if (!!agotadoTxt || hayBotonDeshabilitado) stock = 'AGOTADO'; else if (hayBotonActivo) stock = 'DISPONIBLE'; var promoBadge = document.querySelector('[class*="discount"], [class*="highlight"], [class*="badge"], [class*="promotion"]'); var promo = promoBadge ? promoBadge.innerText.trim() : 'Sin promocion'; return JSON.stringify({ titulo: title, cuerpo: specs, price: priceText, stock: stock, promo: promo, url: window.location.href }); })()

    js pdpDataDia = JSON.parse(dom_result || '{"titulo":""}')
    js pdpDataDia.supermercado = "Día %"
    js diaCheck = validarIdentidadPDP(solicitudObj, pdpDataDia, catalogoCompleto)

    if diaCheck.valido equals to true
        js diaSel = crearResultadoExitoso("Día %", pdpDataDia.titulo, pdpDataDia.precio, pdpDataDia.url, pdpDataDia.stock, pdpDataDia.promo, solicitudObj, 'SI')
        echo -> [VERIFICADO OK - `diaCheck.resultado`] `diaSel.nombre` (`diaSel.precio`)
        echo -> Stock: `diaSel.stock` | Promocion: `diaSel.promocion`
        echo -> Permanencia pedagogica de 4 segundos en ficha verificada...
        wait 4
    else
        echo -> [RECHAZADO DIA % - `diaCheck.resultado`] `diaCheck.motivo`
        js diaSel = crearResultadoError("Día %", "ERROR_VALIDACION_FICHA", diaCheck.resultado + ": " + diaCheck.motivo, solicitudObj)
else
    echo -> [NO ENCONTRADO DIA %] Producto no disponible en listado ni en catalogo directo.
    js diaSel = crearResultadoError("Día %", "ERROR_VALIDACION_FICHA", "INVALID_INSUFFICIENT_DATA: Producto no encontrado en listado ni en catalogo directo", solicitudObj)



// ==============================================================================
// COMPARACIÓN FINAL Y PERSISTENCIA (15 COLUMNAS CON STOCK Y PROMOCIÓN)
// ==============================================================================
js comparacion = compararYOrdenar([carrefourSel, cotoSel, diaSel], solicitudObj)

write "`cleanCsv(carrefourSel.nombre)`","`cleanPrice(carrefourSel.precio)`","Carrefour","`carrefourSel.url`","`fechaActual`","`carrefourSel.estado`","`cleanCsv(solicitudObj.raw)`","`cleanCsv(carrefourSel.marca)`","`carrefourSel.cantidad`","`carrefourSel.unidad`","`carrefourSel.presentacion`","`carrefourSel.precioNumerico`","`cleanCsv(carrefourSel.stock)`","`cleanCsv(carrefourSel.promocion)`","`carrefourSel.esEquivalente`" to resultados.csv
write "`cleanCsv(cotoSel.nombre)`","`cleanPrice(cotoSel.precio)`","COTO","`cotoSel.url`","`fechaActual`","`cotoSel.estado`","`cleanCsv(solicitudObj.raw)`","`cleanCsv(cotoSel.marca)`","`cotoSel.cantidad`","`cotoSel.unidad`","`cotoSel.presentacion`","`cotoSel.precioNumerico`","`cleanCsv(cotoSel.stock)`","`cleanCsv(cotoSel.promocion)`","`cotoSel.esEquivalente`" to resultados.csv
write "`cleanCsv(diaSel.nombre)`","`cleanPrice(diaSel.precio)`","Día %","`diaSel.url`","`fechaActual`","`diaSel.estado`","`cleanCsv(solicitudObj.raw)`","`cleanCsv(diaSel.marca)`","`diaSel.cantidad`","`diaSel.unidad`","`diaSel.presentacion`","`diaSel.precioNumerico`","`cleanCsv(diaSel.stock)`","`cleanCsv(diaSel.promocion)`","`diaSel.esEquivalente`" to resultados.csv

echo [OK] Resultados guardados en resultados.csv para `producto` `marca` `presentacion`
echo 
