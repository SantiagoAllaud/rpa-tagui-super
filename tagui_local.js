// ==============================================================================
// tagui_local.js - Helpers y Lógica de Negocio para RPA de Supermercados
// UTN FRCU - Tecnologías para la Automatización
// Compatible con motor ES5 de TagUI (PhantomJS / CasperJS)
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
    var clean = String(str).replace(/[\r\n\t]+/g, ' ').trim();
    clean = clean.replace(/\s{2,}/g, ' ');
    return cleanCsv(clean);
}

// 3. NORMALIZACIÓN DE URLS
function formatUrl(baseUrl, path) {
    if (!path || path === 'none' || path.indexOf('#') === 0) return baseUrl;
    if (path.indexOf('http://') === 0 || path.indexOf('https://') === 0) return path;
    if (path.indexOf('/') === 0) return baseUrl + path;
    return baseUrl + '/' + path;
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

// 6. PARSEO DE LA SOLICITUD (PRODUCTO, CANTIDAD, UNIDAD, MARCA)
function parseSolicitud(s) {
    var raw = String(s || '').trim();
    var match = raw.match(/\b(\d+(?:[.,]\d+)?)\s*(litros?|lts?|lt|l|kilos?|kilogramos?|kgs?|kg|gramos?|grs?|gr|g|mililitros?|mls?|ml)\b/i);
    var cantidad = null;
    var unidad = null;
    var presentacion = 'Cualquiera';
    var prodTerm = raw;

    if (match) {
        cantidad = parseFloat(match[1].replace(',', '.'));
        unidad = normalizarUnidad(match[2]);
        presentacion = cantidad + unidad;
        prodTerm = (raw.substring(0, match.index) + ' ' + raw.substring(match.index + match[0].length)).trim();
        prodTerm = prodTerm.replace(/\s{2,}/g, ' ');
    }

    var brandRegex = /\b(oreo|la serenisima|sancor|coto|carrefour|dia|knorr|marolio|natura|arcor|terrabusi|toddy|chocolinas|quilmes|coca cola|pepsi)\b/i;
    var bMatch = prodTerm.match(brandRegex);
    var marca = 'cualquiera';
    if (bMatch) {
        marca = bMatch[1];
    }

    return {
        raw: raw,
        producto: prodTerm,
        cantidad: cantidad,
        unidad: unidad,
        marca: marca,
        presentacion: presentacion
    };
}

// 7. EXTRACCIÓN DE PRESENTACIÓN DESDE TEXTO DEL PRODUCTO
function extraerPresentacion(texto) {
    if (!texto) return { cantidad: null, unidad: null, presentacion: 'N/D' };
    var match = String(texto).match(/\b(\d+(?:[.,]\d+)?)\s*(litros?|lts?|lt|l|kilos?|kilogramos?|kgs?|kg|gramos?|grs?|gr|g|mililitros?|mls?|ml)\b/i);
    if (!match) return { cantidad: null, unidad: null, presentacion: 'N/D' };
    var cant = parseFloat(match[1].replace(',', '.'));
    var un = normalizarUnidad(match[2]);
    return {
        cantidad: cant,
        unidad: un,
        presentacion: cant + un
    };
}

// 8. CONVERSIÓN A UNIDAD BASE (ML O G) PARA COMPARACIÓN EQUIVALENTE
function toBaseUnit(cant, un) {
    if (!cant || !un) return null;
    if (un === 'L') return { val: cant * 1000, type: 'vol' };
    if (un === 'ML') return { val: cant, type: 'vol' };
    if (un === 'KG') return { val: cant * 1000, type: 'weight' };
    if (un === 'G') return { val: cant, type: 'weight' };
    return null;
}

function sonPresentacionesEquivalentes(solicitud, candPres) {
    if (!solicitud || !solicitud.cantidad || !solicitud.unidad) {
        return true;
    }
    if (!candPres || !candPres.cantidad || !candPres.unidad) {
        return false;
    }
    var solBase = toBaseUnit(solicitud.cantidad, solicitud.unidad);
    var candBase = toBaseUnit(candPres.cantidad, candPres.unidad);
    if (!solBase || !candBase || solBase.type !== candBase.type) {
        return false;
    }
    return Math.abs(solBase.val - candBase.val) < 1.0;
}

// 9. SELECCIÓN INTELIGENTE DEL PRODUCTO CORRECTO ENTRE CANDIDATOS
function seleccionarProductoCorrecto(candidatos, solicitud) {
    if (!candidatos || candidatos.length === 0) {
        return {
            estado: 'PRODUCTO_NO_ENCONTRADO',
            nombre: 'No encontrado',
            precio: 'N/D',
            precioNumerico: 0.0,
            url: '',
            marca: 'N/D',
            cantidad: '',
            unidad: '',
            presentacion: 'N/D',
            esEquivalente: 'NO',
            motivo: 'Lista de resultados vacia'
        };
    }

    var tokensSolicitud = solicitud.producto.toLowerCase().split(/\s+/).filter(function(t) { return t.length > 2; });
    var tieneMarca = solicitud.marca && solicitud.marca.toLowerCase() !== 'cualquiera';

    var mejorCandidato = null;
    var mejorPuntaje = -999;
    var huboCoincidenciaNombre = false;
    var huboCoincidenciaMarca = false;

    for (var i = 0; i < candidatos.length; i++) {
        var c = candidatos[i];
        var text = (c.nombre + ' ' + (c.descripcion || '')).toLowerCase();
        var pres = extraerPresentacion(text);
        var puntaje = 0;

        // 1. Coincidencia del término del producto
        var matches = 0;
        for (var k = 0; k < tokensSolicitud.length; k++) {
            if (text.indexOf(tokensSolicitud[k]) !== -1) matches++;
        }
        if (matches === 0) {
            continue;
        }
        huboCoincidenciaNombre = true;
        puntaje += (matches * 10);

        // 2. Coincidencia de marca si fue solicitada
        if (tieneMarca) {
            if (text.indexOf(solicitud.marca.toLowerCase()) !== -1) {
                puntaje += 30;
                huboCoincidenciaMarca = true;
            } else {
                puntaje -= 50;
            }
        }

        // 3. Coincidencia de presentación
        var esEq = sonPresentacionesEquivalentes(solicitud, pres);
        if (solicitud.cantidad && solicitud.unidad) {
            if (esEq) {
                puntaje += 40;
            } else {
                puntaje -= 100;
            }
        }

        if (puntaje > mejorPuntaje) {
            mejorPuntaje = puntaje;
            mejorCandidato = {
                nombre: c.nombre,
                precio: c.precio,
                precioNumerico: parsePrice(c.precio),
                url: c.url || '',
                marca: tieneMarca ? solicitud.marca : (c.marca || 'Generica'),
                cantidad: pres.cantidad ? String(pres.cantidad) : '',
                unidad: pres.unidad || '',
                presentacion: pres.presentacion,
                esEquivalente: esEq ? 'SI' : 'NO',
                puntaje: puntaje
            };
        }
    }

    if (!mejorCandidato || !huboCoincidenciaNombre) {
        return {
            estado: 'PRODUCTO_NO_ENCONTRADO',
            nombre: 'No encontrado',
            precio: 'N/D',
            precioNumerico: 0.0,
            url: '',
            marca: 'N/D',
            cantidad: '',
            unidad: '',
            presentacion: 'N/D',
            esEquivalente: 'NO',
            motivo: 'No se encontraron productos coincidentes con ' + solicitud.producto
        };
    }

    if (tieneMarca && !huboCoincidenciaMarca && mejorCandidato.puntaje < 0) {
        return {
            estado: 'MARCA_NO_ENCONTRADA',
            nombre: mejorCandidato.nombre,
            precio: mejorCandidato.precio,
            precioNumerico: mejorCandidato.precioNumerico,
            url: mejorCandidato.url,
            marca: 'No disponible',
            cantidad: mejorCandidato.cantidad,
            unidad: mejorCandidato.unidad,
            presentacion: mejorCandidato.presentacion,
            esEquivalente: 'NO',
            motivo: 'Marca ' + solicitud.marca + ' no encontrada entre los resultados'
        };
    }

    if (solicitud.cantidad && solicitud.unidad && mejorCandidato.esEquivalente !== 'SI') {
        return {
            estado: 'PRESENTACION_NO_ENCONTRADA',
            nombre: mejorCandidato.nombre,
            precio: mejorCandidato.precio,
            precioNumerico: mejorCandidato.precioNumerico,
            url: mejorCandidato.url,
            marca: mejorCandidato.marca,
            cantidad: mejorCandidato.cantidad,
            unidad: mejorCandidato.unidad,
            presentacion: mejorCandidato.presentacion,
            esEquivalente: 'NO',
            motivo: 'Presentacion solicitada (' + solicitud.presentacion + ') no encontrada. Se vio: ' + mejorCandidato.presentacion
        };
    }

    mejorCandidato.estado = 'OK';
    return mejorCandidato;
}

// 10. COMPARACIÓN FINAL, ORDENAMIENTO POR PRECIO Y REPORTE
function compararYOrdenar(resultados, solicitud) {
    var validos = [];
    var noValidos = [];

    for (var i = 0; i < resultados.length; i++) {
        var r = resultados[i];
        if (r.estado === 'OK' && r.precioNumerico > 0) {
            validos.push(r);
        } else {
            noValidos.push(r);
        }
    }

    // Ordenar de menor a mayor precio
    validos.sort(function(a, b) {
        return a.precioNumerico - b.precioNumerico;
    });

    var report = [];
    report.push('========================================');
    report.push('COMPARACION FINAL: ' + solicitud.raw.toUpperCase());
    report.push('========================================');

    if (validos.length > 0) {
        for (var j = 0; j < validos.length; j++) {
            var item = validos[j];
            var tag = (j === 0) ? ' <-- MAS BARATO' : (j === validos.length - 1 && validos.length > 1 ? ' (Mas caro)' : '');
            report.push((j + 1) + '. ' + item.supermercado + ' ' + item.precio + ' [' + item.nombre + ']' + tag);
        }
        report.push('');
        report.push('MAS BARATO: ' + validos[0].supermercado + ' (' + validos[0].precio + ')');
    } else {
        report.push('No se encontraron productos equivalentes en ningun supermercado.');
    }

    if (noValidos.length > 0) {
        report.push('');
        report.push('Supermercados sin coincidencia equivalente:');
        for (var k = 0; k < noValidos.length; k++) {
            var nv = noValidos[k];
            report.push('- ' + nv.supermercado + ': ' + nv.estado + ' (' + (nv.motivo || 'No equivalente') + ')');
        }
    }
    report.push('========================================');

    var textOut = report.join('\n');
    console.log(textOut);
    return {
        validos: validos,
        masBarato: validos.length > 0 ? validos[0] : null,
        reporteTexto: textOut
    };
}
