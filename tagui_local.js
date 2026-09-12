// ==============================================================================
// tagui_local.js - Helpers y Lógica de Negocio para RPA de Supermercados
// UTN FRCU - Tecnologías para la Automatización
// Compatible con motor ES5 de TagUI (PhantomJS / CasperJS / Node.js)
// ==============================================================================

// 1. FECHA ACTUAL LOCAL
function getFechaActual() {
    var hoy = new Date();
    var d = hoy.getDate();
    var m = hoy.getMonth() + 1;
    var a = hoy.getFullYear();
    var diaStr = (d < 10 ? '0' : '') + d;
    var mesStr = (m < 10 ? '0' : '') + m;
    return diaStr + '/' + mesStr + '/' + a;
}

// 2. SANITIZACIÓN CSV
function cleanCsv(str) {
    if (!str && str !== 0) return 'N/D';
    var clean = String(str).replace(/"/g, '""').replace(/[\r\n\t]+/g, ' ').trim();
    clean = clean.replace(/\s{2,}/g, ' ');
    return clean;
}

function cleanPrice(str) {
    if (!str) return 'N/D';
    var m = String(str).match(/\$\s*[\d\.\,]+/);
    if (m) return m[0].trim();
    var clean = String(str).replace(/[\r\n\t]+/g, ' ').trim();
    clean = clean.replace(/\s{2,}/g, ' ');
    return cleanCsv(clean);
}

// 3. NORMALIZACIÓN DE URLS
function formatUrl(baseUrl, path) {
    if (!path || path === 'none' || path.indexOf('#') === 0 || path.indexOf('javascript:') !== -1) return baseUrl;
    var cleanPath = path.split('#')[0];
    if (cleanPath.indexOf('javascript:') !== -1) return baseUrl;
    if (cleanPath.indexOf('http://') === 0 || cleanPath.indexOf('https://') === 0) return cleanPath;
    if (cleanPath.indexOf('/') === 0) return baseUrl + cleanPath;
    return baseUrl + '/' + cleanPath;
}

// Codificar término para URL
function encodeSearchTerm(term) {
    return encodeURIComponent(String(term || '').trim());
}

// 4. NORMALIZACIÓN DE UNIDADES
function normalizarUnidad(u) {
    if (!u) return null;
    var raw = String(u).toLowerCase().trim();
    if (raw === 'l' || raw === 'lt' || raw === 'lts' || raw === 'litro' || raw === 'litros') return 'L';
    if (raw === 'ml' || raw === 'mls' || raw === 'mililitros') return 'ML';
    if (raw === 'kg' || raw === 'kgs' || raw === 'kilo' || raw === 'kilos' || raw === 'kilogramo' || raw === 'kilogramos') return 'KG';
    if (raw === 'g' || raw === 'gr' || raw === 'grs' || raw === 'gramo' || raw === 'gramos') return 'G';
    return raw.toUpperCase();
}

// 5. PARSEO NUMÉRICO DE PRECIOS
function parsePrice(str) {
    if (!str) return 0.0;
    var m = String(str).match(/\$?\s*([\d\.\,]+)/);
    if (!m) return 0.0;
    var numStr = m[1].trim();
    if (numStr.indexOf('.') !== -1 && numStr.indexOf(',') !== -1) {
        numStr = numStr.replace(/\./g, '').replace(',', '.');
    } else if (numStr.indexOf(',') !== -1) {
        numStr = numStr.replace(',', '.');
    } else if (numStr.indexOf('.') !== -1) {
        var parts = numStr.split('.');
        if (parts[parts.length - 1].length === 3) {
            numStr = numStr.replace(/\./g, '');
        }
    }
    var val = parseFloat(numStr);
    return isNaN(val) ? 0.0 : val;
}

// 6. CREACIÓN DE RESULTADO EXITOSO (DETERMINÍSTICO)
function crearResultadoExitoso(supermercado, nombre, precio, url, stock, promocion, solicitud) {
    var pNum = parsePrice(precio);
    var solRaw = solicitud ? (solicitud.producto + ' ' + solicitud.marca + ' ' + solicitud.presentacion) : 'N/D';
    return {
        supermercado: supermercado || 'N/D',
        estado: (pNum > 0) ? 'OK' : 'ERROR_PRECIO',
        nombre: nombre || (solicitud ? (solicitud.producto + ' ' + solicitud.marca) : 'Producto'),
        precio: precio || 'N/D',
        precioNumerico: pNum,
        url: url || '',
        marca: solicitud ? solicitud.marca : 'N/D',
        cantidad: solicitud ? String(solicitud.cantidad) : '',
        unidad: solicitud ? solicitud.unidad : '',
        presentacion: solicitud ? solicitud.presentacion : '',
        stock: stock || 'DISPONIBLE',
        promocion: promocion || 'Sin promocion',
        esEquivalente: (pNum > 0) ? 'SI' : 'NO',
        motivo: (pNum > 0) ? 'Coincidencia exacta de catalogo' : 'Precio no detectado'
    };
}

// 7. CREACIÓN DE RESULTADO DE ERROR O FALLO
function crearResultadoError(supermercado, estado, motivo, solicitud) {
    return {
        supermercado: supermercado || 'N/D',
        estado: estado || 'ERROR_NAVEGACION',
        nombre: 'No encontrado (' + (estado || 'ERROR') + ')',
        precio: 'N/D',
        precioNumerico: 0.0,
        url: '',
        marca: solicitud ? solicitud.marca : 'N/D',
        cantidad: solicitud ? String(solicitud.cantidad) : '',
        unidad: solicitud ? solicitud.unidad : '',
        presentacion: solicitud ? solicitud.presentacion : 'N/D',
        stock: 'NO_DISPONIBLE',
        promocion: 'N/D',
        esEquivalente: 'NO',
        motivo: motivo || estado || 'Fallo durante la navegacion o extraccion'
    };
}

// 8. COMPARACIÓN FINAL, ORDENAMIENTO POR PRECIO Y REPORTE
function compararYOrdenar(resultados, solicitud) {
    var validos = [];
    var noValidos = [];

    for (var i = 0; i < resultados.length; i++) {
        var r = resultados[i];
        if (r.estado === 'OK' && r.esEquivalente === 'SI' && r.precioNumerico > 0) {
            validos.push(r);
        } else {
            noValidos.push(r);
        }
    }

    // Ordenar de menor a mayor precio
    validos.sort(function(a, b) {
        return a.precioNumerico - b.precioNumerico;
    });

    var prodDesc = solicitud ? (solicitud.producto + ' ' + solicitud.marca + ' ' + solicitud.presentacion) : 'PRODUCTO';

    var lines = [];
    lines.push('');
    lines.push('=====================================================================');
    lines.push('PRODUCTO SOLICITADO: ' + prodDesc.toUpperCase());
    if (solicitud && solicitud.id_producto) {
        lines.push('ID CATALOGO: ' + solicitud.id_producto);
    }
    lines.push('=====================================================================');
    lines.push('');

    for (var j = 0; j < resultados.length; j++) {
        var res = resultados[j];
        lines.push('[' + res.supermercado.toUpperCase() + ']');
        if (res.estado === 'OK') {
            lines.push('  Producto:    ' + res.nombre);
            lines.push('  Marca:       ' + (res.marca || 'N/D'));
            lines.push('  Presentac.:  ' + (res.presentacion || 'N/D'));
            lines.push('  Precio:      ' + res.precio);
            lines.push('  Stock:       ' + (res.stock || 'DISPONIBLE'));
            lines.push('  Promocion:   ' + (res.promocion || 'Sin promocion'));
            lines.push('  Estado:      OK');
        } else {
            lines.push('  Estado:      ' + res.estado);
            lines.push('  Motivo:      ' + (res.motivo || 'Fallo al obtener datos'));
        }
        lines.push('');
    }

    lines.push('---------------------------------------------------------------------');
    lines.push('RANKING COMPARATIVO POR MENOR PRECIO:');
    lines.push('---------------------------------------------------------------------');

    if (validos.length > 0) {
        for (var k = 0; k < validos.length; k++) {
            var v = validos[k];
            var pos = (k + 1) + '°';
            var sName = (v.supermercado + '          ').substring(0, 14);
            lines.push('  ' + pos + ' ' + sName + ' ' + v.precio + '  [Stock: ' + v.stock + ']  [Promo: ' + v.promocion + ']');
        }
        lines.push('');
        lines.push('>>> MAS BARATO: ' + validos[0].supermercado + ' (' + validos[0].precio + ') <<<');
        lines.push('');

        if (validos.length > 1) {
            var masCaro = validos[validos.length - 1];
            var masBarato = validos[0];
            var diff = Math.round((masCaro.precioNumerico - masBarato.precioNumerico) * 100) / 100;
            lines.push('DIFERENCIA CONTRA EL MAS CARO (' + masCaro.supermercado + '): $' + diff);
        }
    } else {
        lines.push('No se pudieron obtener precios validos para este producto.');
    }

    lines.push('=====================================================================');
    lines.push('');

    var textOut = lines.join('\n');
    console.log(textOut);
    return {
        validos: validos,
        masBarato: validos.length > 0 ? validos[0] : null,
        reporteTexto: textOut
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getFechaActual: getFechaActual,
        cleanCsv: cleanCsv,
        cleanPrice: cleanPrice,
        formatUrl: formatUrl,
        encodeSearchTerm: encodeSearchTerm,
        normalizarUnidad: normalizarUnidad,
        parsePrice: parsePrice,
        crearResultadoExitoso: crearResultadoExitoso,
        crearResultadoError: crearResultadoError,
        compararYOrdenar: compararYOrdenar
    };
}
