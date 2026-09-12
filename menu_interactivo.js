// ==============================================================================
// menu_interactivo.js - Selección Interactiva de Productos desde la Terminal
// UTN FRCU - Tecnologías para la Automatización
// Arquitectura: TagUI + JavaScript Local + JSON/CSV (Sin frameworks externos)
// ==============================================================================

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const CATALOGO_PATH = path.join(__dirname, 'catalogo', 'productos.json');
const INPUT_CSV_PATH = path.join(__dirname, 'input.csv');
const VALIDAR_SCRIPT_PATH = path.join(__dirname, 'validar_input.js');

// 1. CARGA Y NORMALIZACIÓN DEL CATÁLOGO
function cargarCatalogo(ruta) {
    const file = ruta || CATALOGO_PATH;
    if (!fs.existsSync(file)) {
        throw new Error(`No se encontro el archivo de catalogo en: ${file}`);
    }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function quitarAcentos(str) {
    return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// 2. OBTENER PRODUCTOS ACTIVOS (TEST 31)
function obtenerProductosActivos(catalogo) {
    if (!Array.isArray(catalogo)) return [];
    return catalogo.filter(item => item && item.activo === true);
}

// 3. BÚSQUEDA Y FILTRADO DENTRO DEL CATÁLOGO (TEST 34, 35)
// Solo filtra sobre los productos existentes, NUNCA inventa productos
function filtrarCatalogo(productosActivos, query) {
    if (!Array.isArray(productosActivos)) return [];
    if (!query || !query.trim()) {
        return productosActivos.slice();
    }
    const qNorm = quitarAcentos(query);
    const tokens = qNorm.split(/\s+/).filter(Boolean);

    return productosActivos.filter(item => {
        const fullText = quitarAcentos(
            `${item.producto} ${item.marca} ${item.categoria || ''} ${item.presentacion} ${item.cantidad}${item.unidad}`
        );
        return tokens.every(token => fullText.indexOf(token) !== -1);
    });
}

// 4. FORMATEO VISUAL DEL CATÁLOGO PARA MENÚ
function formatearParaMenu(item, indiceMenu) {
    // Formato exacto requerido: Índice - Producto | Marca | Presentación
    return `${indiceMenu} - ${item.producto} | ${item.marca} | ${item.presentacion}`;
}

// 5. SELECCIÓN POR ÍNDICE (TEST 32, 33)
function seleccionarPorIndice(listaFiltrada, indice) {
    if (!Array.isArray(listaFiltrada) || listaFiltrada.length === 0) return null;
    const idx = parseInt(indice, 10);
    if (isNaN(idx) || idx < 1 || idx > listaFiltrada.length) {
        return null;
    }
    return listaFiltrada[idx - 1];
}

// 6. VALIDACIÓN ESTRICTA DEL REGISTRO (TEST 39)
// Garantiza que el registro provenga intacto del catálogo original
function validarRegistroSeleccionado(item, catalogo) {
    if (!item || typeof item !== 'object') {
        return { valido: false, error: 'Registro nulo o no proporcionado' };
    }

    // 1. Recuperar registro original del JSON
    const cat = catalogo || cargarCatalogo();
    const original = cat.find(p => p.id_producto === item.id_producto);
    if (!original) {
        return { valido: false, error: 'El producto seleccionado no existe en el catálogo original' };
    }

    // 2. Verificar activo === true
    if (original.activo !== true || item.activo !== true) {
        return { valido: false, error: 'El producto seleccionado no está activo' };
    }

    // 3. Verificar que posee: producto, marca, cantidad, unidad, presentacion
    if (!item.producto || !item.marca || !item.cantidad || !item.unidad || !item.presentacion) {
        return { valido: false, error: 'El producto carece de campos obligatorios' };
    }

    // 4. Verificar que el ID sea único en el catálogo
    const repetidos = cat.filter(p => p.id_producto === item.id_producto);
    if (repetidos.length !== 1) {
        return { valido: false, error: 'El ID de producto no es único en el catálogo' };
    }

    // 5. Verificar referencias de supermercado
    if (!item.supermercados || typeof item.supermercados !== 'object') {
        return { valido: false, error: 'El producto no posee referencias de supermercados válidas' };
    }

    // Regla de Oro: La terminal no puede modificar la identidad del producto
    if (item.producto !== original.producto ||
        item.marca !== original.marca ||
        item.cantidad !== original.cantidad ||
        item.unidad !== original.unidad ||
        item.presentacion !== original.presentacion) {
        return { valido: false, error: 'La identidad del producto ha sido alterada respecto al catálogo original' };
    }

    return { valido: true, item: original };
}

// 7. MOSTRAR RESUMEN DEL PRODUCTO SELECCIONADO
function mostrarResumenProducto(item) {
    const dispCarrefour = (item.supermercados && item.supermercados.Carrefour && item.supermercados.Carrefour.url) ? 'SI' : 'NO';
    const dispCoto = (item.supermercados && item.supermercados.COTO && item.supermercados.COTO.url) ? 'SI' : 'NO';
    const dispDia = (item.supermercados && item.supermercados.Dia && item.supermercados.Dia.url) ? 'SI' : 'NO';

    console.log('');
    console.log('============================================================');
    console.log('PRODUCTO SELECCIONADO');
    console.log('=====================');
    console.log('');
    console.log(`Producto: ${item.producto}`);
    console.log(`Marca: ${item.marca}`);
    console.log(`Cantidad: ${item.cantidad}`);
    console.log(`Unidad: ${item.unidad}`);
    console.log(`Presentación: ${item.presentacion}`);
    console.log(`ID: ${item.id_producto}`);
    console.log('');
    console.log('Disponibilidad de referencias:');
    console.log('');
    console.log(`Carrefour: ${dispCarrefour}`);
    console.log(`COTO: ${dispCoto}`);
    console.log(`Día %: ${dispDia}`);
    console.log('');
    console.log('============================================================');
    console.log('');
}

// 8. GENERACIÓN DE INPUT DE TRABAJO (TEST 36)
// Escribe el archivo input.csv con exactamente producto,marca,cantidad,unidad
function generarInputTrabajo(item, destinoPath) {
    const filePath = destinoPath || INPUT_CSV_PATH;
    const cabecera = 'producto,marca,cantidad,unidad';
    const fila = `"${item.producto}","${item.marca}","${item.cantidad}","${item.unidad}"`;
    const contenido = `${cabecera}\r\n${fila}\r\n`;
    fs.writeFileSync(filePath, contenido, 'utf8');
    return contenido;
}

// 9. PROCESAR CONFIRMACIÓN (TEST 38)
function procesarConfirmacion(respuesta) {
    const r = (respuesta || '').trim().toUpperCase();
    if (r === 'S') return 'CONFIRMADO';
    if (r === 'N') return 'CANCELADO';
    return 'INVALIDO';
}

// 10. FLUJO CLI INTERACTIVO COMPLETO
function iniciarCLI() {
    const catalogo = cargarCatalogo();
    const productosActivos = obtenerProductosActivos(catalogo);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    function promptPrincipal() {
        console.log('============================================================');
        console.log('RPA COMPARADOR DE PRECIOS - UTN FRCU');
        console.log('====================================');
        console.log('');
        console.log('1 - Elegir producto del catálogo');
        console.log('2 - Salir');
        console.log('(O ingrese "M" para ejecutar en modo manual con input.csv)');
        console.log('');

        rl.question('Seleccione una opción: ', (opcion) => {
            const opt = (opcion || '').trim().toLowerCase();
            if (opt === '1') {
                flujoBusqueda();
            } else if (opt === '2') {
                console.log('\nSaliendo del programa.');
                rl.close();
                process.exit(3);
            } else if (opt === 'm' || opt === 'manual' || opt === '3') {
                flujoManual();
            } else {
                console.log('\n\x1b[31m[ERROR] Opción no válida. Ingrese 1 o 2.\x1b[0m\n');
                promptPrincipal();
            }
        });
    }

    function flujoBusqueda() {
        console.log('');
        rl.question('Buscar producto (dejar vacío para mostrar todos): ', (query) => {
            const listaFiltrada = filtrarCatalogo(productosActivos, query);

            if (listaFiltrada.length === 0) {
                console.log(`\n\x1b[33m[INFO] No se encontraron coincidencias para "${query}".\x1b[0m`);
                console.log('Intente nuevamente con otro término.\n');
                return flujoBusqueda();
            }

            console.log('\n============================================================');
            console.log(`PRODUCTOS DISPONIBLES EN EL CATÁLOGO (${listaFiltrada.length}):`);
            console.log('============================================================');
            listaFiltrada.forEach((item, idx) => {
                console.log(formatearParaMenu(item, idx + 1));
            });
            console.log('');

            flujoSeleccion(listaFiltrada);
        });
    }

    function flujoSeleccion(listaFiltrada) {
        rl.question(`Seleccione producto (1-${listaFiltrada.length}) o 'V' para volver: `, (indiceStr) => {
            const val = (indiceStr || '').trim();
            if (val.toLowerCase() === 'v') {
                return promptPrincipal();
            }

            const item = seleccionarPorIndice(listaFiltrada, val);
            if (!item) {
                console.log(`\n\x1b[31m[ERROR] Índice no válido. Ingrese un número entre 1 y ${listaFiltrada.length}.\x1b[0m\n`);
                return flujoSeleccion(listaFiltrada);
            }

            const validacion = validarRegistroSeleccionado(item, catalogo);
            if (!validacion.valido) {
                console.log(`\n\x1b[31m[ERROR] El producto seleccionado no es válido en el catálogo: ${validacion.error}\x1b[0m\n`);
                rl.close();
                process.exit(1);
            }

            mostrarResumenProducto(item);
            flujoConfirmacion(item);
        });
    }

    function flujoConfirmacion(item) {
        rl.question('¿Ejecutar RPA con este producto? [S/N]: ', (resp) => {
            const conf = procesarConfirmacion(resp);
            if (conf === 'INVALIDO') {
                console.log('\x1b[33mPor favor, ingrese S (Sí) o N (No).\x1b[0m');
                return flujoConfirmacion(item);
            }

            if (conf === 'CANCELADO') {
                console.log('\n[INFO] Ejecución cancelada por el usuario. No se inició TagUI.');
                rl.close();
                process.exit(2);
            }

            // Confirmado: Generar input de trabajo y ejecutar validar_input.js
            console.log('\n[OK] Generando entrada de trabajo a partir del producto seleccionado...');
            generarInputTrabajo(item, INPUT_CSV_PATH);

            try {
                console.log('Validando con mecanismo estándar (validar_input.js)...');
                execSync(`node "${VALIDAR_SCRIPT_PATH}" "${INPUT_CSV_PATH}"`, { stdio: 'inherit' });
                console.log('\n\x1b[32m[LISTO] Producto validado y listo para ejecución de TagUI.\x1b[0m');
                rl.close();
                process.exit(0);
            } catch (err) {
                console.error('\n\x1b[31m[ERROR] La validación con validar_input.js ha fallado.\x1b[0m');
                rl.close();
                process.exit(1);
            }
        });
    }

    function flujoManual() {
        console.log('\n[MODO MANUAL] Utilizando archivo input.csv existente...');
        if (!fs.existsSync(INPUT_CSV_PATH)) {
            console.error('\x1b[31m[ERROR] No se encontró el archivo input.csv.\x1b[0m\n');
            return promptPrincipal();
        }
        try {
            execSync(`node "${VALIDAR_SCRIPT_PATH}" "${INPUT_CSV_PATH}"`, { stdio: 'inherit' });
            rl.close();
            process.exit(0);
        } catch (err) {
            console.error('\n\x1b[31m[ERROR] La validación de input.csv ha fallado.\x1b[0m\n');
            rl.close();
            process.exit(1);
        }
    }

    promptPrincipal();
}

// Exportación para pruebas unitarias y ejecución CLI directa
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        cargarCatalogo,
        obtenerProductosActivos,
        filtrarCatalogo,
        formatearParaMenu,
        seleccionarPorIndice,
        validarRegistroSeleccionado,
        mostrarResumenProducto,
        generarInputTrabajo,
        procesarConfirmacion
    };
}

if (require.main === module) {
    iniciarCLI();
}
