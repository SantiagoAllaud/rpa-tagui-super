/**
 * validar_input.js - Validador Estricto de Productos contra Catálogo Local
 * UTN FRCU - Tecnologías para la Automatización
 * 
 * Uso: node validar_input.js [archivo_input.csv]
 */

const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2] || path.join(__dirname, 'input.csv');
const catalogFile = path.join(__dirname, 'catalogo', 'productos.json');
const outputTaguiFile = path.join(__dirname, 'input_tagui.csv');

// Eliminar preventivamente cualquier input_tagui.csv anterior para que nunca quede un archivo parcial o desactualizado
if (fs.existsSync(outputTaguiFile)) {
    try {
        fs.unlinkSync(outputTaguiFile);
    } catch (e) {}
}

function quitarAcentos(str) {
    return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function normalizarUnidad(u) {
    const raw = quitarAcentos(u);
    if (['g', 'gr', 'grs', 'gramo', 'gramos'].includes(raw)) return 'g';
    if (['kg', 'kgs', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].includes(raw)) return 'kg';
    if (['ml', 'mls', 'mililitro', 'mililitros'].includes(raw)) return 'ml';
    if (['l', 'lt', 'lts', 'litro', 'litros'].includes(raw)) return 'l';
    return raw;
}

function parseCantidad(c) {
    const str = String(c || '').trim().replace(',', '.');
    const val = parseFloat(str);
    return isNaN(val) ? null : val;
}

// 1. Validar existencia de archivos
if (!fs.existsSync(catalogFile)) {
    console.error('\x1b[31m[ERROR] No se encontro el archivo del catalogo: ' + catalogFile + '\x1b[0m');
    process.exit(1);
}

if (!fs.existsSync(inputFile)) {
    console.error('\x1b[31m[ERROR] No se encontro el archivo de entrada: ' + inputFile + '\x1b[0m');
    process.exit(1);
}

// 2. Cargar catálogo
let catalogo = [];
try {
    catalogo = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
} catch (err) {
    console.error('\x1b[31m[ERROR] Error al parsear catalogo/productos.json: ' + err.message + '\x1b[0m');
    process.exit(1);
}

// 3. Leer y parsear input.csv
const rawInput = fs.readFileSync(inputFile, 'utf8');
const lines = rawInput.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

if (lines.length < 2) {
    console.error('\x1b[31m[ERROR] El archivo input.csv esta vacio o solo contiene cabecera.\x1b[0m');
    console.error('Formato requerido:');
    console.error('producto,marca,cantidad,unidad');
    console.error('Galletitas,Oreo,117,g');
    process.exit(1);
}

const headerLine = lines[0].toLowerCase();
const headers = headerLine.split(',').map(h => h.trim().replace(/^"/, '').replace(/"$/, ''));

const idxProducto = headers.indexOf('producto');
const idxMarca = headers.indexOf('marca');
const idxCantidad = headers.indexOf('cantidad');
const idxUnidad = headers.indexOf('unidad');

if (idxProducto === -1 || idxMarca === -1 || idxCantidad === -1 || idxUnidad === -1) {
    console.error('\x1b[31m[ERROR] Cabecera invalida en input.csv.\x1b[0m');
    console.error('Cabecera recibida: ' + lines[0]);
    console.error('Cabecera requerida: producto,marca,cantidad,unidad');
    process.exit(1);
}

console.log('=====================================================================');
console.log('       VALIDACION DE PRODUCTOS CONTRA EL CATALOGO LOCAL');
console.log('=====================================================================');

let hasError = false;
const productosValidados = [];

for (let i = 1; i < lines.length; i++) {
    const rowRaw = lines[i];
    // Regex para parsear CSV respetando comillas
    const cols = rowRaw.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"/, '').replace(/"$/, ''));

    const rawProd = cols[idxProducto] || '';
    const rawMarca = cols[idxMarca] || '';
    const rawCant = cols[idxCantidad] || '';
    const rawUnidad = cols[idxUnidad] || '';

    // Validar que no haya campos vacíos
    if (!rawProd || !rawMarca || !rawCant || !rawUnidad) {
        console.error(`\x1b[31m[ERROR] Fila ${i}: Faltan campos obligatorios.`);
        console.error(`        Recibido -> Producto: "${rawProd}" | Marca: "${rawMarca}" | Cantidad: "${rawCant}" | Unidad: "${rawUnidad}"`);
        console.error(`        ¡Debe especificar Producto, Marca, Cantidad y Unidad obligatoriamente!\x1b[0m`);
        hasError = true;
        continue;
    }

    const normProd = quitarAcentos(rawProd);
    const normMarca = quitarAcentos(rawMarca);
    const numCant = parseCantidad(rawCant);
    const normUnidad = normalizarUnidad(rawUnidad);

    if (numCant === null) {
        console.error(`\x1b[31m[ERROR] Fila ${i}: Cantidad no numerica invalida: "${rawCant}"\x1b[0m`);
        hasError = true;
        continue;
    }

    // Buscar coincidencia EXACTA en el catálogo
    const coincidencia = catalogo.find(item => {
        if (!item.activo) return false;
        const cProd = quitarAcentos(item.producto);
        const cMarca = quitarAcentos(item.marca);
        const cUnidad = normalizarUnidad(item.unidad);
        const cCant = parseCantidad(item.cantidad);

        return (cProd === normProd || quitarAcentos(item.categoria) === normProd) &&
               cMarca === normMarca &&
               cUnidad === normUnidad &&
               Math.abs(cCant - numCant) < 0.001;
    });

    if (!coincidencia) {
        hasError = true;
        console.error(`\x1b[31m[ERROR] Fila ${i}: PRODUCTO NO REGISTRADO EN EL CATALOGO:`);
        console.error(`        Solicitado -> Producto: "${rawProd}" | Marca: "${rawMarca}" | Cantidad: "${rawCant}" | Unidad: "${rawUnidad}"\x1b[0m`);

        // Diagnóstico inteligente y sugerencia de alternativas válidas del catálogo
        const coincidenciasProdMarca = catalogo.filter(item => {
            if (!item.activo) return false;
            const cProd = quitarAcentos(item.producto);
            const cMarca = quitarAcentos(item.marca);
            return (cProd === normProd || quitarAcentos(item.categoria) === normProd) && cMarca === normMarca;
        });

        if (coincidenciasProdMarca.length > 0) {
            console.log(`\x1b[33m        -> Presentaciones validas para "${rawProd} ${rawMarca}":\x1b[0m`);
            coincidenciasProdMarca.forEach(alt => {
                console.log(`           * ${alt.producto} | ${alt.marca} | ${alt.cantidad} | ${alt.unidad}  (ID: ${alt.id_producto})`);
            });
        } else {
            const coincidenciasProd = catalogo.filter(item => {
                if (!item.activo) return false;
                const cProd = quitarAcentos(item.producto);
                return (cProd === normProd || quitarAcentos(item.categoria) === normProd);
            });

            if (coincidenciasProd.length > 0) {
                console.log(`\x1b[33m        -> Marcas y presentaciones disponibles para "${rawProd}":\x1b[0m`);
                coincidenciasProd.forEach(alt => {
                    console.log(`           * ${alt.producto} | ${alt.marca} | ${alt.cantidad} | ${alt.unidad}  (ID: ${alt.id_producto})`);
                });
            } else {
                const categoriasUnicas = [...new Set(catalogo.filter(p => p.activo).map(p => p.producto))];
                console.log(`\x1b[33m        -> Productos/Categorias validas disponibles en catalogo:\x1b[0m`);
                console.log(`           [ ${categoriasUnicas.join(', ')} ]`);
                console.log(`           Consulte catalogo/productos.json para ver todas las opciones.`);
            }
        }
        console.log('');
    } else {
        const carrefourRef = coincidencia.supermercados && coincidencia.supermercados.Carrefour;
        const cotoRef = coincidencia.supermercados && coincidencia.supermercados.COTO;
        const diaRef = coincidencia.supermercados && coincidencia.supermercados.Dia;

        console.log(`\x1b[32m[OK] Producto validado: ${coincidencia.producto} ${coincidencia.marca} ${coincidencia.presentacion} (ID: ${coincidencia.id_producto})\x1b[0m`);
        console.log(`     Disponibilidad en catalogo -> Carrefour: ${carrefourRef ? 'Si' : 'No'} | COTO: ${cotoRef ? 'Si' : 'No'} | Dia %: ${diaRef ? 'Si' : 'No'}`);

        const justifEq = coincidencia.justificacion_equivalencia || '';
        const ident = coincidencia.atributos_identidad || {};
        const atrTipo = ident.tipo || coincidencia.producto || '';
        const atrVar = ident.variante || '';
        const atrInc = Array.isArray(ident.incompatibles) ? ident.incompatibles.join('|') : '';

        productosValidados.push({
            id_producto: coincidencia.id_producto,
            producto: coincidencia.producto,
            marca: coincidencia.marca,
            cantidad: coincidencia.cantidad,
            unidad: coincidencia.unidad,
            presentacion: coincidencia.presentacion,
            carrefour_query: carrefourRef ? (carrefourRef.termino_busqueda || coincidencia.producto + ' ' + coincidencia.marca) : 'N/D',
            carrefour_url: carrefourRef ? (carrefourRef.url || '') : '',
            carrefour_sku: carrefourRef ? (carrefourRef.sku || 'N/D') : 'N/D',
            coto_query: cotoRef ? (cotoRef.termino_busqueda || coincidencia.producto + ' ' + coincidencia.marca) : 'N/D',
            coto_url: cotoRef ? (cotoRef.url || '') : '',
            coto_sku: cotoRef ? (cotoRef.sku || 'N/D') : 'N/D',
            dia_query: diaRef ? (diaRef.termino_busqueda || coincidencia.producto + ' ' + coincidencia.marca) : 'N/D',
            dia_url: diaRef ? (diaRef.url || '') : '',
            dia_sku: diaRef ? (diaRef.sku || 'N/D') : 'N/D',
            ean: coincidencia.ean || 'N/D',
            justificacion_equivalencia: justifEq,
            atributos_tipo: atrTipo,
            atributos_variante: atrVar,
            atributos_incompatibles: atrInc
        });
    }
}

if (hasError) {
    console.log('=====================================================================');
    console.error('\x1b[31m[ABORTADO] La validacion contra el catalogo fallo.');
    console.error('Existe al menos una fila invalida. No se genero input_tagui.csv.');
    console.error('El robot RPA NO se iniciara hasta que todos los productos sean validos.\x1b[0m');
    console.log('=====================================================================');
    process.exit(1);
}

// 4. Generar archivo de trabajo input_tagui.csv (solo si TODAS las filas son válidas)
const taguiHeader = 'id_producto,producto,marca,cantidad,unidad,presentacion,carrefour_query,carrefour_url,carrefour_sku,coto_query,coto_url,coto_sku,dia_query,dia_url,dia_sku,ean,justificacion_equivalencia,atributos_tipo,atributos_variante,atributos_incompatibles';
const taguiRows = productosValidados.map(p => {
    return [
        `"${p.id_producto}"`,
        `"${p.producto}"`,
        `"${p.marca}"`,
        `"${p.cantidad}"`,
        `"${p.unidad}"`,
        `"${p.presentacion}"`,
        `"${p.carrefour_query}"`,
        `"${p.carrefour_url}"`,
        `"${p.carrefour_sku}"`,
        `"${p.coto_query}"`,
        `"${p.coto_url}"`,
        `"${p.coto_sku}"`,
        `"${p.dia_query}"`,
        `"${p.dia_url}"`,
        `"${p.dia_sku}"`,
        `"${p.ean}"`,
        `"${p.justificacion_equivalencia}"`,
        `"${p.atributos_tipo}"`,
        `"${p.atributos_variante}"`,
        `"${p.atributos_incompatibles}"`
    ].join(',');
});

fs.writeFileSync(outputTaguiFile, [taguiHeader, ...taguiRows].join('\r\n'), 'utf8');

console.log('=====================================================================');
console.log(`\x1b[32m[EXITO] Todos los productos fueron validados correctamente (${productosValidados.length} item/s).\x1b[0m`);
console.log('Archivo input_tagui.csv generado con exito con referencias resueltas.');
console.log('Iniciando automatizacion RPA TagUI...');
console.log('=====================================================================');
process.exit(0);
