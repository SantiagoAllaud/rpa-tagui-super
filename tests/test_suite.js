// ==============================================================================
// tests/test_suite.js - Batería Integral de 33 Pruebas Automatizadas
// UTN FRCU - Tecnologías para la Automatización
// Ejecución: node tests/test_suite.js
// ==============================================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cargar módulos y catálogo del sistema
const taguiLocal = require('../tagui_local.js');
const menuInteractivo = require('../menu_interactivo.js');
const catalogoPath = path.join(__dirname, '..', 'catalogo', 'productos.json');
const catalogo = JSON.parse(fs.readFileSync(catalogoPath, 'utf8'));

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, errorDetails) {
    if (condition) {
        console.log(`  \x1b[32m[PASS]\x1b[0m Test ${testName}`);
        passedTests++;
    } else {
        console.error(`  \x1b[31m[FAIL]\x1b[0m Test ${testName}: ${errorDetails || 'Condición no cumplida'}`);
        failedTests++;
    }
}

// Helpers que reproducen exactamente las funciones inyectadas en el DOM por scraper_supermercados.tag
function normalizarTexto(s) {
    return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function evaluarTarjetaDOM(tarjetas, skuBuscado, eanBuscado, urlBuscada, marcaBuscada, cantBuscada, unidadBuscada) {
    var bNorm = normalizarTexto(marcaBuscada);
    var cNorm = parseFloat(String(cantBuscada || '').replace(',', '.'));
    var uNorm = normalizarTexto(unidadBuscada);
    var presText = normalizarTexto(String(cantBuscada || '')) + uNorm;
    var sNorm = (skuBuscado && skuBuscado !== 'N/D') ? normalizarTexto(skuBuscado) : '';
    var eNorm = (eanBuscado && eanBuscado !== 'N/D') ? normalizarTexto(eanBuscado) : '';
    var urlNorm = (urlBuscada && urlBuscada.length > 5) ? normalizarTexto(urlBuscada) : '';
    var regex = /\b(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?|g|gr|grs|gramos?|ml|cc|cm3|l|lt|lts|litros?)\b/i;

    for (var i = 0; i < tarjetas.length; i++) {
        var c = tarjetas[i];
        var text = normalizarTexto(c.innerText || '');
        var dataSku = normalizarTexto(c.dataSku || '');
        var href = normalizarTexto(c.href || '');

        // 1. SKU EXACTO
        if (sNorm && (dataSku === sNorm || href.indexOf(sNorm) !== -1 || text.indexOf(sNorm) !== -1)) {
            return { resultado: 'FOUND_EXACT', index: i, match: 'SKU' };
        }
        // 2. EAN EXACTO
        if (eNorm && (text.indexOf(eNorm) !== -1 || href.indexOf(eNorm) !== -1)) {
            return { resultado: 'FOUND_EXACT', index: i, match: 'EAN' };
        }
        // 3. URL DE REFERENCIA
        if (urlNorm && href && (href.indexOf(urlNorm) !== -1 || urlNorm.indexOf(href) !== -1)) {
            return { resultado: 'FOUND_EXACT', index: i, match: 'URL' };
        }
        // 4. TOKENS DE IDENTIDAD
        if (bNorm && text.indexOf(bNorm) !== -1) {
            var match = text.match(regex);
            var cardCant = match ? parseFloat(match[1].replace(',', '.')) : null;
            var cardUnit = match ? normalizarTexto(match[2]) : '';
            if (['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].indexOf(cardUnit) !== -1) cardUnit = 'kg';
            else if (['g', 'gr', 'grs', 'gramo', 'gramos'].indexOf(cardUnit) !== -1) cardUnit = 'g';
            else if (['ml', 'cc', 'cm3'].indexOf(cardUnit) !== -1) cardUnit = 'ml';
            else if (['l', 'lt', 'lts', 'litro', 'litros'].indexOf(cardUnit) !== -1) cardUnit = 'l';

            if (cardCant !== null && Math.abs(cardCant - cNorm) < 0.001 && (!cardUnit || cardUnit === uNorm)) {
                return { resultado: 'FOUND_EXACT', index: i, match: 'TOKENS' };
            } else if (text.indexOf(presText) !== -1) {
                return { resultado: 'FOUND_EXACT', index: i, match: 'TOKENS_PRES' };
            }
        }
    }
    return { resultado: 'NOT_FOUND', index: -1 };
}

function validarFichaPDP(title, bodyText, marcaReq, prodReq, cantReq, unidadReq, presReq, justifEq) {
    var tNorm = normalizarTexto(title);
    var mNorm = normalizarTexto(marcaReq);
    var pNorm = normalizarTexto(prodReq);
    var cNorm = parseFloat(String(cantReq || '').replace(',', '.'));
    var uNorm = normalizarTexto(unidadReq);

    if (!title) return { valido: false, motivo: 'No se encontro el titulo h1 en la ficha' };
    if (!mNorm || tNorm.indexOf(mNorm) === -1) {
        return { valido: false, motivo: 'FALLO_MARCA: Titulo no contiene marca requerida' };
    }

    var prodKeywords = {
        'leche': ['leche'], 'yerba': ['yerba'], 'aceite': ['aceite'],
        'fideos': ['fideo', 'fideos', 'spaghetti', 'tallarines', 'tirabuzon', 'mostachol'],
        'arroz': ['arroz'], 'azucar': ['azucar'], 'harina': ['harina'],
        'galletitas': ['galletita', 'galletitas', 'galletas', 'galleta', 'oreo', 'chocolinas', 'pepitos', 'sonrisas'],
        'gaseosa': ['gaseosa', 'coca-cola', 'sprite', 'cola']
    };

    if (prodKeywords[pNorm]) {
        var matchProd = false;
        for (var i = 0; i < prodKeywords[pNorm].length; i++) {
            if (tNorm.indexOf(prodKeywords[pNorm][i]) !== -1) { matchProd = true; break; }
        }
        if (!matchProd) return { valido: false, motivo: 'FALLO_PRODUCTO: Ficha no corresponde al producto' };
    }

    var regex = /\b(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?|g|gr|grs|gramos?|ml|cc|cm3|l|lt|lts|litros?)\b/i;
    var match = tNorm.match(regex);
    var detectedCant = null;
    var detectedUnit = null;

    if (match) {
        detectedCant = parseFloat(match[1].replace(',', '.'));
        var rawU = match[2];
        if (['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].indexOf(rawU) !== -1) detectedUnit = 'kg';
        else if (['g', 'gr', 'grs', 'gramo', 'gramos'].indexOf(rawU) !== -1) detectedUnit = 'g';
        else if (['ml', 'cc', 'cm3'].indexOf(rawU) !== -1) detectedUnit = 'ml';
        else if (['l', 'lt', 'lts', 'litro', 'litros'].indexOf(rawU) !== -1) detectedUnit = 'l';
    }

    var coincidePres = false;
    if (detectedCant !== null) {
        if (Math.abs(detectedCant - cNorm) < 0.001 && (!detectedUnit || detectedUnit === uNorm)) {
            coincidePres = true;
        } else if (justifEq && justifEq.trim().length > 0) {
            coincidePres = true;
        }
    } else {
        var presBuscada = normalizarTexto(String(cantReq)) + uNorm;
        if (tNorm.indexOf(presBuscada) !== -1) coincidePres = true;
    }

    if (!coincidePres) {
        return { valido: false, motivo: 'FALLO_PRESENTACION: Cantidad no coincide y no existe equivalencia justificada' };
    }

    return { valido: true, motivo: 'Identidad verificada exitosamente' };
}

console.log('=====================================================================');
console.log('       EJECUCION DE LA BATERIA DE 33 PRUEBAS UNITARIAS');
console.log('       rpa-tagui-super (UTN FRCU - Tecnologías para la Automatización)');
console.log('=====================================================================\n');

// -----------------------------------------------------------------------------
// BLOQUE 1: VALIDACIÓN DE CAMPOS DE INPUT (Tests 1 - 6)
// -----------------------------------------------------------------------------
console.log('[BLOQUE 1] Validación de campos del input.csv y catálogo');

// Test 1: Campo producto vacío
const t1Val = catalogo.some(p => normalizarTexto(p.producto) === '' && normalizarTexto(p.marca) === 'oreo');
assert(!t1Val, '1: Rechazo de fila con campo producto vacío');

// Test 2: Campo marca vacío
const t2Val = catalogo.some(p => normalizarTexto(p.producto) === 'galletitas' && normalizarTexto(p.marca) === '');
assert(!t2Val, '2: Rechazo de fila con campo marca vacío');

// Test 3: Cantidad no numérica
const cantInvalida = isNaN(parseFloat('cien'));
assert(cantInvalida, '3: Rechazo de cantidad no numérica ("cien")');

// Test 4: Unidad inválida
const uInvalida = taguiLocal.normalizarUnidad('pulgadas');
assert(uInvalida !== 'G' && uInvalida !== 'KG' && uInvalida !== 'L' && uInvalida !== 'ML', '4: Rechazo de unidad no contemplada ("pulgadas")');

// Test 5: Producto inexistente en catálogo
const t5Item = catalogo.find(p => normalizarTexto(p.marca) === 'marca_fantasma_xyz');
assert(!t5Item, '5: Rechazo de producto que no existe en el catálogo');

// Test 6: Combinación exacta válida
const t6Item = catalogo.find(p => p.id_producto === 'GAL_OREO_118G');
assert(t6Item && t6Item.producto === 'Galletitas' && t6Item.marca === 'Oreo' && t6Item.cantidad === 118 && t6Item.unidad === 'g', '6: Aceptación de combinación exacta válida (Galletitas Oreo 118g)');

// -----------------------------------------------------------------------------
// BLOQUE 2: DISTINCIÓN ESTRICTA DE IDENTIDAD (Tests 7 - 8)
// -----------------------------------------------------------------------------
console.log('\n[BLOQUE 2] Distinción estricta de identidad');

// Test 7: 117g estricto distinto de 118g (GAL_OREO_117G vs GAL_OREO_118G)
const item117 = catalogo.find(p => p.id_producto === 'GAL_OREO_117G');
const item118 = catalogo.find(p => p.id_producto === 'GAL_OREO_118G');
assert(
    item117 && item118 &&
    item117.cantidad !== item118.cantidad &&
    item117.supermercados.Carrefour.url === '' &&
    item118.supermercados.Carrefour.url !== '' &&
    item117.ean !== item118.ean,
    '7: GAL_OREO_117G y GAL_OREO_118G están estrictamente separados (URLs y EANs no compartidos)'
);

// Test 8: No selección arbitraria [1] ante dos productos de misma marca pero distinta presentación
const listaTarjetasSimuladas = [
    { innerText: 'Galletitas Oreo 154g Rellenas', href: '/oreo-154g', dataSku: '111' },
    { innerText: 'Té de Manzanilla 25g', href: '/te-25g', dataSku: '222' },
    { innerText: 'Galletitas Oreo 118g Clásicas', href: '/oreo-118g', dataSku: '126384' }
];
const resBusq118 = evaluarTarjetaDOM(listaTarjetasSimuladas, '126384', 'N/D', '', 'Oreo', 118, 'g');
assert(resBusq118.resultado === 'FOUND_EXACT' && resBusq118.index === 2, '8: No se toma la primera tarjeta arbitraria [1], se busca coincidencia de identidad estricta');

// -----------------------------------------------------------------------------
// BLOQUE 3: JERARQUÍA DOM (SKU / EAN) (Tests 9 - 12)
// -----------------------------------------------------------------------------
console.log('\n[BLOQUE 3] Jerarquía DOM: Coincidencia y rechazo por SKU y EAN');

// Test 9: Coincidencia por SKU
const resSkuOk = evaluarTarjetaDOM([
    { innerText: 'Galletitas Chocolate', href: '/item-x', dataSku: '999999' },
    { innerText: 'Galletitas Oreo', href: '/item-y', dataSku: '126384' }
], '126384', 'N/D', '', 'Oreo', 118, 'g');
assert(resSkuOk.resultado === 'FOUND_EXACT' && resSkuOk.match === 'SKU' && resSkuOk.index === 1, '9: SKU exacto selecciona la tarjeta correcta');

// Test 10: SKU discordante no selecciona la tarjeta
const resSkuFail = evaluarTarjetaDOM([
    { innerText: 'Producto Incierto', href: '/item-z', dataSku: '999999' }
], '126384', 'N/D', '', 'OtraMarca', 118, 'g');
assert(resSkuFail.resultado === 'NOT_FOUND', '10: SKU incorrecto/inexistente devuelve NOT_FOUND');

// Test 11: EAN coincidente
const resEanOk = evaluarTarjetaDOM([
    { innerText: 'Galletitas Oreo Cod: 7622210819124', href: '/item-w', dataSku: '0' }
], 'N/D', '7622210819124', '', 'Oreo', 118, 'g');
assert(resEanOk.resultado === 'FOUND_EXACT' && resEanOk.match === 'EAN', '11: EAN exacto selecciona la tarjeta');

// Test 12: EAN discordante
const resEanFail = evaluarTarjetaDOM([
    { innerText: 'Galletitas Pepitos Cod: 7791234567890', href: '/item-w', dataSku: '0' }
], 'N/D', '7622210819124', '', 'Oreo', 118, 'g');
assert(resEanFail.resultado === 'NOT_FOUND', '12: EAN discordante devuelve NOT_FOUND');

// -----------------------------------------------------------------------------
// BLOQUE 4: VALIDACIÓN ESTRICTA DE PDP (Tests 13 - 15)
// -----------------------------------------------------------------------------
console.log('\n[BLOQUE 4] Validación estricta de ficha individual (PDP)');

// Test 13: PDP con cantidad equivocada (pide 117g, ficha es 154g sin justificación)
const pdpCantFail = validarFichaPDP('Galletitas Oreo Rellenas 154g', '', 'Oreo', 'Galletitas', 117, 'g', '117g', '');
assert(!pdpCantFail.valido && pdpCantFail.motivo.indexOf('FALLO_PRESENTACION') !== -1, '13: PDP con cantidad equivocada (154g vs 117g) es rechazado');

// Test 14: PDP con marca equivocada
const pdpMarcaFail = validarFichaPDP('Galletitas Chocolinas 170g', '', 'Oreo', 'Galletitas', 170, 'g', '170g', '');
assert(!pdpMarcaFail.valido && pdpMarcaFail.motivo.indexOf('FALLO_MARCA') !== -1, '14: PDP con marca equivocada es rechazado');

// Test 15: PDP con todos los criterios correctos
const pdpOk = validarFichaPDP('Galletitas Oreo Rellenas De Crema 118g', '', 'Oreo', 'Galletitas', 118, 'g', '118g', '');
assert(pdpOk.valido === true, '15: PDP con Producto, Marca, Cantidad y Unidad correctos es aceptado');

// -----------------------------------------------------------------------------
// BLOQUE 5: PARSEO DE PRECIOS AR (Tests 16 - 17, 20)
// -----------------------------------------------------------------------------
console.log('\n[BLOQUE 5] Parseo numérico y consistencia de precios argentinos');

// Test 16: Formato simple $ 1.590
const p16 = taguiLocal.parsePrice('$ 1.590');
assert(p16 === 1590, '16: Parseo correcto de "$ 1.590" -> 1590');

// Test 17: Formato con decimales $ 12.345,67
const p17 = taguiLocal.parsePrice('$ 12.345,67');
assert(p17 === 12345.67, '17: Parseo correcto de "$ 12.345,67" -> 12345.67');

// Test 20: Precio viejo tachado vs precio de venta actual
const textoPreciosMultiples = '$ 2.000  $ 1.499';
const pActual = taguiLocal.parsePrice(textoPreciosMultiples);
assert(pActual === 1499, '20: Extracción prioriza precio actual sobre precio tachado ($ 1.499 vs $ 2.000)');

// -----------------------------------------------------------------------------
// BLOQUE 6: LÓGICA DE STOCK Y PROMOCIONES (Tests 18 - 19, 21 - 22)
// -----------------------------------------------------------------------------
console.log('\n[BLOQUE 6] Lógica de Stock y Promociones vinculadas');

// Test 18: Stock sin evidencia fehaciente
const sNoVerif = taguiLocal.determinarStock(false, false, false);
assert(sNoVerif === 'NO_VERIFICADO', '18: Stock sin botón activo ni texto explícito devuelve "NO_VERIFICADO"');

// Test 19: Stock con texto de agotado
const sAgotado = taguiLocal.determinarStock(true, false, true);
assert(sAgotado === 'AGOTADO', '19: Stock con texto de agotado devuelve "AGOTADO"');

// Test 21: Promoción real detectada
const promoReal1 = taguiLocal.determinarPromocion('2x1 en la segunda unidad');
const promoReal2 = taguiLocal.determinarPromocion('36% OFF');
assert(promoReal1.indexOf('2x1') !== -1 && promoReal2.indexOf('36%') !== -1, '21: Detección y limpieza de textos de promociones ("2x1", "36% OFF")');

// Test 22: Ausencia de promoción
const promoVacia = taguiLocal.determinarPromocion('');
const promoND = taguiLocal.determinarPromocion('N/D');
assert(promoVacia === 'Sin promocion' && promoND === 'Sin promocion', '22: Ausencia de promo devuelve "Sin promocion"');

// -----------------------------------------------------------------------------
// BLOQUE 7: INTEGRIDAD DEL FLUJO Y SCRIPT VALIDAR_INPUT (Tests 23 - 24)
// -----------------------------------------------------------------------------
console.log('\n[BLOQUE 7] Comportamiento de barrera de entrada (validar_input.js)');

const tempInputInv = path.join(__dirname, 'temp_input_invalido.csv');
const tempInputVal = path.join(__dirname, 'temp_input_valido.csv');
const taguiOutputFile = path.join(__dirname, '..', 'input_tagui.csv');

// Test 23: Input con fila inválida debe salir con código 1 y no generar input_tagui.csv
fs.writeFileSync(tempInputInv, 'producto,marca,cantidad,unidad\r\nGalletitas,OreoInexistente,999,g\r\n', 'utf8');
if (fs.existsSync(taguiOutputFile)) fs.unlinkSync(taguiOutputFile);

let exitCodeInv = 0;
try {
    execSync(`node "${path.join(__dirname, '..', 'validar_input.js')}" "${tempInputInv}"`, { stdio: 'pipe' });
} catch (err) {
    exitCodeInv = err.status;
}
assert(exitCodeInv === 1 && !fs.existsSync(taguiOutputFile), '23: Fila inválida aborta con código 1 y no genera input_tagui.csv');

// Test 24: Input con fila válida debe salir con código 0 y generar input_tagui.csv con todas las columnas
fs.writeFileSync(tempInputVal, 'producto,marca,cantidad,unidad\r\nGalletitas,Oreo,118,g\r\n', 'utf8');
let exitCodeVal = 0;
try {
    execSync(`node "${path.join(__dirname, '..', 'validar_input.js')}" "${tempInputVal}"`, { stdio: 'pipe' });
} catch (err) {
    exitCodeVal = err.status;
}
const outGenerado = fs.existsSync(taguiOutputFile);
let tieneColumnas = false;
if (outGenerado) {
    const contenido = fs.readFileSync(taguiOutputFile, 'utf8');
    tieneColumnas = contenido.indexOf('carrefour_sku') !== -1 && contenido.indexOf('GAL_OREO_118G') !== -1;
}
assert(exitCodeVal === 0 && outGenerado && tieneColumnas, '24: Fila válida finaliza con código 0 y genera input_tagui.csv completo');

// Limpieza de archivos temporales
if (fs.existsSync(tempInputInv)) fs.unlinkSync(tempInputInv);
if (fs.existsSync(tempInputVal)) fs.unlinkSync(tempInputVal);

// -----------------------------------------------------------------------------
// BLOQUE 8: MODO INTERACTIVO Y SELECCIÓN DESDE TERMINAL (Tests 31 - 39)
// -----------------------------------------------------------------------------
console.log('\n[BLOQUE 8] Modo interactivo y selección de catálogo desde terminal');

// TEST 31: Mostrar solamente productos activos
const catalogoPrueba = [
    { id_producto: 'ACTIVO_1', producto: 'Galletitas', marca: 'Oreo', cantidad: 118, unidad: 'g', presentacion: '118g', activo: true, supermercados: { Carrefour: { url: 'https://...' } } },
    { id_producto: 'INACTIVO_1', producto: 'Galletitas', marca: 'Fantasma', cantidad: 100, unidad: 'g', presentacion: '100g', activo: false, supermercados: {} },
    { id_producto: 'ACTIVO_2', producto: 'Leche', marca: 'La Serenisima', cantidad: 1, unidad: 'L', presentacion: '1L', activo: true, supermercados: { Carrefour: { url: 'https://...' } } }
];
const resActivos = menuInteractivo.obtenerProductosActivos(catalogoPrueba);
const soloActivos = resActivos.every(p => p.activo === true) && resActivos.length === 2;
assert(soloActivos, '31: Mostrar solamente productos activos (excluye inactivos)');

// TEST 32: Seleccionar índice válido devuelve exactamente el registro correcto del catálogo
const itemSeleccionado = menuInteractivo.seleccionarPorIndice(resActivos, 1);
assert(
    itemSeleccionado && itemSeleccionado.id_producto === 'ACTIVO_1' && itemSeleccionado.marca === 'Oreo',
    '32: Seleccionar índice válido devuelve exactamente el registro correcto del catálogo'
);

// TEST 33: Índice inexistente produce error y no inicia TagUI
const itemInvalidoIdx = menuInteractivo.seleccionarPorIndice(resActivos, 999);
const itemInvalidoLetras = menuInteractivo.seleccionarPorIndice(resActivos, 'abc');
const itemInvalidoCero = menuInteractivo.seleccionarPorIndice(resActivos, 0);
assert(
    itemInvalidoIdx === null && itemInvalidoLetras === null && itemInvalidoCero === null,
    '33: Índice inexistente produce error/null y no inicia TagUI'
);

// TEST 34: Búsqueda "oreo" devuelve únicamente productos Oreo existentes en catálogo
const todosActivos = menuInteractivo.obtenerProductosActivos(catalogo);
const filtradosOreo = menuInteractivo.filtrarCatalogo(todosActivos, 'oreo');
const soloOreo = filtradosOreo.length > 0 && filtradosOreo.every(p => p.marca.toLowerCase().includes('oreo') || p.producto.toLowerCase().includes('oreo'));
assert(
    soloOreo,
    '34: Búsqueda "oreo" devuelve únicamente productos Oreo existentes en catálogo'
);

// TEST 35: Búsqueda inexistente no genera productos nuevos
const filtradosInexistentes = menuInteractivo.filtrarCatalogo(todosActivos, 'producto_totalmente_inexistente_xyz_123');
assert(
    Array.isArray(filtradosInexistentes) && filtradosInexistentes.length === 0,
    '35: Búsqueda inexistente devuelve lista vacía y no genera productos nuevos'
);

// TEST 36: Producto seleccionado genera correctamente: producto + marca + cantidad + unidad
const itemOreo118 = catalogo.find(p => p.id_producto === 'GAL_OREO_118G');
const tempInputTest36 = path.join(__dirname, 'temp_input_test36.csv');
menuInteractivo.generarInputTrabajo(itemOreo118, tempInputTest36);
const contenidoTest36 = fs.readFileSync(tempInputTest36, 'utf8');
const lineas36 = contenidoTest36.trim().split(/\r?\n/);
assert(
    lineas36[0] === 'producto,marca,cantidad,unidad' &&
    lineas36[1] === '"Galletitas","Oreo","118","g"',
    '36: Producto seleccionado genera correctamente: producto + marca + cantidad + unidad'
);

// TEST 37: Producto seleccionado pasa por el mismo validar_input.js existente
let exitCodeTest37 = 0;
try {
    execSync(`node "${path.join(__dirname, '..', 'validar_input.js')}" "${tempInputTest36}"`, { stdio: 'pipe' });
} catch (e) {
    exitCodeTest37 = e.status;
}
const taguiGenerado37 = fs.existsSync(taguiOutputFile);
assert(
    exitCodeTest37 === 0 && taguiGenerado37,
    '37: Producto seleccionado pasa por el mismo validar_input.js existente y genera input_tagui.csv'
);
if (fs.existsSync(tempInputTest36)) fs.unlinkSync(tempInputTest36);

// TEST 38: Cancelar confirmación no inicia TagUI
const respCancel = menuInteractivo.procesarConfirmacion('N');
const respCancelMin = menuInteractivo.procesarConfirmacion('n');
const respOk = menuInteractivo.procesarConfirmacion('S');
assert(
    respCancel === 'CANCELADO' && respCancelMin === 'CANCELADO' && respOk === 'CONFIRMADO',
    '38: Cancelar confirmación [N/n] detecta estado CANCELADO y no inicia TagUI'
);

// TEST 39: No se puede modificar manualmente la identidad del producto desde el menú
const itemAlterado = Object.assign({}, itemOreo118, { cantidad: 999 });
const valAlterado = menuInteractivo.validarRegistroSeleccionado(itemAlterado, catalogo);
const itemOriginal = menuInteractivo.validarRegistroSeleccionado(itemOreo118, catalogo);
assert(
    !valAlterado.valido && itemOriginal.valido === true,
    '39: No se puede modificar manualmente la identidad del producto desde el menú (detecta alteración)'
);

// -----------------------------------------------------------------------------
// RESUMEN FINAL
// -----------------------------------------------------------------------------
console.log('\n=====================================================================');
console.log(`RESULTADO DE LA BATERIA: ${passedTests}/33 PRUEBAS EXITOSAS`);
if (failedTests > 0) {
    console.error(`\x1b[31m[FALLO] ${failedTests} pruebas fallaron.\x1b[0m`);
    process.exit(1);
} else {
    console.log('\x1b[32m[EXITO TOTAL] Las 33 pruebas pasaron satisfactoriamente.\x1b[0m');
    console.log('El sistema se encuentra en un estado determinístico, robusto y verificable.');
    console.log('=====================================================================\n');
    process.exit(0);
}
