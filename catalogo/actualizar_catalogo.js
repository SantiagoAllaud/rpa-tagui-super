/**
 * actualizar_catalogo.js - Administrador y Actualizador del Catálogo Local
 * UTN FRCU - Tecnologías para la Automatización
 * 
 * Uso:
 *   node catalogo/actualizar_catalogo.js listar
 *   node catalogo/actualizar_catalogo.js verificar
 */

const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, 'productos.json');

function cargarCatalogo() {
    if (!fs.existsSync(catalogPath)) {
        console.error('[ERROR] No se encuentra el archivo: ' + catalogPath);
        process.exit(1);
    }
    try {
        return JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    } catch (e) {
        console.error('[ERROR] Error al leer el JSON: ' + e.message);
        process.exit(1);
    }
}

function guardarCatalogo(data) {
    fs.writeFileSync(catalogPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('[OK] Catalogo guardado exitosamente.');
}

const comando = (process.argv[2] || 'listar').toLowerCase();

const catalogo = cargarCatalogo();

if (comando === 'listar') {
    console.log('=====================================================================');
    console.log(`        CATALOGO DE PRODUCTOS NORMALIZADOS (${catalogo.length} ITEMS)`);
    console.log('=====================================================================');
    catalogo.forEach((p, idx) => {
        const carrefour = p.supermercados && p.supermercados.Carrefour ? '✓' : '✗';
        const coto = p.supermercados && p.supermercados.COTO ? '✓' : '✗';
        const dia = p.supermercados && p.supermercados.Dia ? '✓' : '✗';
        console.log(`[${idx + 1}] ID: ${p.id_producto.padEnd(24)} | ${p.producto.padEnd(12)} | Marca: ${p.marca.padEnd(14)} | ${p.presentacion.padEnd(6)} | Carrefour: ${carrefour} | COTO: ${coto} | Dia: ${dia}`);
    });
    console.log('=====================================================================');
} else if (comando === 'verificar') {
    console.log('Verificando consistencia del catalogo...');
    let errores = 0;
    const ids = new Set();
    catalogo.forEach((p, i) => {
        if (!p.id_producto) {
            console.error(`Error item ${i}: falta id_producto`);
            errores++;
        } else if (ids.has(p.id_producto)) {
            console.error(`Error item ${i}: id_producto duplicado -> ${p.id_producto}`);
            errores++;
        } else {
            ids.add(p.id_producto);
        }
        if (!p.producto || !p.marca || !p.cantidad || !p.unidad) {
            console.error(`Error item ${p.id_producto}: faltan atributos basicos (producto, marca, cantidad o unidad)`);
            errores++;
        }
    });
    if (errores === 0) {
        console.log(`[OK] El catalogo es 100% consistente. (${catalogo.length} productos verificados).`);
    } else {
        console.error(`[ERROR] Se encontraron ${errores} errores en el catalogo.`);
    }
} else {
    console.log('Comando no reconocido. Uso: node catalogo/actualizar_catalogo.js [listar | verificar]');
}
