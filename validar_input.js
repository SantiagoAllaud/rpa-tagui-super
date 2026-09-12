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

    // Buscar coincidencia en el catálogo
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
        console.error(`\x1b[31m[ERROR] Fila ${i}: No existe un producto con esa combinacion en el catalogo:`);
        console.error(`        Producto: "${rawProd}" | Marca: "${rawMarca}" | Cantidad: "${rawCant}" | Unidad: "${rawUnidad}"`);
        console.error(`        ¡No se permite comparar combinaciones inexistentes ni busquedas genericas!`);
        console.error(`        Consulte el catalogo en catalogo/productos.json para ver las opciones validas.\x1b[0m`);
        hasError = true;
    } else {
        const carrefourRef = coincidencia.supermercados && coincidencia.supermercados.Carrefour;
        const cotoRef = coincidencia.supermercados && coincidencia.supermercados.COTO;
        const diaRef = coincidencia.supermercados && coincidencia.supermercados.Dia;

        console.log(`\x1b[32m[OK] Producto validado: ${coincidencia.producto} ${coincidencia.marca} ${coincidencia.presentacion} (ID: ${coincidencia.id_producto})\x1b[0m`);
        console.log(`     Disponibilidad en catalogo -> Carrefour: ${carrefourRef ? 'Si' : 'No'} | COTO: ${cotoRef ? 'Si' : 'No'} | Dia %: ${diaRef ? 'Si' : 'No'}`);

        productosValidados.push({
            id_producto: coincidencia.id_producto,
            producto: coincidencia.producto,
            marca: coincidencia.marca,
            cantidad: coincidencia.cantidad,
            unidad: coincidencia.unidad,
            presentacion: coincidencia.presentacion,
            carrefour_query: carrefourRef ? (carrefourRef.termino_busqueda || coincidencia.producto + ' ' + coincidencia.marca) : 'N/D',
            carrefour_url: carrefourRef ? (carrefourRef.url || '') : '',
            coto_query: cotoRef ? (cotoRef.termino_busqueda || coincidencia.producto + ' ' + coincidencia.marca) : 'N/D',
            coto_url: cotoRef ? (cotoRef.url || '') : '',
            dia_query: diaRef ? (diaRef.termino_busqueda || coincidencia.producto + ' ' + coincidencia.marca) : 'N/D',
            dia_url: diaRef ? (diaRef.url || '') : ''
        });
    }
}

if (hasError) {
    console.log('=====================================================================');
    console.error('\x1b[31m[ABORTADO] La validacion contra el catalogo fallo.\x1b[0m');
    console.error('El robot RPA NO se iniciara hasta que se corrijan los productos en input.csv.');
    console.log('=====================================================================');
    process.exit(1);
}

// 4. Generar archivo de trabajo input_tagui.csv
const taguiHeader = 'id_producto,producto,marca,cantidad,unidad,presentacion,carrefour_query,carrefour_url,coto_query,coto_url,dia_query,dia_url';
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
        `"${p.coto_query}"`,
        `"${p.coto_url}"`,
        `"${p.dia_query}"`,
        `"${p.dia_url}"`
    ].join(',');
});

fs.writeFileSync(outputTaguiFile, [taguiHeader, ...taguiRows].join('\r\n'), 'utf8');

console.log('=====================================================================');
console.log(`\x1b[32m[EXITO] Todos los productos fueron validados correctamente (${productosValidados.length} item/s).\x1b[0m`);
console.log('Archivo input_tagui.csv generado con exito.');
console.log('Iniciando automatizacion RPA TagUI con referencias directas...');
console.log('=====================================================================');
process.exit(0);
