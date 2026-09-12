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

    echo -> Maximizando ventana de Google Chrome a pantalla completa...
    wait 2
    keyboard [f11]
    wait 2

// 2. PREPARACIÓN DE LA SOLICITUD DETERMINÍSTICA
fechaActual = getFechaActual()
js solicitudObj = { id_producto: id_producto, producto: producto, marca: marca, cantidad: cantidad, unidad: unidad, presentacion: presentacion, raw: (producto + ' ' + marca + ' ' + presentacion) }

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

echo -> Abriendo portal de Carrefour Argentina...
https://www.carrefour.com.ar/
wait 3
echo -> Limpiando avisos, cookies y modales...
dom (function(){ var sels = ['button[aria-label="Cerrar"]', '#onetrust-accept-btn-handler', 'button.close', '[class*="modal"] button']; for (var i=0; i<sels.length; i++) { var el = document.querySelector(sels[i]); if(el) try{el.click();}catch(e){} } })()

xpCarrefourInput = '//input[contains(@placeholder, "buscar") or contains(@placeholder, "Buscar") or @type="search"]'
if (present(xpCarrefourInput))
    echo -> Buscador detectado. Escribiendo termino: `carrefour_query`
    click `xpCarrefourInput`
    wait 1
    type `xpCarrefourInput` as [clear]`carrefour_query`
    wait 2
    echo -> Ejecutando busqueda visible en Carrefour...
    type `xpCarrefourInput` as [enter]
    wait 4
else
    echo -> Buscador interactivo no visible, abriendo catalogo...
    targetCarrefourSearch = 'https://www.carrefour.com.ar/' + encodeSearchTerm(carrefour_query) + '?_q=' + encodeSearchTerm(carrefour_query)
    targetCarrefourSearch = targetCarrefourSearch.replace(/^https?:\/\//, '')
    https://`targetCarrefourSearch`
    wait 4

// Limpieza de modales
dom (function(){ var sels = ['button[aria-label="Cerrar"]', '#onetrust-accept-btn-handler', 'button.close', '[class*="modal"] button']; for (var i=0; i<sels.length; i++) { var el = document.querySelector(sels[i]); if(el) try{el.click();}catch(e){} } })()

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
dom return (function(sku, ean, refUrl, brand, prod, cant, unidad) { function norm(s){ return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); } var cards = document.querySelectorAll('article, div[class*="product-summary"], [class*="productCard"]'); var bNorm = norm(brand); var pNorm = norm(prod); var cNorm = parseFloat(String(cant || '').replace(',', '.')); var uNorm = norm(unidad); var presText = norm(String(cant || '')) + uNorm; var sNorm = (sku && sku !== 'N/D') ? norm(sku) : ''; var eNorm = (ean && ean !== 'N/D') ? norm(ean) : ''; var urlNorm = (refUrl && refUrl.length > 5) ? norm(refUrl) : ''; var regex = /\b(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?|g|gr|grs|gramos?|ml|cc|cm3|l|lt|lts|litros?)\b/i; var candidate = null; for (var i = 0; i < cards.length; i++) { var c = cards[i]; var link = c.querySelector('a[href*="/p"]') || c.querySelector('a'); var href = link ? (link.href || '').toLowerCase() : ''; var text = norm(c.innerText); var dataSku = (c.getAttribute('data-sku') || c.getAttribute('data-product-id') || '').toLowerCase(); if (sNorm && (dataSku === sNorm || href.indexOf(sNorm) !== -1 || text.indexOf(sNorm) !== -1)) { candidate = { card: c, link: link }; break; } if (eNorm && (text.indexOf(eNorm) !== -1 || href.indexOf(eNorm) !== -1)) { candidate = { card: c, link: link }; break; } if (urlNorm && href && (href.indexOf(urlNorm) !== -1 || urlNorm.indexOf(href) !== -1)) { candidate = { card: c, link: link }; break; } if (bNorm && text.indexOf(bNorm) !== -1) { var match = text.match(regex); var cardCant = match ? parseFloat(match[1].replace(',', '.')) : null; var cardUnit = match ? norm(match[2]) : ''; if (['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].indexOf(cardUnit) !== -1) cardUnit = 'kg'; else if (['g', 'gr', 'grs', 'gramo', 'gramos'].indexOf(cardUnit) !== -1) cardUnit = 'g'; else if (['ml', 'cc', 'cm3'].indexOf(cardUnit) !== -1) cardUnit = 'ml'; else if (['l', 'lt', 'lts', 'litro', 'litros'].indexOf(cardUnit) !== -1) cardUnit = 'l'; if (cardCant !== null && Math.abs(cardCant - cNorm) < 0.001 && (!cardUnit || cardUnit === uNorm)) { candidate = { card: c, link: link }; break; } else if (text.indexOf(presText) !== -1) { candidate = { card: c, link: link }; break; } } } if (candidate && candidate.card) { try { candidate.card.style.outline = '4px solid #00E676'; candidate.card.style.boxShadow = '0 0 15px #00E676'; candidate.card.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e){} var targetEl = candidate.link || candidate.card; targetEl.setAttribute('id', 'tagui_target_carrefour'); return 'FOUND_EXACT'; } return 'NOT_FOUND'; })('`carrefour_sku`', '`ean`', '`carrefour_url`', '`marca`', '`producto`', '`cantidad`', '`unidad`')

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
    // VALIDACIÓN ESTRICTA DE LA FICHA INDIVIDUAL (5 CRITERIOS OBLIGATORIOS)
    echo -> Validando correspondencia de la ficha individual en Carrefour (Marca, Producto, Cantidad, Unidad, Presentacion)...
    dom return (function(marcaReq, prodReq, cantReq, unidadReq, presReq, justifEq) { function norm(s){ return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); } var titleEl = document.querySelector('h1, span[class*="productName"], [class*="product-name"], [class*="product-title"], [class*="desc_prod"]'); var title = titleEl ? titleEl.innerText.trim() : ''; if (!title) return JSON.stringify({ valido: false, titulo: '', motivo: 'No se encontro el titulo h1 en la ficha' }); var tNorm = norm(title); var mNorm = norm(marcaReq); var pNorm = norm(prodReq); var cNorm = parseFloat(String(cantReq || '').replace(',', '.')); var uNorm = norm(unidadReq); if (!mNorm || tNorm.indexOf(mNorm) === -1) { return JSON.stringify({ valido: false, titulo: title, motivo: 'FALLO_MARCA: El titulo ("' + title + '") NO contiene la marca requerida ("' + marcaReq + '")' }); } var breadcrumbsEl = document.querySelector('[class*="breadcrumb"], [class*="category"]'); var fullContext = tNorm + ' ' + (breadcrumbsEl ? norm(breadcrumbsEl.innerText) : ''); var prodKeywords = { 'leche': ['leche'], 'yerba': ['yerba'], 'aceite': ['aceite'], 'fideos': ['fideo', 'fideos', 'spaghetti', 'tallarines', 'tirabuzon', 'mostachol'], 'arroz': ['arroz'], 'azucar': ['azucar'], 'harina': ['harina'], 'galletitas': ['galletita', 'galletitas', 'galletas', 'galleta', 'oreo', 'chocolinas', 'pepitos', 'sonrisas'], 'gaseosa': ['gaseosa', 'coca-cola', 'sprite', 'cola'] }; if (prodKeywords[pNorm]) { var matchProd = false; for (var i = 0; i < prodKeywords[pNorm].length; i++) { if (fullContext.indexOf(prodKeywords[pNorm][i]) !== -1) { matchProd = true; break; } } if (!matchProd) return JSON.stringify({ valido: false, titulo: title, motivo: 'FALLO_PRODUCTO: La ficha ("' + title + '") no corresponde al tipo de producto "' + prodReq + '"' }); } var regex = /\b(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?|g|gr|grs|gramos?|ml|cc|cm3|l|lt|lts|litros?)\b/i; var match = tNorm.match(regex); if (!match) { var specsEl = document.querySelector('[class*="specification"], [class*="features"], [class*="description"]'); if (specsEl) match = norm(specsEl.innerText).match(regex); } var detectedCant = null; var detectedUnit = null; if (match) { detectedCant = parseFloat(match[1].replace(',', '.')); var rawU = match[2]; if (['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].indexOf(rawU) !== -1) detectedUnit = 'kg'; else if (['g', 'gr', 'grs', 'gramo', 'gramos'].indexOf(rawU) !== -1) detectedUnit = 'g'; else if (['ml', 'cc', 'cm3'].indexOf(rawU) !== -1) detectedUnit = 'ml'; else if (['l', 'lt', 'lts', 'litro', 'litros'].indexOf(rawU) !== -1) detectedUnit = 'l'; } var coincidePres = false; if (detectedCant !== null) { if (Math.abs(detectedCant - cNorm) < 0.001 && (!detectedUnit || detectedUnit === uNorm)) { coincidePres = true; } else if (justifEq && justifEq.trim().length > 0) { coincidePres = true; } } else { var presBuscada = norm(String(cantReq)) + uNorm; if (tNorm.indexOf(presBuscada) !== -1) coincidePres = true; } if (!coincidePres) { var detStr = (detectedCant !== null ? (detectedCant + (detectedUnit || '')) : 'No detectada'); return JSON.stringify({ valido: false, titulo: title, motivo: 'FALLO_PRESENTACION: Solicitado ' + cantReq + uNorm + ' (' + presReq + '), pero en ficha se detecto ' + detStr + ' ("' + title + '"). Presentacion no coincide y no existe equivalencia justificada.' }); } var price = document.querySelector('[class*="sellingPrice"], [class*="currencyContainer"], [class*="price-best"], [class*="price"]'); var priceText = price ? price.innerText.trim() : 'N/D'; var stockBtn = document.querySelector('button[class*="add-to-cart"], button[class*="buy-button"], button[class*="comprar"], input[value*="Comprar"]'); var agotadoTxt = document.body.innerText.match(/agotado|sin stock|no disponible/i); var hayBotonActivo = (stockBtn && !stockBtn.disabled && !stockBtn.classList.contains('disabled')); var hayBotonDeshabilitado = (stockBtn && (stockBtn.disabled || stockBtn.classList.contains('disabled'))); var hayTextoAgotado = !!agotadoTxt; var stock = 'NO_VERIFICADO'; if (hayTextoAgotado || hayBotonDeshabilitado) stock = 'AGOTADO'; else if (hayBotonActivo) stock = 'DISPONIBLE'; var promoBadge = document.querySelector('[class*="discount"], [class*="highlight"], [class*="badge"], [class*="promotion"], [class*="descuento"], [class*="oferta"], [class*="banner_oferta"]'); var promo = promoBadge ? promoBadge.innerText.trim() : 'Sin promocion'; return JSON.stringify({ valido: true, titulo: title, precio: priceText, stock: stock, promo: promo, url: window.location.href }); })('`marca`', '`producto`', '`cantidad`', '`unidad`', '`presentacion`', '`justificacion_equivalencia`')

    js carrefourCheck = JSON.parse(dom_result || '{"valido":false,"motivo":"No se pudo leer el DOM"}')

    if carrefourCheck.valido equals to true
        js carrefourSel = crearResultadoExitoso("Carrefour", carrefourCheck.titulo, carrefourCheck.precio, carrefourCheck.url, carrefourCheck.stock, carrefourCheck.promo, solicitudObj)
        echo -> [VERIFICADO OK] Ficha correcta en Carrefour: `carrefourSel.nombre` (`carrefourSel.precio`)
        echo -> Stock: `carrefourSel.stock` | Promocion: `carrefourSel.promocion`
        echo -> Permanencia visual pedagogica de 4 segundos en ficha...
        wait 4
    else
        echo -> [ERROR FICHA CARREFOUR] `carrefourCheck.motivo`
        js carrefourSel = crearResultadoError("Carrefour", "ERROR_VALIDACION_FICHA", carrefourCheck.motivo, solicitudObj)
else
    echo -> [NO ENCONTRADO CARREFOUR] Producto no disponible en listado ni en catalogo directo.
    js carrefourSel = crearResultadoError("Carrefour", "ERROR_VALIDACION_FICHA", "Producto no encontrado en listado ni en catalogo directo", solicitudObj)


// ==============================================================================
// [2/3] COTO DIGITAL
// ==============================================================================
echo 
echo ------------------------------------------------------------
echo [2/3] COTO DIGITAL - `producto` `marca` `presentacion`
echo ------------------------------------------------------------
cotoSel = null

echo -> Abriendo portal de COTO Digital...
https://www.coto.com.ar/
wait 3
echo -> Limpiando avisos y modales...
dom (function(){ var sels = ['button[aria-label="Cerrar"]', 'button.close', '[class*="modal"] button']; for (var i=0; i<sels.length; i++) { var el = document.querySelector(sels[i]); if(el) try{el.click();}catch(e){} } })()

xpCotoInput = '//input[contains(@class,"cio-input") or contains(@id,"cio-autocomplete")] | //input[contains(@placeholder, "comprar") or contains(@placeholder, "buscar")]'
if (present(xpCotoInput))
    echo -> Buscador de COTO detectado. Escribiendo termino: `coto_query`
    click `xpCotoInput`
    wait 1
    type `xpCotoInput` as [clear]`coto_query`
    wait 2
    
    xpCotoBtn = '//button[contains(@class,"cio-submit-btn")] | //button[contains(@class,"search-btn")] | //button[@type="submit"]'
    if (present(xpCotoBtn))
        echo -> Haciendo click en el boton de busqueda de COTO...
        click `xpCotoBtn`
    else
        type `xpCotoInput` as [enter]
    wait 4
else
    echo -> Buscador interactivo de COTO no visible, abriendo catalogo...
    targetCotoSearch = 'https://www.coto.com.ar/buscar?q=' + encodeSearchTerm(coto_query)
    targetCotoSearch = targetCotoSearch.replace(/^https?:\/\//, '')
    https://`targetCotoSearch`
    wait 4

// Limpieza de modales
dom (function(){ var sels = ['button[aria-label="Cerrar"]', 'button.close', '[class*="modal"] button']; for (var i=0; i<sels.length; i++) { var el = document.querySelector(sels[i]); if(el) try{el.click();}catch(e){} } })()

// Recorrido y scroll visual del catálogo de COTO
echo -> Recorriendo y scrolleando el catalogo de COTO...
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

// LOCALIZAR EN EL DOM LA TARJETA QUE REALMENTE CORRESPONDE A LA JERARQUÍA (SKU -> EAN -> URL -> TOKENS) EN COTO
echo -> Localizando en el DOM de COTO: `marca` (`producto` `presentacion`)...
dom return (function(sku, ean, refUrl, brand, prod, cant, unidad) { function norm(s){ return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); } var cards = document.querySelectorAll('div.product-card, div:has(> product-add-show-remove), article, div[class*="card"]'); var bNorm = norm(brand); var pNorm = norm(prod); var cNorm = parseFloat(String(cant || '').replace(',', '.')); var uNorm = norm(unidad); var presText = norm(String(cant || '')) + uNorm; var sNorm = (sku && sku !== 'N/D') ? norm(sku) : ''; var eNorm = (ean && ean !== 'N/D') ? norm(ean) : ''; var urlNorm = (refUrl && refUrl.length > 5) ? norm(refUrl) : ''; var regex = /\b(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?|g|gr|grs|gramos?|ml|cc|cm3|l|lt|lts|litros?)\b/i; var candidate = null; for (var i = 0; i < cards.length; i++) { var c = cards[i]; var link = c.querySelector('a[href*="/productos/"]') || c.querySelector('a'); var href = link ? (link.href || '').toLowerCase() : ''; var text = norm(c.innerText); var dataSku = (c.getAttribute('data-sku') || c.getAttribute('data-id') || c.getAttribute('id') || '').toLowerCase(); if (sNorm && (dataSku === sNorm || href.indexOf(sNorm) !== -1 || text.indexOf(sNorm) !== -1)) { candidate = { card: c, link: link }; break; } if (eNorm && (text.indexOf(eNorm) !== -1 || href.indexOf(eNorm) !== -1)) { candidate = { card: c, link: link }; break; } if (urlNorm && href && (href.indexOf(urlNorm) !== -1 || urlNorm.indexOf(href) !== -1)) { candidate = { card: c, link: link }; break; } if (bNorm && text.indexOf(bNorm) !== -1) { var match = text.match(regex); var cardCant = match ? parseFloat(match[1].replace(',', '.')) : null; var cardUnit = match ? norm(match[2]) : ''; if (['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].indexOf(cardUnit) !== -1) cardUnit = 'kg'; else if (['g', 'gr', 'grs', 'gramo', 'gramos'].indexOf(cardUnit) !== -1) cardUnit = 'g'; else if (['ml', 'cc', 'cm3'].indexOf(cardUnit) !== -1) cardUnit = 'ml'; else if (['l', 'lt', 'lts', 'litro', 'litros'].indexOf(cardUnit) !== -1) cardUnit = 'l'; if (cardCant !== null && Math.abs(cardCant - cNorm) < 0.001 && (!cardUnit || cardUnit === uNorm)) { candidate = { card: c, link: link }; break; } else if (text.indexOf(presText) !== -1) { candidate = { card: c, link: link }; break; } } } if (candidate && candidate.card) { try { candidate.card.style.outline = '4px solid #00E676'; candidate.card.style.boxShadow = '0 0 15px #00E676'; candidate.card.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e){} var targetEl = candidate.link || candidate.card; targetEl.setAttribute('id', 'tagui_target_coto'); return 'FOUND_EXACT'; } return 'NOT_FOUND'; })('`coto_sku`', '`ean`', '`coto_url`', '`marca`', '`producto`', '`cantidad`', '`unidad`')

if dom_result equals to 'FOUND_EXACT'
    echo -> Producto exacto localizado en COTO. Haciendo click real...
    wait 1
    click #tagui_target_coto
    wait 4
else
    echo -> No se localizo tarjeta con marca `marca` y presentacion `presentacion` en el listado de COTO.
    if (coto_url != '')
        echo -> Accediendo a la referencia de catalogo para verificar ficha: `coto_url`
        targetCotoUrl = coto_url.replace(/^https?:\/\//, '')
        https://`targetCotoUrl`
        wait 4

js hayNavegacionCoto = (dom_result === 'FOUND_EXACT' || (typeof coto_url !== 'undefined' && coto_url !== ''))

if hayNavegacionCoto equals to true
    // VALIDACIÓN ESTRICTA DE LA FICHA INDIVIDUAL (5 CRITERIOS OBLIGATORIOS) EN COTO
    echo -> Validando correspondencia de la ficha individual en COTO (Marca, Producto, Cantidad, Unidad, Presentacion)...
    dom return (function(marcaReq, prodReq, cantReq, unidadReq, presReq, justifEq) { function norm(s){ return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); } var titleEl = document.querySelector('h1, [class*="product-title"], [class*="desc_prod"]'); var title = titleEl ? titleEl.innerText.trim() : ''; if (!title) return JSON.stringify({ valido: false, titulo: '', motivo: 'No se encontro el titulo en la ficha de COTO' }); var tNorm = norm(title); var mNorm = norm(marcaReq); var pNorm = norm(prodReq); var cNorm = parseFloat(String(cantReq || '').replace(',', '.')); var uNorm = norm(unidadReq); if (!mNorm || tNorm.indexOf(mNorm) === -1) { return JSON.stringify({ valido: false, titulo: title, motivo: 'FALLO_MARCA: El titulo en COTO ("' + title + '") NO contiene la marca requerida ("' + marcaReq + '")' }); } var prodKeywords = { 'leche': ['leche'], 'yerba': ['yerba'], 'aceite': ['aceite'], 'fideos': ['fideo', 'fideos', 'spaghetti', 'tallarines', 'tirabuzon', 'mostachol'], 'arroz': ['arroz'], 'azucar': ['azucar'], 'harina': ['harina'], 'galletitas': ['galletita', 'galletitas', 'galletas', 'galleta', 'oreo', 'chocolinas', 'pepitos', 'sonrisas'], 'gaseosa': ['gaseosa', 'coca-cola', 'sprite', 'cola'] }; if (prodKeywords[pNorm]) { var matchProd = false; for (var i = 0; i < prodKeywords[pNorm].length; i++) { if (tNorm.indexOf(prodKeywords[pNorm][i]) !== -1) { matchProd = true; break; } } if (!matchProd) return JSON.stringify({ valido: false, titulo: title, motivo: 'FALLO_PRODUCTO: La ficha en COTO ("' + title + '") no corresponde al producto "' + prodReq + '"' }); } var regex = /\b(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?|g|gr|grs|gramos?|ml|cc|cm3|l|lt|lts|litros?)\b/i; var match = tNorm.match(regex); var detectedCant = null; var detectedUnit = null; if (match) { detectedCant = parseFloat(match[1].replace(',', '.')); var rawU = match[2]; if (['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].indexOf(rawU) !== -1) detectedUnit = 'kg'; else if (['g', 'gr', 'grs', 'gramo', 'gramos'].indexOf(rawU) !== -1) detectedUnit = 'g'; else if (['ml', 'cc', 'cm3'].indexOf(rawU) !== -1) detectedUnit = 'ml'; else if (['l', 'lt', 'lts', 'litro', 'litros'].indexOf(rawU) !== -1) detectedUnit = 'l'; } var coincidePres = false; if (detectedCant !== null) { if (Math.abs(detectedCant - cNorm) < 0.001 && (!detectedUnit || detectedUnit === uNorm)) { coincidePres = true; } else if (justifEq && justifEq.trim().length > 0) { coincidePres = true; } } else { var presBuscada = norm(String(cantReq)) + uNorm; if (tNorm.indexOf(presBuscada) !== -1) coincidePres = true; } if (!coincidePres) { var detStr = (detectedCant !== null ? (detectedCant + (detectedUnit || '')) : 'No detectada'); return JSON.stringify({ valido: false, titulo: title, motivo: 'FALLO_PRESENTACION: Solicitado ' + cantReq + uNorm + ' (' + presReq + '), pero en COTO se detecto ' + detStr + ' ("' + title + '"). Presentacion no coincide y no existe equivalencia justificada.' }); } var price = document.querySelector('[class*="atg_store_newPrice"], [class*="sellingPrice"], [class*="price"], [class*="precio"]'); var priceText = price ? price.innerText.trim() : 'N/D'; var stockBtn = document.querySelector('button[class*="comprar"], button[class*="add-to-cart"], input[value*="Comprar"]'); var agotadoTxt = document.body.innerText.match(/agotado|sin stock|no disponible/i); var hayBotonActivo = (stockBtn && !stockBtn.disabled && !stockBtn.classList.contains('disabled')); var hayBotonDeshabilitado = (stockBtn && (stockBtn.disabled || stockBtn.classList.contains('disabled'))); var hayTextoAgotado = !!agotadoTxt; var stock = 'NO_VERIFICADO'; if (hayTextoAgotado || hayBotonDeshabilitado) stock = 'AGOTADO'; else if (hayBotonActivo) stock = 'DISPONIBLE'; var promoBadge = document.querySelector('[class*="descuento"], [class*="promo"], [class*="banner_oferta"]'); var promo = promoBadge ? promoBadge.innerText.trim() : 'Sin promocion'; return JSON.stringify({ valido: true, titulo: title, precio: priceText, stock: stock, promo: promo, url: window.location.href }); })('`marca`', '`producto`', '`cantidad`', '`unidad`', '`presentacion`', '`justificacion_equivalencia`')

    js cotoCheck = JSON.parse(dom_result || '{"valido":false,"motivo":"No se pudo leer el DOM en COTO"}')

    if cotoCheck.valido equals to true
        js cotoSel = crearResultadoExitoso("COTO", cotoCheck.titulo, cotoCheck.precio, cotoCheck.url, cotoCheck.stock, cotoCheck.promo, solicitudObj)
        echo -> [VERIFICADO OK] Ficha correcta en COTO: `cotoSel.nombre` (`cotoSel.precio`)
        echo -> Stock: `cotoSel.stock` | Promocion: `cotoSel.promocion`
        echo -> Permanencia visual pedagogica de 4 segundos en ficha...
        wait 4
    else
        echo -> [ERROR FICHA COTO] `cotoCheck.motivo`
        js cotoSel = crearResultadoError("COTO", "ERROR_VALIDACION_FICHA", cotoCheck.motivo, solicitudObj)
else
    echo -> [NO ENCONTRADO COTO] Producto no disponible en listado ni en catalogo directo.
    js cotoSel = crearResultadoError("COTO", "ERROR_VALIDACION_FICHA", "Producto no encontrado en listado ni en catalogo directo", solicitudObj)


// ==============================================================================
// [3/3] SUPERMERCADOS DÍA %
// ==============================================================================
echo 
echo ------------------------------------------------------------
echo [3/3] SUPERMERCADOS DIA % - `producto` `marca` `presentacion`
echo ------------------------------------------------------------
diaSel = null

echo -> Abriendo portal de Supermercados Día %...
https://diaonline.supermercadosdia.com.ar/
wait 3
echo -> Limpiando avisos y modales...
dom (function(){ var sels = ['button[aria-label="Cerrar"]', 'button.close', '[class*="modal"] button']; for (var i=0; i<sels.length; i++) { var el = document.querySelector(sels[i]); if(el) try{el.click();}catch(e){} } })()

xpDiaInput = '//input[contains(@placeholder, "buscar") or contains(@placeholder, "Buscar")]'
if (present(xpDiaInput))
    echo -> Buscador de Día % detectado. Escribiendo termino: `dia_query`
    click `xpDiaInput`
    wait 1
    type `xpDiaInput` as [clear]`dia_query`
    wait 2
    
    xpDiaVerTodos = '//a[contains(text(), "Ver todos") or contains(text(), "ver todos")]'
    if (present(xpDiaVerTodos))
        echo -> Haciendo click en Ver todos los resultados...
        click `xpDiaVerTodos`
        wait 4
    else
        type `xpDiaInput` as [enter]
        wait 4
else
    echo -> Buscador interactivo de Día % no visible, abriendo catalogo...
    targetDiaSearch = 'https://diaonline.supermercadosdia.com.ar/' + encodeSearchTerm(dia_query) + '?_q=' + encodeSearchTerm(dia_query)
    targetDiaSearch = targetDiaSearch.replace(/^https?:\/\//, '')
    https://`targetDiaSearch`
    wait 4

// Limpieza de modales
dom (function(){ var sels = ['button[aria-label="Cerrar"]', 'button.close', '[class*="modal"] button']; for (var i=0; i<sels.length; i++) { var el = document.querySelector(sels[i]); if(el) try{el.click();}catch(e){} } })()

// Recorrido y scroll visual del catálogo de Día %
echo -> Recorriendo y scrolleando el catalogo de Día %...
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

// LOCALIZAR EN EL DOM LA TARJETA QUE REALMENTE CORRESPONDE A LA JERARQUÍA (SKU -> EAN -> URL -> TOKENS) EN DÍA %
echo -> Localizando en el DOM de Día %: `marca` (`producto` `presentacion`)...
dom return (function(sku, ean, refUrl, brand, prod, cant, unidad) { function norm(s){ return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); } var cards = document.querySelectorAll('section article, div[class*="product-summary"], article[class*="product"]'); var bNorm = norm(brand); var pNorm = norm(prod); var cNorm = parseFloat(String(cant || '').replace(',', '.')); var uNorm = norm(unidad); var presText = norm(String(cant || '')) + uNorm; var sNorm = (sku && sku !== 'N/D') ? norm(sku) : ''; var eNorm = (ean && ean !== 'N/D') ? norm(ean) : ''; var urlNorm = (refUrl && refUrl.length > 5) ? norm(refUrl) : ''; var regex = /\b(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?|g|gr|grs|gramos?|ml|cc|cm3|l|lt|lts|litros?)\b/i; var candidate = null; for (var i = 0; i < cards.length; i++) { var c = cards[i]; var link = c.querySelector('a[href*="/p"]') || c.querySelector('a'); var href = link ? (link.href || '').toLowerCase() : ''; var text = norm(c.innerText); var dataSku = (c.getAttribute('data-sku') || c.getAttribute('data-product-id') || '').toLowerCase(); if (sNorm && (dataSku === sNorm || href.indexOf(sNorm) !== -1 || text.indexOf(sNorm) !== -1)) { candidate = { card: c, link: link }; break; } if (eNorm && (text.indexOf(eNorm) !== -1 || href.indexOf(eNorm) !== -1)) { candidate = { card: c, link: link }; break; } if (urlNorm && href && (href.indexOf(urlNorm) !== -1 || urlNorm.indexOf(href) !== -1)) { candidate = { card: c, link: link }; break; } if (bNorm && text.indexOf(bNorm) !== -1) { var match = text.match(regex); var cardCant = match ? parseFloat(match[1].replace(',', '.')) : null; var cardUnit = match ? norm(match[2]) : ''; if (['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].indexOf(cardUnit) !== -1) cardUnit = 'kg'; else if (['g', 'gr', 'grs', 'gramo', 'gramos'].indexOf(cardUnit) !== -1) cardUnit = 'g'; else if (['ml', 'cc', 'cm3'].indexOf(cardUnit) !== -1) cardUnit = 'ml'; else if (['l', 'lt', 'lts', 'litro', 'litros'].indexOf(cardUnit) !== -1) cardUnit = 'l'; if (cardCant !== null && Math.abs(cardCant - cNorm) < 0.001 && (!cardUnit || cardUnit === uNorm)) { candidate = { card: c, link: link }; break; } else if (text.indexOf(presText) !== -1) { candidate = { card: c, link: link }; break; } } } if (candidate && candidate.card) { try { candidate.card.style.outline = '4px solid #00E676'; candidate.card.style.boxShadow = '0 0 15px #00E676'; candidate.card.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e){} var targetEl = candidate.link || candidate.card; targetEl.setAttribute('id', 'tagui_target_dia'); return 'FOUND_EXACT'; } return 'NOT_FOUND'; })('`dia_sku`', '`ean`', '`dia_url`', '`marca`', '`producto`', '`cantidad`', '`unidad`')

if dom_result equals to 'FOUND_EXACT'
    echo -> Producto exacto localizado en Día %. Haciendo click real...
    wait 1
    click #tagui_target_dia
    wait 4
else
    echo -> No se localizo tarjeta con marca `marca` y presentacion `presentacion` en el listado de Día %.
    if (dia_url != '')
        echo -> Accediendo a la referencia de catalogo para verificar ficha: `dia_url`
        targetDiaUrl = dia_url.replace(/^https?:\/\//, '')
        https://`targetDiaUrl`
        wait 4

js hayNavegacionDia = (dom_result === 'FOUND_EXACT' || (typeof dia_url !== 'undefined' && dia_url !== ''))

if hayNavegacionDia equals to true
    // VALIDACIÓN ESTRICTA DE LA FICHA INDIVIDUAL (5 CRITERIOS OBLIGATORIOS) EN DÍA %
    echo -> Validando correspondencia de la ficha individual en Día % (Marca, Producto, Cantidad, Unidad, Presentacion)...
    dom return (function(marcaReq, prodReq, cantReq, unidadReq, presReq, justifEq) { function norm(s){ return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); } var titleEl = document.querySelector('h1, span[class*="productName"], [class*="product-name"]'); var title = titleEl ? titleEl.innerText.trim() : ''; if (!title) return JSON.stringify({ valido: false, titulo: '', motivo: 'No se encontro el titulo en la ficha de Dia %' }); var tNorm = norm(title); var mNorm = norm(marcaReq); var pNorm = norm(prodReq); var cNorm = parseFloat(String(cantReq || '').replace(',', '.')); var uNorm = norm(unidadReq); if (!mNorm || tNorm.indexOf(mNorm) === -1) { return JSON.stringify({ valido: false, titulo: title, motivo: 'FALLO_MARCA: El titulo en Dia % ("' + title + '") NO contiene la marca requerida ("' + marcaReq + '")' }); } var prodKeywords = { 'leche': ['leche'], 'yerba': ['yerba'], 'aceite': ['aceite'], 'fideos': ['fideo', 'fideos', 'spaghetti', 'tallarines', 'tirabuzon', 'mostachol'], 'arroz': ['arroz'], 'azucar': ['azucar'], 'harina': ['harina'], 'galletitas': ['galletita', 'galletitas', 'galletas', 'galleta', 'oreo', 'chocolinas', 'pepitos', 'sonrisas'], 'gaseosa': ['gaseosa', 'coca-cola', 'sprite', 'cola'] }; if (prodKeywords[pNorm]) { var matchProd = false; for (var i = 0; i < prodKeywords[pNorm].length; i++) { if (tNorm.indexOf(prodKeywords[pNorm][i]) !== -1) { matchProd = true; break; } } if (!matchProd) return JSON.stringify({ valido: false, titulo: title, motivo: 'FALLO_PRODUCTO: La ficha en Dia % ("' + title + '") no corresponde al producto "' + prodReq + '"' }); } var regex = /\b(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?|g|gr|grs|gramos?|ml|cc|cm3|l|lt|lts|litros?)\b/i; var match = tNorm.match(regex); var detectedCant = null; var detectedUnit = null; if (match) { detectedCant = parseFloat(match[1].replace(',', '.')); var rawU = match[2]; if (['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].indexOf(rawU) !== -1) detectedUnit = 'kg'; else if (['g', 'gr', 'grs', 'gramo', 'gramos'].indexOf(rawU) !== -1) detectedUnit = 'g'; else if (['ml', 'cc', 'cm3'].indexOf(rawU) !== -1) detectedUnit = 'ml'; else if (['l', 'lt', 'lts', 'litro', 'litros'].indexOf(rawU) !== -1) detectedUnit = 'l'; } var coincidePres = false; if (detectedCant !== null) { if (Math.abs(detectedCant - cNorm) < 0.001 && (!detectedUnit || detectedUnit === uNorm)) { coincidePres = true; } else if (justifEq && justifEq.trim().length > 0) { coincidePres = true; } } else { var presBuscada = norm(String(cantReq)) + uNorm; if (tNorm.indexOf(presBuscada) !== -1) coincidePres = true; } if (!coincidePres) { var detStr = (detectedCant !== null ? (detectedCant + (detectedUnit || '')) : 'No detectada'); return JSON.stringify({ valido: false, titulo: title, motivo: 'FALLO_PRESENTACION: Solicitado ' + cantReq + uNorm + ' (' + presReq + '), pero en Dia % se detecto ' + detStr + ' ("' + title + '"). Presentacion no coincide y no existe equivalencia justificada.' }); } var price = document.querySelector('[class*="sellingPrice"], [class*="currencyContainer"], [class*="price-best"]'); var priceText = price ? price.innerText.trim() : 'N/D'; var stockBtn = document.querySelector('button[class*="add-to-cart"], button[class*="buy-button"]'); var agotadoTxt = document.body.innerText.match(/agotado|sin stock|no disponible/i); var hayBotonActivo = (stockBtn && !stockBtn.disabled && !stockBtn.classList.contains('disabled')); var hayBotonDeshabilitado = (stockBtn && (stockBtn.disabled || stockBtn.classList.contains('disabled'))); var hayTextoAgotado = !!agotadoTxt; var stock = 'NO_VERIFICADO'; if (hayTextoAgotado || hayBotonDeshabilitado) stock = 'AGOTADO'; else if (hayBotonActivo) stock = 'DISPONIBLE'; var promoBadge = document.querySelector('[class*="discount"], [class*="highlight"], [class*="badge"], [class*="promotion"]'); var promo = promoBadge ? promoBadge.innerText.trim() : 'Sin promocion'; return JSON.stringify({ valido: true, titulo: title, precio: priceText, stock: stock, promo: promo, url: window.location.href }); })('`marca`', '`producto`', '`cantidad`', '`unidad`', '`presentacion`', '`justificacion_equivalencia`')

    js diaCheck = JSON.parse(dom_result || '{"valido":false,"motivo":"No se pudo leer el DOM en Día %"}')

    if diaCheck.valido equals to true
        js diaSel = crearResultadoExitoso("Día %", diaCheck.titulo, diaCheck.precio, diaCheck.url, diaCheck.stock, diaCheck.promo, solicitudObj)
        echo -> [VERIFICADO OK] Ficha correcta en Día %: `diaSel.nombre` (`diaSel.precio`)
        echo -> Stock: `diaSel.stock` | Promocion: `diaSel.promocion`
        echo -> Permanencia visual pedagogica de 4 segundos en ficha...
        wait 4
    else
        echo -> [ERROR FICHA DIA %] `diaCheck.motivo`
        js diaSel = crearResultadoError("Día %", "ERROR_VALIDACION_FICHA", diaCheck.motivo, solicitudObj)
else
    echo -> [NO ENCONTRADO DIA %] Producto no disponible en listado ni en catalogo directo.
    js diaSel = crearResultadoError("Día %", "ERROR_VALIDACION_FICHA", "Producto no encontrado en listado ni en catalogo directo", solicitudObj)


// ==============================================================================
// COMPARACIÓN FINAL Y PERSISTENCIA (15 COLUMNAS CON STOCK Y PROMOCIÓN)
// ==============================================================================
js comparacion = compararYOrdenar([carrefourSel, cotoSel, diaSel], solicitudObj)

write "`cleanCsv(carrefourSel.nombre)`","`cleanPrice(carrefourSel.precio)`","Carrefour","`carrefourSel.url`","`fechaActual`","`carrefourSel.estado`","`cleanCsv(solicitudObj.raw)`","`cleanCsv(carrefourSel.marca)`","`carrefourSel.cantidad`","`carrefourSel.unidad`","`carrefourSel.presentacion`","`carrefourSel.precioNumerico`","`cleanCsv(carrefourSel.stock)`","`cleanCsv(carrefourSel.promocion)`","`carrefourSel.esEquivalente`" to resultados.csv
write "`cleanCsv(cotoSel.nombre)`","`cleanPrice(cotoSel.precio)`","COTO","`cotoSel.url`","`fechaActual`","`cotoSel.estado`","`cleanCsv(solicitudObj.raw)`","`cleanCsv(cotoSel.marca)`","`cotoSel.cantidad`","`cotoSel.unidad`","`cotoSel.presentacion`","`cotoSel.precioNumerico`","`cleanCsv(cotoSel.stock)`","`cleanCsv(cotoSel.promocion)`","`cotoSel.esEquivalente`" to resultados.csv
write "`cleanCsv(diaSel.nombre)`","`cleanPrice(diaSel.precio)`","Día %","`diaSel.url`","`fechaActual`","`diaSel.estado`","`cleanCsv(solicitudObj.raw)`","`cleanCsv(diaSel.marca)`","`diaSel.cantidad`","`diaSel.unidad`","`diaSel.presentacion`","`diaSel.precioNumerico`","`cleanCsv(diaSel.stock)`","`cleanCsv(diaSel.promocion)`","`diaSel.esEquivalente`" to resultados.csv

echo [OK] Resultados guardados en resultados.csv para `producto` `marca` `presentacion`
echo 
