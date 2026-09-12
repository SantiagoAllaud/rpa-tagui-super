// ==============================================================================
// tagui_local.js - Helpers y Lógica de Negocio Avanzada para RPA de Supermercados
// UTN FRCU - Tecnologías para la Automatización
// Compatible con motor ES5 de TagUI (PhantomJS / CasperJS)
// ==============================================================================

// Categorías comerciales comunes en Argentina para separación léxica dinámica
var CATEGORIAS_COMUNES = [
    'yerba mate', 'dulce de leche', 'pure de tomate',
    'leche', 'arroz', 'fideos', 'aceite', 'galletitas', 'galletas',
    'yerba', 'harina', 'azucar', 'gaseosa', 'agua', 'jabon',
    'shampoo', 'pan', 'queso', 'yogur', 'manteca', 'cafe',
    'te', 'atun', 'mayonesa', 'pure', 'tomate', 'cerveza', 'vino',
    'alfajor', 'alfajores'
];

// Modificadores especiales a penalizar en búsquedas genéricas
var MODIFICADORES_ESPECIALES = [
    'infantil', 'bebe', 'maternizada', 'formula',
    'protein', 'proteina', 'saborizada', 'chocolate',
    'frutilla', 'vainilla', 'polvo', 'condensada', 'evaporada',
    'alfajor', 'alfajores'
];

// Umbral de confianza mínimo para considerar un producto equivalente (OK)
var UMBRAL_CONFIANZA = 35;

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

// 6. PARSEO GENERALIZADO DE LA SOLICITUD (SIN LISTAS HARDCODEADAS)
function parseSolicitud(s) {
    var raw = String(s || '').trim();
    var match = raw.match(/\b(\d+(?:[.,]\d+)?)\s*(litros?|lts?|lt|l|kilos?|kilogramos?|kgs?|kg|gramos?|grs?|gr|g|mililitros?|mls?|ml)\b/i);
    var cantidad = null;
    var unidad = null;
    var presentacion = 'Cualquiera';
    var textSinPres = raw;

    if (match) {
        cantidad = parseFloat(match[1].replace(',', '.'));
        unidad = normalizarUnidad(match[2]);
        presentacion = cantidad + unidad;
        textSinPres = (raw.substring(0, match.index) + ' ' + raw.substring(match.index + match[0].length)).trim();
        textSinPres = textSinPres.replace(/\s{2,}/g, ' ');
    }

    var lower = textSinPres.toLowerCase();
    var catEncontrada = null;

    for (var i = 0; i < CATEGORIAS_COMUNES.length; i++) {
        var cat = CATEGORIAS_COMUNES[i];
        if (lower === cat || lower.indexOf(cat + ' ') === 0) {
            catEncontrada = cat;
            break;
        }
    }

    var producto = textSinPres;
    var marca = 'cualquiera';

    if (catEncontrada) {
        producto = catEncontrada;
        var resto = textSinPres.substring(catEncontrada.length).trim();
        if (resto.length > 0) {
            marca = resto;
        }
    } else {
        producto = textSinPres;
        marca = textSinPres;
    }

    return {
        raw: raw,
        producto: producto,
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
    var marcaBuscada = tieneMarca ? solicitud.marca.toLowerCase() : null;

    var mejorCandidato = null;
    var mejorPuntaje = -999;
    var huboCoincidenciaNombre = false;
    var huboCoincidenciaMarca = false;
    var huboCoincidenciaPresentacion = false;

    var analisisLogs = [];
    analisisLogs.push('------------------------------------------------------------');
    analisisLogs.push('ANALISIS DE CANDIDATOS (' + candidatos.length + ' detectados)');
    analisisLogs.push('------------------------------------------------------------');

    for (var i = 0; i < candidatos.length; i++) {
        var c = candidatos[i];
        var nombre = String(c.nombre || '');
        var desc = String(c.descripcion || '');
        var marcaCand = String(c.marca || '');
        var fullText = (nombre + ' ' + desc + ' ' + marcaCand).toLowerCase();
        var pres = extraerPresentacion(fullText);
        var puntaje = 0;
        var descCandidato = 'Candidato ' + (i + 1) + '/' + candidatos.length + ': "' + nombre + '" (' + (c.precio || 'N/D') + ')';

        // 1. Coincidencia de tokens del producto
        var matches = 0;
        for (var k = 0; k < tokensSolicitud.length; k++) {
            if (fullText.indexOf(tokensSolicitud[k]) !== -1) matches++;
        }
        if (matches === 0) {
            analisisLogs.push(descCandidato + ' -> DESCARTADO (categoria divergente: no contiene ' + solicitud.producto + ')');
            continue;
        }
        huboCoincidenciaNombre = true;
        puntaje += (matches * 20);
        var detalleMotivos = ['coincide categoria'];

        // 2. Coincidencia de marca si fue especificada
        if (tieneMarca) {
            if (fullText.indexOf(marcaBuscada) !== -1 || marcaCand.toLowerCase().indexOf(marcaBuscada) !== -1) {
                puntaje += 40;
                huboCoincidenciaMarca = true;
                detalleMotivos.push('marca coincidente (' + solicitud.marca + ')');
            } else {
                puntaje -= 80;
                detalleMotivos.push('marca divergente (esperada: ' + solicitud.marca + ')');
            }
        }

        // 3. Coincidencia de presentación
        var esEq = sonPresentacionesEquivalentes(solicitud, pres);
        if (solicitud.cantidad && solicitud.unidad) {
            if (esEq) {
                puntaje += 40;
                huboCoincidenciaPresentacion = true;
                detalleMotivos.push('presentacion compatible (' + pres.presentacion + ')');
            } else {
                puntaje -= 90;
                detalleMotivos.push('presentacion divergente (' + (pres.presentacion || 'N/D') + ' vs ' + solicitud.presentacion + ')');
            }
        }

        // 4. Penalización por modificadores especiales no solicitados
        var tieneModEspecial = false;
        for (var m = 0; m < MODIFICADORES_ESPECIALES.length; m++) {
            var mod = MODIFICADORES_ESPECIALES[m];
            if (fullText.indexOf(mod) !== -1 && solicitud.raw.toLowerCase().indexOf(mod) === -1) {
                tieneModEspecial = true;
                break;
            }
        }
        if (tieneModEspecial) {
            puntaje -= 50;
            detalleMotivos.push('variante especial no solicitada');
        }

        var veredicto = (puntaje >= UMBRAL_CONFIANZA && esEq && (!tieneMarca || huboCoincidenciaMarca)) ? 'VALIDO' : 'DESCARTADO';
        analisisLogs.push(descCandidato + ' -> ' + veredicto + ' [Puntaje: ' + puntaje + ' | ' + detalleMotivos.join(', ') + ']');

        if (puntaje > mejorPuntaje) {
            mejorPuntaje = puntaje;
            mejorCandidato = {
                nombre: nombre,
                precio: c.precio,
                precioNumerico: parsePrice(c.precio),
                url: c.url || '',
                marca: c.marca || (tieneMarca ? solicitud.marca : 'Generica'),
                cantidad: pres.cantidad ? String(pres.cantidad) : '',
                unidad: pres.unidad || '',
                presentacion: pres.presentacion,
                esEquivalente: (esEq && (!tieneMarca || huboCoincidenciaMarca)) ? 'SI' : 'NO',
                puntaje: puntaje
            };
        }
    }

    if (!mejorCandidato || !huboCoincidenciaNombre) {
        var resNoNom = {
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
            motivo: 'No se encontraron productos coincidentes con ' + solicitud.producto,
            analisisLogs: analisisLogs,
            analisisTexto: analisisLogs.join('\n')
        };
        return resNoNom;
    }

    if (tieneMarca && !huboCoincidenciaMarca) {
        var resNoMarca = {
            estado: 'MARCA_NO_ENCONTRADA',
            nombre: mejorCandidato.nombre,
            precio: mejorCandidato.precio,
            precioNumerico: mejorCandidato.precioNumerico,
            url: mejorCandidato.url,
            marca: mejorCandidato.marca,
            cantidad: mejorCandidato.cantidad,
            unidad: mejorCandidato.unidad,
            presentacion: mejorCandidato.presentacion,
            esEquivalente: 'NO',
            motivo: 'Marca solicitada (' + solicitud.marca + ') no encontrada',
            analisisLogs: analisisLogs,
            analisisTexto: analisisLogs.join('\n')
        };
        return resNoMarca;
    }

    if (solicitud.cantidad && solicitud.unidad && !huboCoincidenciaPresentacion) {
        var resNoPres = {
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
            motivo: 'Presentacion solicitada (' + solicitud.presentacion + ') no encontrada. Mejor visto: ' + mejorCandidato.presentacion,
            analisisLogs: analisisLogs,
            analisisTexto: analisisLogs.join('\n')
        };
        return resNoPres;
    }

    if (mejorPuntaje < UMBRAL_CONFIANZA) {
        var resNoEq = {
            estado: 'NO_EQUIVALENTE',
            nombre: mejorCandidato.nombre,
            precio: mejorCandidato.precio,
            precioNumerico: mejorCandidato.precioNumerico,
            url: mejorCandidato.url,
            marca: mejorCandidato.marca,
            cantidad: mejorCandidato.cantidad,
            unidad: mejorCandidato.unidad,
            presentacion: mejorCandidato.presentacion,
            esEquivalente: 'NO',
            motivo: 'El puntaje de compatibilidad (' + mejorPuntaje + ') no alcanzo el umbral requerido (' + UMBRAL_CONFIANZA + ')',
            analisisLogs: analisisLogs,
            analisisTexto: analisisLogs.join('\n')
        };
        return resNoEq;
    }

    analisisLogs.push('------------------------------------------------------------');
    analisisLogs.push('-> SELECCIONADO: "' + mejorCandidato.nombre + '" (' + mejorCandidato.precio + ')');
    analisisLogs.push('------------------------------------------------------------');

    mejorCandidato.estado = 'OK';
    mejorCandidato.esEquivalente = 'SI';
    mejorCandidato.analisisLogs = analisisLogs;
    mejorCandidato.analisisTexto = analisisLogs.join('\n');
    return mejorCandidato;
}

// 10. COMPARACIÓN FINAL, ORDENAMIENTO POR PRECIO Y REPORTE
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

    var lines = [];
    lines.push('');
    lines.push('==================================================');
    lines.push('PRODUCTO SOLICITADO: ' + solicitud.raw.toUpperCase());
    lines.push('==================================================');
    lines.push('');

    for (var j = 0; j < resultados.length; j++) {
        var res = resultados[j];
        lines.push(res.supermercado.toUpperCase());
        if (res.estado === 'OK') {
            lines.push('Producto: ' + res.nombre);
            lines.push('Marca: ' + (res.marca || 'N/D'));
            lines.push('Presentacion: ' + (res.presentacion || 'N/D'));
            lines.push('Precio: ' + res.precio);
            lines.push('Estado: OK');
        } else {
            lines.push('Estado: ' + res.estado);
            lines.push('Motivo: ' + (res.motivo || 'No equivalente'));
        }
        lines.push('');
    }

    lines.push('--------------------------------------------------');
    lines.push('COMPARACION');
    lines.push('--------------------------------------------------');
    lines.push('');

    if (validos.length > 0) {
        for (var k = 0; k < validos.length; k++) {
            var v = validos[k];
            var pos = (k + 1) + '°';
            var sName = (v.supermercado + '          ').substring(0, 12);
            lines.push(pos + ' ' + sName + ' ' + v.precio);
        }
        lines.push('');
        lines.push('MAS BARATO:');
        lines.push(validos[0].supermercado + ' -> ' + validos[0].precio);
        lines.push('');

        if (validos.length > 1) {
            var masCaro = validos[validos.length - 1];
            var masBarato = validos[0];
            var diff = Math.round((masCaro.precioNumerico - masBarato.precioNumerico) * 100) / 100;
            lines.push('DIFERENCIA CONTRA EL MAS CARO:');
            lines.push('$' + diff);
        }
    } else {
        lines.push('No se encontraron productos equivalentes en ningun supermercado.');
    }

    lines.push('==================================================');
    lines.push('');

    var textOut = lines.join('\n');
    console.log(textOut);
    return {
        validos: validos,
        masBarato: validos.length > 0 ? validos[0] : null,
        reporteTexto: textOut
    };
}

// 11. CREACIÓN DE RESULTADO DE ERROR O FALLO
function crearResultadoError(supermercado, estado, motivo, solicitud) {
    return {
        supermercado: supermercado || 'N/D',
        estado: estado || 'ERROR_NAVEGACION',
        nombre: 'No encontrado (' + (estado || 'ERROR') + ')',
        precio: 'N/D',
        precioNumerico: 0.0,
        url: '',
        marca: (solicitud && solicitud.marca && solicitud.marca !== 'cualquiera') ? solicitud.marca : 'N/D',
        cantidad: (solicitud && solicitud.cantidad) ? String(solicitud.cantidad) : '',
        unidad: (solicitud && solicitud.unidad) ? solicitud.unidad : '',
        presentacion: (solicitud && solicitud.presentacion) ? solicitud.presentacion : 'N/D',
        esEquivalente: 'NO',
        motivo: motivo || estado || 'Fallo durante la navegacion o extraccion'
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CATEGORIAS_COMUNES: CATEGORIAS_COMUNES,
        MODIFICADORES_ESPECIALES: MODIFICADORES_ESPECIALES,
        UMBRAL_CONFIANZA: UMBRAL_CONFIANZA,
        getFechaActual: getFechaActual,
        cleanCsv: cleanCsv,
        cleanPrice: cleanPrice,
        formatUrl: formatUrl,
        encodeSearchTerm: encodeSearchTerm,
        normalizarUnidad: normalizarUnidad,
        parsePrice: parsePrice,
        parseSolicitud: parseSolicitud,
        extraerPresentacion: extraerPresentacion,
        toBaseUnit: toBaseUnit,
        sonPresentacionesEquivalentes: sonPresentacionesEquivalentes,
        seleccionarProductoCorrecto: seleccionarProductoCorrecto,
        compararYOrdenar: compararYOrdenar,
        crearResultadoError: crearResultadoError
    };
}
