// ==============================================================================
// RPA Supermercados: Carrefour Argentina, COTO Digital y Día %
// Materia: Tecnologías para la Automatización - UTN FRCU
// Arquitectura: TagUI -> Google Chrome Visible -> DOM -> resultados.csv
// Ejecución: tagui scraper_supermercados.tag input_tagui.csv
// ==============================================================================

// 1. INICIALIZACIÓN EN LA PRIMERA ITERACIÓN
if iteration equals to 1
    echo ============================================================
    echo INICIANDO AUTOMATIZACION RPA DE SUPERMERCADOS (MODO VISIBLE)
    echo Leyendo referencias directas desde input_tagui.csv...
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
carrefourResuelto = false
carrefourNombre = 'N/D'
carrefourPrecio = 'N/D'
carrefourStock = 'DISPONIBLE'
carrefourPromo = 'Sin promocion'
carrefourUrl = carrefour_url

for intentoCarrefour from 1 to 2
    if carrefourResuelto equals to false
        echo -> Intento `intentoCarrefour` de 2 en Carrefour...
        if intentoCarrefour equals to 1
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
        else
            echo -> Reintentando con navegacion a ficha de catalogo...
            targetCarrefourSearch = carrefour_url.replace(/^https?:\/\//, '')
            https://`targetCarrefourSearch`
            wait 4

        // Limpieza de modales
        dom (function(){ var sels = ['button[aria-label="Cerrar"]', '#onetrust-accept-btn-handler', 'button.close', '[class*="modal"] button']; for (var i=0; i<sels.length; i++) { var el = document.querySelector(sels[i]); if(el) try{el.click();}catch(e){} } })()

        // Ordenamiento por menor precio si está en página de búsqueda
        xpCarrefourSortBtn = '//button[contains(@class, "orderByButton")]'
        if (present(xpCarrefourSortBtn))
            echo -> Control de ordenamiento detectado en Carrefour. Haciendo click...
            click `xpCarrefourSortBtn`
            wait 1
            xpCarrefourSortOpt = '//button[contains(@class, "orderbypriceasc") or contains(text(), "menor a mayor")]'
            if (present(xpCarrefourSortOpt))
                echo -> Aplicando ordenamiento: Precio menor a mayor...
                click `xpCarrefourSortOpt`
                wait 3

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
        echo -> Reubicando vista en el producto seleccionado...
        dom window.scrollTo(0, 350);
        wait 1

        // Clic real en la tarjeta del producto
        xpCarrefourCard = '(//article[contains(@class,"product")] | //div[contains(@class,"product-summary")] | //div[contains(@class,"productCard")])[1]//a'
        if (present(xpCarrefourCard))
            echo -> Haciendo click real en la tarjeta del producto en Carrefour...
            click `xpCarrefourCard`
            wait 3

        // Si no entro a la ficha individual, navegar a la URL directa del catalogo
        if (!present('//h1 | //span[contains(@class,"productName")]'))
            if (carrefour_url != '')
                echo -> Accediendo a la ficha individual de Carrefour via URL de catalogo...
                targetCarrefourUrl = carrefour_url.replace(/^https?:\/\//, '')
                https://`targetCarrefourUrl`
                wait 3

        // Permanencia visual pedagógica en la ficha individual
        echo -> Ficha de producto en Carrefour visualizada en vivo (permanencia de confirmacion)...
        wait 4

        // Extracción de Precio, Stock y Promociones en la ficha
        dom return (function() { var title = document.querySelector('h1, span[class*="productName"], [class*="product-name"]'); var price = document.querySelector('[class*="sellingPrice"], [class*="currencyContainer"], [class*="price-best"], [class*="price"]'); var stockBtn = document.querySelector('button[class*="add-to-cart"], button[class*="buy-button"], button[class*="comprar"]'); var agotadoTxt = document.body.innerText.match(/agotado|sin stock|no disponible/i); var promoBadge = document.querySelector('[class*="discount"], [class*="highlight"], [class*="badge"], [class*="promotion"]'); return JSON.stringify({ nombre: title ? title.innerText.trim() : '', precio: price ? price.innerText.trim() : 'N/D', stock: (stockBtn && !stockBtn.disabled && !agotadoTxt) ? 'DISPONIBLE' : (agotadoTxt ? 'AGOTADO' : 'DISPONIBLE'), promo: promoBadge ? promoBadge.innerText.trim() : 'Sin promocion', url: window.location.href }); })()

        js carrefourData = JSON.parse(dom_result || '{}')
        if (carrefourData.nombre != '' && carrefourData.precio != 'N/D')
            carrefourNombre = carrefourData.nombre
            carrefourPrecio = carrefourData.precio
            carrefourStock = carrefourData.stock
            carrefourPromo = carrefourData.promo
            carrefourUrl = carrefourData.url
            carrefourResuelto = true
            echo -> Ficha verificada exitosamente en Carrefour: `carrefourNombre` (`carrefourPrecio`)
            echo -> Stock: `carrefourStock` | Promocion: `carrefourPromo`
        else
            wait 2

if carrefourResuelto equals to true
    js carrefourSel = crearResultadoExitoso("Carrefour", carrefourNombre, carrefourPrecio, carrefourUrl, carrefourStock, carrefourPromo, solicitudObj)
else
    js carrefourSel = crearResultadoError("Carrefour", "PRODUCTO_NO_ENCONTRADO", "No se pudo extraer la ficha del producto en Carrefour", solicitudObj)


// ==============================================================================
// [2/3] COTO DIGITAL
// ==============================================================================
echo 
echo ------------------------------------------------------------
echo [2/3] COTO DIGITAL - `producto` `marca` `presentacion`
echo ------------------------------------------------------------
cotoResuelto = false
cotoNombre = 'N/D'
cotoPrecio = 'N/D'
cotoStock = 'DISPONIBLE'
cotoPromo = 'Sin promocion'
cotoUrl = coto_url

for intentoCoto from 1 to 2
    if cotoResuelto equals to false
        echo -> Intento `intentoCoto` de 2 en COTO...
        if intentoCoto equals to 1
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
        else
            echo -> Reintentando con navegacion a ficha de catalogo...
            targetCotoSearch = coto_url.replace(/^https?:\/\//, '')
            https://`targetCotoSearch`
            wait 4

        // Limpieza de modales
        dom (function(){ var sels = ['button[aria-label="Cerrar"]', 'button.close', '[class*="modal"] button']; for (var i=0; i<sels.length; i++) { var el = document.querySelector(sels[i]); if(el) try{el.click();}catch(e){} } })()

        // Ordenamiento por menor precio si existe
        xpCotoSortSelect = '//select[contains(@class, "form-select") or contains(@name, "sort")]'
        if (present(xpCotoSortSelect))
            echo -> Aplicando ordenamiento por menor precio en COTO...
            select `xpCotoSortSelect` as Precio: de menor a mayor
            wait 3

        // Recorrido y scroll visual del catálogo
        echo -> Recorriendo y scrolleando el catalogo de COTO...
        dom window.scrollTo(0, 300);
        wait 2
        echo -> Scrolleando catalogo hacia abajo (bloque 1)...
        dom window.scrollBy(0, 600);
        wait 2
        echo -> Scrolleando catalogo hacia abajo (bloque 2)...
        dom window.scrollBy(0, 600);
        wait 2
        echo -> Reubicando vista en el producto seleccionado...
        dom window.scrollTo(0, 350);
        wait 1

        // Clic real en la tarjeta del producto
        xpCotoCard = '(//div[contains(@class,"product-card")] | //article | //div[contains(@class,"card")])[1]//a'
        if (present(xpCotoCard))
            echo -> Haciendo click real en la tarjeta del producto en COTO...
            click `xpCotoCard`
            wait 3

        // Si no entro a la ficha individual, navegar a la URL directa del catalogo
        if (!present('//h1 | //span[contains(@class,"product-title")] | //div[contains(@class,"product-info")]'))
            if (coto_url != '')
                echo -> Accediendo a la ficha individual de COTO via URL de catalogo...
                targetCotoUrl = coto_url.replace(/^https?:\/\//, '')
                https://`targetCotoUrl`
                wait 3

        // Permanencia visual pedagógica en la ficha individual
        echo -> Ficha de producto en COTO visualizada en vivo (permanencia de confirmacion)...
        wait 4

        // Extracción de Precio, Stock y Promociones en la ficha
        dom return (function() { var title = document.querySelector('h1, [class*="product-title"], [class*="desc_prod"]'); var price = document.querySelector('[class*="price"], [class*="precio"], [class*="atg_store_newPrice"]'); var stockBtn = document.querySelector('button[class*="comprar"], button[class*="add-to-cart"], input[value*="Comprar"]'); var agotadoTxt = document.body.innerText.match(/agotado|sin stock|no disponible/i); var promoBadge = document.querySelector('[class*="descuento"], [class*="promo"], [class*="banner_oferta"]'); return JSON.stringify({ nombre: title ? title.innerText.trim() : '', precio: price ? price.innerText.trim() : 'N/D', stock: (stockBtn && !stockBtn.disabled && !agotadoTxt) ? 'DISPONIBLE' : (agotadoTxt ? 'AGOTADO' : 'DISPONIBLE'), promo: promoBadge ? promoBadge.innerText.trim() : 'Sin promocion', url: window.location.href }); })()

        js cotoData = JSON.parse(dom_result || '{}')
        if (cotoData.nombre != '' && cotoData.precio != 'N/D')
            cotoNombre = cotoData.nombre
            cotoPrecio = cotoData.precio
            cotoStock = cotoData.stock
            cotoPromo = cotoData.promo
            cotoUrl = cotoData.url
            cotoResuelto = true
            echo -> Ficha verificada exitosamente en COTO: `cotoNombre` (`cotoPrecio`)
            echo -> Stock: `cotoStock` | Promocion: `cotoPromo`
        else
            wait 2

if cotoResuelto equals to true
    js cotoSel = crearResultadoExitoso("COTO", cotoNombre, cotoPrecio, cotoUrl, cotoStock, cotoPromo, solicitudObj)
else
    js cotoSel = crearResultadoError("COTO", "PRODUCTO_NO_ENCONTRADO", "No se pudo extraer la ficha del producto en COTO", solicitudObj)


// ==============================================================================
// [3/3] SUPERMERCADOS DÍA %
// ==============================================================================
echo 
echo ------------------------------------------------------------
echo [3/3] SUPERMERCADOS DIA % - `producto` `marca` `presentacion`
echo ------------------------------------------------------------
diaResuelto = false
diaNombre = 'N/D'
diaPrecio = 'N/D'
diaStock = 'DISPONIBLE'
diaPromo = 'Sin promocion'
diaUrl = dia_url

for intentoDia from 1 to 2
    if diaResuelto equals to false
        echo -> Intento `intentoDia` de 2 en Día %...
        if intentoDia equals to 1
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
        else
            echo -> Reintentando con navegacion a ficha de catalogo...
            targetDiaSearch = dia_url.replace(/^https?:\/\//, '')
            https://`targetDiaSearch`
            wait 4

        // Limpieza de modales
        dom (function(){ var sels = ['button[aria-label="Cerrar"]', 'button.close', '[class*="modal"] button']; for (var i=0; i<sels.length; i++) { var el = document.querySelector(sels[i]); if(el) try{el.click();}catch(e){} } })()

        // Ordenamiento por menor precio si está en galería
        xpDiaSortBtn = '//button[contains(@class, "orderByButton")]'
        if (present(xpDiaSortBtn))
            echo -> Control de ordenamiento detectado en Día %. Haciendo click...
            click `xpDiaSortBtn`
            wait 1
            xpDiaSortOpt = '//button[contains(text(), "Precios más bajo") or contains(text(), "más bajo") or contains(text(), "menor precio")]'
            if (present(xpDiaSortOpt))
                echo -> Aplicando ordenamiento por menor precio en Día %...
                click `xpDiaSortOpt`
                wait 3

        // Recorrido y scroll visual del catálogo
        echo -> Recorriendo y scrolleando el catalogo de Día %...
        dom window.scrollTo(0, 300);
        wait 2
        echo -> Scrolleando catalogo hacia abajo (bloque 1)...
        dom window.scrollBy(0, 600);
        wait 2
        echo -> Scrolleando catalogo hacia abajo (bloque 2)...
        dom window.scrollBy(0, 600);
        wait 2
        echo -> Reubicando vista en el producto seleccionado...
        dom window.scrollTo(0, 350);
        wait 1

        // Clic real en la tarjeta del producto
        xpDiaCard = '(//section//article | //div[contains(@class,"product-summary")] | //article[contains(@class,"product")])[1]//a'
        if (present(xpDiaCard))
            echo -> Haciendo click real en la tarjeta del producto en Día %...
            click `xpDiaCard`
            wait 3

        // Si no entro a la ficha individual, navegar a la URL directa del catalogo
        if (!present('//h1 | //span[contains(@class,"productName")]'))
            if (dia_url != '')
                echo -> Accediendo a la ficha individual de Día % via URL de catalogo...
                targetDiaUrl = dia_url.replace(/^https?:\/\//, '')
                https://`targetDiaUrl`
                wait 3

        // Permanencia visual pedagógica en la ficha individual
        echo -> Ficha de producto en Día % visualizada en vivo (permanencia de confirmacion)...
        wait 4

        // Extracción de Precio, Stock y Promociones en la ficha
        dom return (function() { var title = document.querySelector('h1, span[class*="productName"], [class*="product-name"]'); var price = document.querySelector('[class*="sellingPrice"], [class*="currencyContainer"], [class*="price-best"]'); var stockBtn = document.querySelector('button[class*="add-to-cart"], button[class*="buy-button"]'); var agotadoTxt = document.body.innerText.match(/agotado|sin stock|no disponible/i); var promoBadge = document.querySelector('[class*="discount"], [class*="highlight"], [class*="badge"], [class*="promotion"]'); return JSON.stringify({ nombre: title ? title.innerText.trim() : '', precio: price ? price.innerText.trim() : 'N/D', stock: (stockBtn && !stockBtn.disabled && !agotadoTxt) ? 'DISPONIBLE' : (agotadoTxt ? 'AGOTADO' : 'DISPONIBLE'), promo: promoBadge ? promoBadge.innerText.trim() : 'Sin promocion', url: window.location.href }); })()

        js diaData = JSON.parse(dom_result || '{}')
        if (diaData.nombre != '' && diaData.precio != 'N/D')
            diaNombre = diaData.nombre
            diaPrecio = diaData.precio
            diaStock = diaData.stock
            diaPromo = diaData.promo
            diaUrl = diaData.url
            diaResuelto = true
            echo -> Ficha verificada exitosamente en Día %: `diaNombre` (`diaPrecio`)
            echo -> Stock: `diaStock` | Promocion: `diaPromo`
        else
            wait 2

if diaResuelto equals to true
    js diaSel = crearResultadoExitoso("Día %", diaNombre, diaPrecio, diaUrl, diaStock, diaPromo, solicitudObj)
else
    js diaSel = crearResultadoError("Día %", "PRODUCTO_NO_ENCONTRADO", "No se pudo extraer la ficha del producto en Día %", solicitudObj)


// ==============================================================================
// COMPARACIÓN FINAL Y PERSISTENCIA (15 COLUMNAS CON STOCK Y PROMOCIÓN)
// ==============================================================================
js comparacion = compararYOrdenar([carrefourSel, cotoSel, diaSel], solicitudObj)

write "`cleanCsv(carrefourSel.nombre)`","`cleanPrice(carrefourSel.precio)`","Carrefour","`carrefourSel.url`","`fechaActual`","`carrefourSel.estado`","`cleanCsv(solicitudObj.raw)`","`cleanCsv(carrefourSel.marca)`","`carrefourSel.cantidad`","`carrefourSel.unidad`","`carrefourSel.presentacion`","`carrefourSel.precioNumerico`","`cleanCsv(carrefourSel.stock)`","`cleanCsv(carrefourSel.promocion)`","`carrefourSel.esEquivalente`" to resultados.csv
write "`cleanCsv(cotoSel.nombre)`","`cleanPrice(cotoSel.precio)`","COTO","`cotoSel.url`","`fechaActual`","`cotoSel.estado`","`cleanCsv(solicitudObj.raw)`","`cleanCsv(cotoSel.marca)`","`cotoSel.cantidad`","`cotoSel.unidad`","`cotoSel.presentacion`","`cotoSel.precioNumerico`","`cleanCsv(cotoSel.stock)`","`cleanCsv(cotoSel.promocion)`","`cotoSel.esEquivalente`" to resultados.csv
write "`cleanCsv(diaSel.nombre)`","`cleanPrice(diaSel.precio)`","Día %","`diaSel.url`","`fechaActual`","`diaSel.estado`","`cleanCsv(solicitudObj.raw)`","`cleanCsv(diaSel.marca)`","`diaSel.cantidad`","`diaSel.unidad`","`diaSel.presentacion`","`diaSel.precioNumerico`","`cleanCsv(diaSel.stock)`","`cleanCsv(diaSel.promocion)`","`diaSel.esEquivalente`" to resultados.csv

echo [OK] Resultados guardados en resultados.csv para `producto` `marca` `presentacion`
echo 
