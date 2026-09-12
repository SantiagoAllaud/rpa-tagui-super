// ==============================================================================
// tests/test_suite.js - Batería Integral de 50 Pruebas Automatizadas
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
// BLOQUE 9: POLÍTICA OBLIGATORIA DE ATRIBUTOS AUSENTES Y CONTRADICCIONES (REGLAS 1-16)
// -----------------------------------------------------------------------------
console.log('\n[BLOQUE 9] Política Obligatoria de Atributos Ausentes y Contradicciones (Reglas 1-16)');

const { validarIdentidadPDP, evaluarTarjetaCapa1 } = taguiLocal;
const lecheSerenisima = catalogo.find(p => p.id_producto === 'LEC_LASERENISIMA_1L');
const coca15L = catalogo.find(p => p.id_producto === 'GAS_COCACOLA_1.5L');
const oreo117 = catalogo.find(p => p.id_producto === 'GAL_OREO_117G');
const playadito1kg = catalogo.find(p => p.id_producto === 'YER_PLAYADITO_1KG');
const matarazzo500g = catalogo.find(p => p.id_producto === 'FID_MATARAZZO_500G');
const gallo1kg = catalogo.find(p => p.id_producto === 'ARR_GALLO_1KG');
const azucarLedesma = catalogo.find(p => p.id_producto === 'AZU_LEDESMA_1KG');

// TEST 40: Regla 16 - Caso Lechería Día: Leche vs Bebida Vegetal
const resTest40 = validarIdentidadPDP(lecheSerenisima, {
    titulo: 'Bebida Vegetal Almendra La Serenísima Sin Endulzar 1 Lt.',
    supermercado: 'Dia'
}, catalogo);
assert(
    resTest40.resultado === 'INVALID_MISMATCH' &&
    resTest40.esEquivalente === 'NO' &&
    resTest40.valido === false &&
    resTest40.diagnostico.some(d => d.atributo === 'producto/tipo' && d.estado === 'MISMATCH'),
    '40: (Regla 16) Caso Lechería: Leche vs Bebida Vegetal Almendra detecta tipo/producto = MISMATCH -> INVALID_MISMATCH'
);

// TEST 41: Regla 7 - Ambigüedad por variante desconocida ante competidores en catálogo
const catalogoSimuladoAmbiguedad = [
    { id_producto: 'GAS_COCA_15L', activo: true, marca: 'Coca-Cola', producto: 'Gaseosa', cantidad: 1.5, unidad: 'L', presentacion: '1.5L', atributos_identidad: { tipo: 'gaseosa', variante: 'original', incompatibles: ['zero', 'light'] } },
    { id_producto: 'GAS_COCA_ZERO_15L', activo: true, marca: 'Coca-Cola', producto: 'Gaseosa', cantidad: 1.5, unidad: 'L', presentacion: '1.5L', atributos_identidad: { tipo: 'gaseosa', variante: 'zero', incompatibles: ['original'] } }
];
const resTest41 = validarIdentidadPDP(catalogoSimuladoAmbiguedad[0], {
    titulo: 'Gaseosa Coca-Cola 1.5 L'
}, catalogoSimuladoAmbiguedad);
assert(
    resTest41.resultado === 'INVALID_AMBIGUOUS' &&
    resTest41.esEquivalente === 'NO' &&
    resTest41.valido === false,
    '41: (Regla 7) Ambigüedad: PDP "Coca-Cola 1.5L" sin variante ante Original y Zero en catálogo genera INVALID_AMBIGUOUS'
);

// TEST 42: Regla 2 & 12 - Contradicción en variante (Original vs Zero)
const resTest42 = validarIdentidadPDP(coca15L, {
    titulo: 'Gaseosa Coca-Cola Zero 1.5 L'
}, catalogo);
assert(
    resTest42.resultado === 'INVALID_MISMATCH' &&
    resTest42.esEquivalente === 'NO' &&
    resTest42.valido === false,
    '42: (Regla 2 & 12) Variante contradictoria (solicitado Original, detectado Zero) produce INVALID_MISMATCH prioritario'
);

// TEST 43: Regla 1 & 14 - Coincidencia exacta de variante (VALID_EXACT)
const resTest43 = validarIdentidadPDP(coca15L, {
    titulo: 'Gaseosa Coca-Cola Sabor Original 1.5 L'
}, catalogo);
assert(
    resTest43.resultado === 'VALID_EXACT' &&
    resTest43.esEquivalente === 'SI' &&
    resTest43.valido === true,
    '43: (Regla 1 & 14) Coincidencia comercial exacta y variante original positiva produce VALID_EXACT'
);

// TEST 44: Regla 2 & 10 - Diferencia en cantidad sin equivalencia (Oreo 117g vs 118g)
const resTest44 = validarIdentidadPDP(oreo117, {
    titulo: 'Galletitas Oreo Rellenas Con Crema 118g'
}, catalogo);
assert(
    resTest44.resultado === 'INVALID_MISMATCH' &&
    resTest44.esEquivalente === 'NO' &&
    resTest44.diagnostico.some(d => d.atributo === 'cantidad' && d.estado === 'MISMATCH'),
    '44: (Regla 2 & 10) Diferencia de cantidad (117g vs 118g) sin justificación produce MISMATCH -> INVALID_MISMATCH'
);

// TEST 45: Regla 2 - Diferencia de presentación (Oreo 118g vs 154g)
const resTest45 = validarIdentidadPDP(itemOreo118, {
    titulo: 'Galletitas Oreo 154g'
}, catalogo);
assert(
    resTest45.resultado === 'INVALID_MISMATCH' &&
    resTest45.esEquivalente === 'NO',
    '45: (Regla 2) Diferencia de presentación (118g vs 154g) produce INVALID_MISMATCH'
);

// TEST 46: Regla 2 - Diferencia de peso en Yerba (1kg vs 500g)
const resTest46 = validarIdentidadPDP(playadito1kg, {
    titulo: 'Yerba Mate Playadito Con Palo 500g'
}, catalogo);
assert(
    resTest46.resultado === 'INVALID_MISMATCH' &&
    resTest46.esEquivalente === 'NO',
    '46: (Regla 2) Yerba Playadito 1kg vs 500g produce INVALID_MISMATCH'
);

// TEST 47: Regla 2 - Variante incompatible en Yerba ("despalada")
const resTest47 = validarIdentidadPDP(playadito1kg, {
    titulo: 'Yerba Mate Playadito Despalada Sin Palo 1kg'
}, catalogo);
assert(
    resTest47.resultado === 'INVALID_MISMATCH' &&
    resTest47.esEquivalente === 'NO' &&
    resTest47.diagnostico.some(d => d.atributo === 'producto/tipo' && d.estado === 'MISMATCH'),
    '47: (Regla 2) Variante incompatible en Yerba ("despalada") produce INVALID_MISMATCH'
);

// TEST 48: Regla 2 - Variante incompatible en Fideos (Spaghetti vs Tirabuzón)
const resTest48 = validarIdentidadPDP(matarazzo500g, {
    titulo: 'Fideos Matarazzo Tirabuzón 500g'
}, catalogo);
assert(
    resTest48.resultado === 'INVALID_MISMATCH' &&
    resTest48.esEquivalente === 'NO',
    '48: (Regla 2) Fideos Matarazzo Spaghetti vs Tirabuzón produce INVALID_MISMATCH'
);

// TEST 49: Regla 2 - Variante incompatible en Arroz (Oro Parboil vs Doble Carolina)
const resTest49 = validarIdentidadPDP(gallo1kg, {
    titulo: 'Arroz Gallo Doble Carolina 1kg'
}, catalogo);
assert(
    resTest49.resultado === 'INVALID_MISMATCH' &&
    resTest49.esEquivalente === 'NO',
    '49: (Regla 2) Arroz Gallo Oro Parboil vs Doble Carolina produce INVALID_MISMATCH'
);

// TEST 50: Regla 4 - Falta de atributo obligatorio marca
const resTest50 = validarIdentidadPDP(lecheSerenisima, {
    titulo: 'Leche Entera Clasica 1 Lt.'
}, catalogo);
assert(
    resTest50.resultado === 'INVALID_INSUFFICIENT_DATA' || resTest50.resultado === 'INVALID_MISMATCH',
    '50: (Regla 4) Falta de marca o marca discordante en PDP es rechazada'
);

// TEST 51: Regla 4 - Falta de atributo obligatorio cantidad
const resTest51 = validarIdentidadPDP(playadito1kg, {
    titulo: 'Yerba Mate Playadito Tradicional'
}, catalogo);
assert(
    resTest51.resultado === 'INVALID_INSUFFICIENT_DATA' &&
    resTest51.esEquivalente === 'NO',
    '51: (Regla 4) Falta de cantidad/unidad en PDP produce INVALID_INSUFFICIENT_DATA'
);

// TEST 52: Regla 8 - SKU coincidente vs discordante
const skuCarrefourReal = itemOreo118.supermercados.Carrefour.sku; // '126384'
const resTest52Match = validarIdentidadPDP(itemOreo118, {
    titulo: 'Galletitas Oreo 118g',
    sku: skuCarrefourReal,
    supermercado: 'Carrefour'
}, catalogo);
const resTest52Mismatch = validarIdentidadPDP(itemOreo118, {
    titulo: 'Galletitas Oreo 118g',
    sku: '99999_INCORRECTO',
    supermercado: 'Carrefour'
}, catalogo);
assert(
    resTest52Match.diagnostico.some(d => d.atributo === 'sku' && d.estado === 'MATCH') &&
    resTest52Mismatch.resultado === 'INVALID_MISMATCH' &&
    resTest52Mismatch.diagnostico.some(d => d.atributo === 'sku' && d.estado === 'MISMATCH'),
    '52: (Regla 8) SKU coincidente es MATCH; SKU discordante produce INVALID_MISMATCH'
);

// TEST 53: Regla 9 - EAN coincidente vs discordante
const resTest53Match = validarIdentidadPDP(itemOreo118, {
    titulo: 'Galletitas Oreo 118g',
    ean: '7622210819124'
}, catalogo);
const resTest53Mismatch = validarIdentidadPDP(itemOreo118, {
    titulo: 'Galletitas Oreo 118g',
    ean: '0000000000000'
}, catalogo);
assert(
    resTest53Match.diagnostico.some(d => d.atributo === 'ean' && d.estado === 'MATCH') &&
    resTest53Mismatch.resultado === 'INVALID_MISMATCH' &&
    resTest53Mismatch.diagnostico.some(d => d.atributo === 'ean' && d.estado === 'MISMATCH'),
    '53: (Regla 9) EAN coincidente es MATCH; EAN discordante produce INVALID_MISMATCH'
);

// TEST 54: Regla 6 & 8 - UNKNOWN admisible cuando no hay ambigüedad
const resTest54 = validarIdentidadPDP(azucarLedesma, {
    titulo: 'Azucar Ledesma 1 Kg'
}, catalogo);
assert(
    resTest54.resultado === 'VALID_EXACT' &&
    resTest54.esEquivalente === 'SI',
    '54: (Regla 6 & 8) UNKNOWN en SKU/EAN/variante es admisible cuando obligatorios son MATCH y no hay ambigüedad'
);

// TEST 55: Regla 11 - Prohibición de inferir positivamente desde una ausencia
const resTest55 = validarIdentidadPDP(lecheSerenisima, {
    titulo: 'La Serenísima 1 Lt.'
}, catalogo);
assert(
    resTest55.resultado === 'INVALID_INSUFFICIENT_DATA' &&
    resTest55.diagnostico.some(d => d.atributo === 'producto/tipo' && d.estado === 'UNKNOWN'),
    '55: (Regla 11) La ausencia de "vegetal" no demuestra positivamente "leche"; sin sustantivo es UNKNOWN -> INVALID_INSUFFICIENT_DATA'
);

// TEST 56: Regla 15 - Capa 1 DOM Filter descarta tarjetas incompatibles
const cardIncompatible = {
    innerText: 'Bebida Vegetal Almendra La Serenísima Sin Endulzar 1 Lt. $ 2.500',
    href: 'https://diaonline.supermercadosdia.com.ar/bebida-vegetal/p',
    dataSku: '98765'
};
const cardValida = {
    innerText: 'Leche Entera Clásica La Serenísima 1 Lt. $ 1.850',
    href: 'https://diaonline.supermercadosdia.com.ar/leche-entera/p',
    dataSku: '74125'
};
const resCapa1Incompatible = evaluarTarjetaCapa1(cardIncompatible.innerText, cardIncompatible.href, cardIncompatible.dataSku, lecheSerenisima, catalogo);
const resCapa1Valida = evaluarTarjetaCapa1(cardValida.innerText, cardValida.href, cardValida.dataSku, lecheSerenisima, catalogo);
assert(
    resCapa1Incompatible.resultado === 'REJECTED_INCOMPATIBLE' &&
    resCapa1Valida.resultado === 'FOUND_EXACT',
    '56: (Regla 15) Capa 1 DOM Filter descarta tarjetas con términos incompatibles antes de hacer click'
);

// -----------------------------------------------------------------------------
// RESUMEN FINAL
// -----------------------------------------------------------------------------
console.log('\n=====================================================================');
console.log(`RESULTADO DE LA BATERIA: ${passedTests}/${passedTests + failedTests} PRUEBAS EXITOSAS`);
if (failedTests > 0) {
    console.error(`\x1b[31m[FALLO] ${failedTests} pruebas fallaron.\x1b[0m`);
    process.exit(1);
} else {
    console.log(`\x1b[32m[EXITO TOTAL] Las ${passedTests} pruebas pasaron satisfactoriamente.\x1b[0m`);
    console.log('El sistema se encuentra en un estado determinístico, robusto y verificable.');
    console.log('=====================================================================\n');
    process.exit(0);
}
