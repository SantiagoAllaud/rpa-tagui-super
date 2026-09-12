// ==============================================================================
// RPA Supermercados: Carrefour, COTO y Día %
// Materia: Tecnologías para la Automatización - UTN FRCU
// Arquitectura: TagUI (Script .tag) -> Chrome -> Extracción DOM -> resultados.csv
// Ejecución: tagui scraper_supermercados.tag input.csv
// ==============================================================================

// 1. Inicialización en la primera iteración
if iteration equals to 1
    echo ============================================================
    echo INICIANDO AUTOMATIZACION RPA DE SUPERMERCADOS
    echo Leyendo lista de productos desde input.csv...
    echo ============================================================
    // Inicializar cabeceras del archivo de persistencia local resultados.csv
    dump "Nombre","Precio","Supermercado","URL","Fecha" to resultados.csv

// 2. Preparación de variables de la iteración
fechaActual = getFechaActual()
encodedProd = encodeSearchTerm(producto)

echo 
echo ------------------------------------------------------------
echo Iteracion `iteration`: Buscando "`producto`"
echo Fecha: `fechaActual`
echo ------------------------------------------------------------

// ==============================================================================
// MODULO 1: CARREFOUR ARGENTINA
// ==============================================================================
echo [Carrefour] Accediendo al buscador para `producto`...
https://www.carrefour.com.ar/`encodedProd`?_q=`encodedProd`
wait 4

// Cerrar modales si existen
if (present('//button[@aria-label="Cerrar"]'))
    click //button[@aria-label="Cerrar"]
if (present('//*[@id="onetrust-accept-btn-handler"]'))
    click //*[@id="onetrust-accept-btn-handler"]
if (present('//button[contains(@class,"close")]'))
    click //button[contains(@class,"close")]

carrefourNombre = "No encontrado"
carrefourPrecio = "N/D"
carrefourUrl = "https://www.carrefour.com.ar/"

xpCarrefourCard = '(//article[contains(@class,"product")] | //div[contains(@class,"product-summary")])[1]'
xpCarrefourNombre = '(' + xpCarrefourCard + '//h2 | ' + xpCarrefourCard + '//h3 | ' + xpCarrefourCard + '//span[contains(@class,"productBrand")])[1]'
xpCarrefourPrecio = '(' + xpCarrefourCard + '//span[contains(@class,"sellingPrice")] | ' + xpCarrefourCard + '//span[contains(@class,"currencyContainer")] | ' + xpCarrefourCard + '//span[contains(text(),"$")])[1]'
xpCarrefourLink = '(' + xpCarrefourCard + '//a[contains(@href, "/p") or contains(@href, "-/p") or not(starts-with(@href, "#"))])[1]/@href'

if (present(xpCarrefourCard))
    read `xpCarrefourNombre` to carrefourNombre
    read `xpCarrefourPrecio` to carrefourPrecio
    if (present(xpCarrefourLink))
        read `xpCarrefourLink` to carrefourUrl

carrefourNombre = cleanCsv(carrefourNombre)
carrefourPrecio = cleanPrice(carrefourPrecio)
carrefourUrl = formatUrl("https://www.carrefour.com.ar", carrefourUrl)

echo [Carrefour] Obtenido: `carrefourNombre` - `carrefourPrecio`
write "`carrefourNombre`","`carrefourPrecio`","Carrefour","`carrefourUrl`","`fechaActual`" to resultados.csv


// ==============================================================================
// MODULO 2: COTO DIGITAL
// ==============================================================================
echo [COTO] Accediendo al buscador para `producto`...
https://www.coto.com.ar/productos/`encodedProd`
wait 5

cotoNombre = "No encontrado"
cotoPrecio = "N/D"
cotoUrl = "https://www.coto.com.ar/productos/" + encodedProd

dom return (function() { var cp = document.querySelector('.centro-precios'); if (!cp) return JSON.stringify({ nombre: 'No encontrado', precio: 'N/D' }); var text = cp.innerText || ''; var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; }); var nombre = lines.length > 0 ? lines[0] : 'Producto COTO'; var priceMatch = text.match(/\$\s*[\d\.\,]+/); var precio = priceMatch ? priceMatch[0] : 'N/D'; return JSON.stringify({ nombre: nombre, precio: precio }); })()

js cotoData = JSON.parse(dom_result)
cotoNombre = cleanCsv(cotoData.nombre)
cotoPrecio = cleanPrice(cotoData.precio)

echo [COTO] Obtenido: `cotoNombre` - `cotoPrecio`
write "`cotoNombre`","`cotoPrecio`","COTO","`cotoUrl`","`fechaActual`" to resultados.csv


// ==============================================================================
// MODULO 3: SUPERMERCADOS DIA %
// ==============================================================================
echo [Día %] Accediendo al buscador para `producto`...
https://diaonline.supermercadosdia.com.ar/`encodedProd`?_q=`encodedProd`
wait 4

// Cerrar modales si existen
if (present('//button[@aria-label="Cerrar"]'))
    click //button[@aria-label="Cerrar"]
if (present('//button[contains(@class,"close")]'))
    click //button[contains(@class,"close")]

diaNombre = "No encontrado"
diaPrecio = "N/D"
diaUrl = "https://diaonline.supermercadosdia.com.ar/"

xpDiaCard = '(//section//article | //div[contains(@class,"product-summary")] | //article[contains(@class,"product")])[1]'
xpDiaNombre = '(' + xpDiaCard + '//span[contains(@class,"productBrand")] | ' + xpDiaCard + '//span[contains(@class,"productName")] | ' + xpDiaCard + '//h3)[1]'
xpDiaPrecio = '(' + xpDiaCard + '//span[contains(@class,"sellingPrice")] | ' + xpDiaCard + '//span[contains(@class,"price")] | ' + xpDiaCard + '//span[contains(text(),"$")])[1]'
xpDiaLink = '(' + xpDiaCard + '//a[contains(@href, "/p") or not(starts-with(@href, "#"))])[1]/@href'

if (present(xpDiaCard))
    read `xpDiaNombre` to diaNombre
    read `xpDiaPrecio` to diaPrecio
    if (present(xpDiaLink))
        read `xpDiaLink` to diaUrl

diaNombre = cleanCsv(diaNombre)
diaPrecio = cleanPrice(diaPrecio)
diaUrl = formatUrl("https://diaonline.supermercadosdia.com.ar", diaUrl)

echo [Día %] Obtenido: `diaNombre` - `diaPrecio`
write "`diaNombre`","`diaPrecio`","Día %","`diaUrl`","`fechaActual`" to resultados.csv

echo Guardados resultados para `producto` en resultados.csv
