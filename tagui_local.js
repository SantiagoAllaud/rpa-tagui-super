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
    if (!str || str === 'N/D') return 'N/D';
    var all = String(str).match(/\$\s*[\d\.\,]+/g);
    var target = all ? all[all.length - 1] : str;
    var clean = String(target).replace(/[\r\n\t]+/g, ' ').trim();
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
    if (!str || str === 'N/D') return 0.0;
    var all = String(str).match(/\$?\s*([\d\.\,]+)/g);
    if (!all || all.length === 0) return 0.0;
    var target = all[all.length - 1];
    var m = target.match(/([\d\.\,]+)/);
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

// 6. LÓGICA DE STOCK ESTRICTA (DISPONIBLE / AGOTADO / NO_VERIFICADO)
function determinarStock(hayBotonActivo, hayBotonDeshabilitado, hayTextoAgotado) {
    if (hayTextoAgotado || hayBotonDeshabilitado) return 'AGOTADO';
    if (hayBotonActivo) return 'DISPONIBLE';
    return 'NO_VERIFICADO';
}

// 7. LÓGICA DE PROMOCIONES VINCULADAS
function determinarPromocion(promoTexto) {
    if (!promoTexto) return 'Sin promocion';
    var clean = cleanCsv(promoTexto).trim();
    if (!clean || clean === 'N/D' || clean.toLowerCase() === 'sin promocion') return 'Sin promocion';
    var m = clean.match(/(?:\d+\s*x\s*\d+|\d+%\s*(?:off|en|dto)|precio\s*club|segunda\s*al\s*\d+%|lleva\s*\d+|ahorra\s*[\d\.\,]+|\bpromo\b)/i);
    if (m) return clean;
    if (clean.length > 2 && clean.length < 50) return clean;
    return 'Sin promocion';
}

// 8. CREACIÓN DE RESULTADO EXITOSO (DETERMINÍSTICO)
function crearResultadoExitoso(supermercado, nombre, precio, url, stock, promocion, solicitud, esEquiv) {
    var pNum = parsePrice(precio);
    var pClean = cleanPrice(precio);
    var isEquiv = (esEquiv === false || esEquiv === 'NO') ? 'NO' : 'SI';
    return {
        supermercado: supermercado || 'N/D',
        estado: (pNum > 0) ? 'OK' : 'ERROR_PRECIO',
        nombre: nombre || (solicitud ? (solicitud.producto + ' ' + solicitud.marca) : 'Producto'),
        precio: pClean,
        precioNumerico: pNum,
        url: url || '',
        marca: solicitud ? solicitud.marca : 'N/D',
        cantidad: solicitud ? String(solicitud.cantidad) : '',
        unidad: solicitud ? solicitud.unidad : '',
        presentacion: solicitud ? solicitud.presentacion : '',
        stock: stock || 'NO_VERIFICADO',
        promocion: promocion || 'Sin promocion',
        esEquivalente: (pNum > 0 && isEquiv === 'SI') ? 'SI' : 'NO',
        motivo: (pNum > 0) ? 'Identidad verificada exitosamente' : 'Precio no detectado'
    };
}

// 9. CREACIÓN DE RESULTADO DE ERROR O FALLO
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
        stock: 'NO_VERIFICADO',
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

// 10. POLÍTICA OBLIGATORIA DE ATRIBUTOS AUSENTES Y CONTRADICCIONES (REGLAS 1-16)
function normalizarTexto(s) {
    if (!s && s !== 0) return '';
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function validarIdentidadPDP(productoCatalogo, datosPDP, catalogoCompleto) {
    if (!productoCatalogo || !datosPDP) {
        return {
            resultado: 'INVALID_INSUFFICIENT_DATA',
            esEquivalente: 'NO',
            valido: false,
            motivo: 'Datos de catalogo o ficha PDP no proporcionados',
            diagnostico: []
        };
    }

    var diagnostico = [];
    var title = datosPDP.titulo || '';
    var tNorm = normalizarTexto(title);
    var pTextNorm = normalizarTexto(title + ' ' + (datosPDP.cuerpo || '') + ' ' + (datosPDP.specs || '') + ' ' + (datosPDP.texto || ''));

    // Catálogo completo para comprobaciones de ambigüedad
    var catalogoRef = Array.isArray(catalogoCompleto) ? catalogoCompleto : [];

    // Metadatos de identidad del producto solicitado
    var ident = productoCatalogo.atributos_identidad || {};
    var tipoReq = normalizarTexto(ident.tipo || productoCatalogo.producto || '');
    var varianteReq = normalizarTexto(ident.variante || '');
    var incompatibles = Array.isArray(ident.incompatibles) ? ident.incompatibles : [];
    if (typeof productoCatalogo.atributos_incompatibles === 'string' && productoCatalogo.atributos_incompatibles.length > 0) {
        incompatibles = productoCatalogo.atributos_incompatibles.split('|');
    }

    // -------------------------------------------------------------------------
    // ATRIBUTO 1: MARCA (Obligatorio - Regla 4)
    // -------------------------------------------------------------------------
    var mReqNorm = normalizarTexto(productoCatalogo.marca || '');
    var marcaEval = {
        atributo: 'marca',
        estado: 'UNKNOWN',
        esperado: productoCatalogo.marca || '',
        detectado: null,
        motivo: ''
    };

    var marcaSinGuion = mReqNorm.replace(/[-_]/g, ' ');
    if (mReqNorm && (tNorm.indexOf(mReqNorm) !== -1 || tNorm.indexOf(marcaSinGuion) !== -1 || pTextNorm.indexOf(mReqNorm) !== -1)) {
        marcaEval.estado = 'MATCH';
        marcaEval.detectado = productoCatalogo.marca;
        marcaEval.motivo = 'Marca coincide positivamente en la ficha';
    } else if (title && title.trim().length > 0) {
        // La ficha tiene título explícito pero no contiene la marca requerida
        marcaEval.estado = 'MISMATCH';
        marcaEval.detectado = 'No coincide';
        marcaEval.motivo = 'El titulo de la ficha ("' + title + '") NO contiene la marca requerida ("' + productoCatalogo.marca + '")';
    } else {
        marcaEval.estado = 'UNKNOWN';
        marcaEval.detectado = null;
        marcaEval.motivo = 'Marca no visible en la ficha';
    }
    diagnostico.push(marcaEval);

    // -------------------------------------------------------------------------
    // ATRIBUTO 2: PRODUCTO / TIPO (Obligatorio - Regla 4, Regla 11, Regla 16)
    // -------------------------------------------------------------------------
    var pReqNorm = normalizarTexto(productoCatalogo.producto || '');
    var tipoEval = {
        atributo: 'producto/tipo',
        estado: 'UNKNOWN',
        esperado: productoCatalogo.producto || '',
        detectado: null,
        motivo: ''
    };

    // A. Comprobar términos explícitamente INCOMPATIBLES (Regla 2, Regla 16)
    var incompatibleDetectado = null;
    for (var i = 0; i < incompatibles.length; i++) {
        var incNorm = normalizarTexto(incompatibles[i]);
        if (!incNorm) continue;
        var incRegex = new RegExp('(?:^|[\\s.,;-_/])' + incNorm.replace(/[\s-]+/g, '[\\s-]+') + '(?:$|[\\s.,;-_/])', 'i');
        if (incRegex.test(tNorm) || incRegex.test(pTextNorm)) {
            incompatibleDetectado = incompatibles[i];
            break;
        }
    }

    if (incompatibleDetectado) {
        tipoEval.estado = 'MISMATCH';
        tipoEval.detectado = incompatibleDetectado;
        tipoEval.motivo = 'Contiene termino incompatible con el producto solicitado: "' + incompatibleDetectado + '"';
    } else {
        // B. Comprobar evidencia positiva del sustantivo de producto (Regla 11: no inferir desde ausencia)
        var prodKeywords = {
            'leche': ['leche', 'leches'],
            'yerba': ['yerba'],
            'aceite': ['aceite'],
            'fideos': ['fideo', 'fideos', 'spaghetti', 'tallarines', 'tirabuzon', 'mostachol', 'pasta', 'fusilli', 'penne'],
            'arroz': ['arroz'],
            'azucar': ['azucar'],
            'harina': ['harina'],
            'galletitas': ['galletita', 'galletitas', 'galleta', 'galletas', 'oreo', 'chocolinas', 'pepitos', 'sonrisas'],
            'gaseosa': ['gaseosa', 'gaseosas', 'coca-cola', 'coca cola', 'sprite']
        };

        var kws = prodKeywords[pReqNorm] || [pReqNorm];
        var matchPositivo = false;
        for (var k = 0; k < kws.length; k++) {
            var kwNorm = normalizarTexto(kws[k]);
            var kwRegex = new RegExp('(?:^|[\\s.,;-_/])' + kwNorm.replace(/[\s-]+/g, '[\\s-]+') + '(?:$|[\\s.,;-_/])', 'i');
            if (kwRegex.test(tNorm) || kwRegex.test(pTextNorm)) {
                matchPositivo = true;
                break;
            }
        }

        if (matchPositivo) {
            tipoEval.estado = 'MATCH';
            tipoEval.detectado = productoCatalogo.producto;
            tipoEval.motivo = 'Tipo de producto verificado positivamente';
        } else {
            // Verificar si hay conflicto con otro tipo conocido
            var tiposConflicto = ['bebida vegetal', 'jugo', 'te', 'cafe', 'agua', 'postre', 'yogur', 'cereal'];
            var conflictoEncontrado = null;
            for (var tc = 0; tc < tiposConflicto.length; tc++) {
                if (tNorm.indexOf(tiposConflicto[tc]) !== -1) {
                    conflictoEncontrado = tiposConflicto[tc];
                    break;
                }
            }
            if (conflictoEncontrado) {
                tipoEval.estado = 'MISMATCH';
                tipoEval.detectado = conflictoEncontrado;
                tipoEval.motivo = 'La ficha corresponde a "' + conflictoEncontrado + '" y no al producto "' + productoCatalogo.producto + '"';
            } else {
                tipoEval.estado = 'UNKNOWN';
                tipoEval.detectado = null;
                tipoEval.motivo = 'No se encontro evidencia positiva del tipo de producto "' + productoCatalogo.producto + '" en la ficha';
            }
        }
    }
    diagnostico.push(tipoEval);

    // -------------------------------------------------------------------------
    // ATRIBUTOS 3 Y 4: CANTIDAD Y UNIDAD (Obligatorios - Regla 4, Regla 10)
    // -------------------------------------------------------------------------
    var cReqNorm = parseFloat(String(productoCatalogo.cantidad || '').replace(',', '.'));
    var uReqNorm = normalizarUnidad(productoCatalogo.unidad || '');

    var cantEval = {
        atributo: 'cantidad',
        estado: 'UNKNOWN',
        esperado: productoCatalogo.cantidad,
        detectado: null,
        motivo: ''
    };

    var unidadEval = {
        atributo: 'unidad',
        estado: 'UNKNOWN',
        esperado: uReqNorm,
        detectado: null,
        motivo: ''
    };

    var regexPres = /\b(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?|g|gr|grs|gramos?|ml|cc|cm3|l|lt|lts|litros?)\b/i;
    var matchPres = tNorm.match(regexPres);
    if (!matchPres && pTextNorm) {
        matchPres = pTextNorm.match(regexPres);
    }

    var detectedCant = null;
    var detectedUnit = null;

    if (matchPres) {
        detectedCant = parseFloat(matchPres[1].replace(',', '.'));
        detectedUnit = normalizarUnidad(matchPres[2]);
    }

    if (detectedCant !== null) {
        cantEval.detectado = detectedCant;
        var cantCoincide = Math.abs(detectedCant - cReqNorm) < 0.001;
        var justif = productoCatalogo.justificacion_equivalencia || '';

        if (cantCoincide) {
            cantEval.estado = 'MATCH';
            cantEval.motivo = 'Cantidad ' + detectedCant + ' coincide con catalogo';
        } else if (justif && justif.trim().length > 0) {
            cantEval.estado = 'MATCH';
            cantEval.motivo = 'Equivalencia de presentacion justificada en catalogo: ' + justif;
        } else {
            cantEval.estado = 'MISMATCH';
            cantEval.motivo = 'Cantidad detectada (' + detectedCant + ') no coincide con requerida (' + cReqNorm + ') y no hay equivalencia justificada';
        }
    } else {
        // Búsqueda de presentación compacta directa (ej. "117g", "1l")
        var presCompact = normalizarTexto(String(productoCatalogo.cantidad || '')) + (uReqNorm ? uReqNorm.toLowerCase() : '');
        if (presCompact && tNorm.indexOf(presCompact) !== -1) {
            cantEval.estado = 'MATCH';
            cantEval.detectado = productoCatalogo.cantidad;
            cantEval.motivo = 'Presentacion compacta coincide en titulo';
        } else {
            cantEval.estado = 'UNKNOWN';
            cantEval.motivo = 'Cantidad no detectable en la ficha';
        }
    }

    if (detectedUnit !== null) {
        unidadEval.detectado = detectedUnit;
        if (detectedUnit === uReqNorm) {
            unidadEval.estado = 'MATCH';
            unidadEval.motivo = 'Unidad ' + detectedUnit + ' coincide con catalogo';
        } else {
            unidadEval.estado = 'MISMATCH';
            unidadEval.motivo = 'Unidad detectada (' + detectedUnit + ') no coincide con catalogo (' + uReqNorm + ')';
        }
    } else if (cantEval.estado === 'MATCH') {
        unidadEval.estado = 'MATCH';
        unidadEval.detectado = uReqNorm;
        unidadEval.motivo = 'Unidad identificada a partir de presentacion compacta';
    } else {
        unidadEval.estado = 'UNKNOWN';
        unidadEval.motivo = 'Unidad no detectable en la ficha';
    }

    diagnostico.push(cantEval);
    diagnostico.push(unidadEval);

    // -------------------------------------------------------------------------
    // ATRIBUTO 5: VARIANTE / LINEA (Adicional - Reglas 5, 6, 7)
    // -------------------------------------------------------------------------
    var varianteEval = null;
    if (varianteReq) {
        varianteEval = {
            atributo: 'variante',
            estado: 'UNKNOWN',
            esperado: varianteReq,
            detectado: null,
            motivo: '',
            generaAmbiguedad: false
        };

        // Si la ficha contiene tokens incompatibles para la variante
        if (incompatibleDetectado) {
            varianteEval.estado = 'MISMATCH';
            varianteEval.detectado = incompatibleDetectado;
            varianteEval.motivo = 'Variante incompatible: ' + incompatibleDetectado;
        } else {
            var varTokens = varianteReq.split(/\s+/).filter(function(w){ return w.length > 2; });
            var varMatch = varTokens.length > 0 && varTokens.some(function(vt) { return tNorm.indexOf(vt) !== -1; });
            if (varMatch) {
                varianteEval.estado = 'MATCH';
                varianteEval.detectado = varianteReq;
                varianteEval.motivo = 'Variante coincide positivamente en la ficha';
            } else {
                varianteEval.estado = 'UNKNOWN';
                varianteEval.motivo = 'Variante no especificada explicitamente en la ficha';

                // Regla 7: Comprobar si la ausencia de variante genera ambigüedad contra el catálogo
                if (catalogoRef.length > 0) {
                    var competidores = catalogoRef.filter(function(item) {
                        if (!item.activo || item.id_producto === productoCatalogo.id_producto) return false;
                        var bComp = normalizarTexto(item.marca);
                        var cComp = parseFloat(String(item.cantidad || '').replace(',', '.'));
                        var uComp = normalizarUnidad(item.unidad || '');
                        return bComp === mReqNorm && Math.abs(cComp - cReqNorm) < 0.001 && uComp === uReqNorm;
                    });
                    if (competidores.length > 0) {
                        varianteEval.generaAmbiguedad = true;
                        varianteEval.motivo = 'Variante desconocida y existen ' + competidores.length + ' producto(s) competidor(es) en catalogo para ' + productoCatalogo.marca + ' ' + productoCatalogo.presentacion;
                    }
                }
            }
        }
        diagnostico.push(varianteEval);
    }

    // -------------------------------------------------------------------------
    // ATRIBUTO 6: SKU (Adicional - Regla 8)
    // -------------------------------------------------------------------------
    var catalogSku = null;
    var sm = datosPDP.supermercado || '';
    if (productoCatalogo.supermercados && sm && productoCatalogo.supermercados[sm]) {
        catalogSku = productoCatalogo.supermercados[sm].sku;
    } else if (sm === 'Carrefour' && productoCatalogo.carrefour_sku) {
        catalogSku = productoCatalogo.carrefour_sku;
    } else if (sm === 'COTO' && productoCatalogo.coto_sku) {
        catalogSku = productoCatalogo.coto_sku;
    } else if ((sm === 'Dia' || sm === 'Día %') && productoCatalogo.dia_sku) {
        catalogSku = productoCatalogo.dia_sku;
    }

    var pdpSku = datosPDP.sku || null;
    if (catalogSku && catalogSku !== 'N/D' && pdpSku && pdpSku !== 'N/D') {
        var skuMatch = normalizarTexto(pdpSku) === normalizarTexto(catalogSku);
        diagnostico.push({
            atributo: 'sku',
            estado: skuMatch ? 'MATCH' : 'MISMATCH',
            esperado: catalogSku,
            detectado: pdpSku,
            motivo: skuMatch ? 'SKU coincide exactamente' : 'SKU en PDP (' + pdpSku + ') contradice catalogo (' + catalogSku + ')'
        });
    } else {
        diagnostico.push({
            atributo: 'sku',
            estado: 'UNKNOWN',
            esperado: catalogSku || 'N/D',
            detectado: pdpSku || 'No expuesto',
            motivo: 'SKU no expuesto o no disponible'
        });
    }

    // -------------------------------------------------------------------------
    // ATRIBUTO 7: EAN (Adicional - Regla 9)
    // -------------------------------------------------------------------------
    var catalogEan = productoCatalogo.ean || null;
    var pdpEan = datosPDP.ean || null;
    if (catalogEan && catalogEan !== 'N/D' && pdpEan && pdpEan !== 'N/D') {
        var eanMatch = normalizarTexto(pdpEan) === normalizarTexto(catalogEan);
        diagnostico.push({
            atributo: 'ean',
            estado: eanMatch ? 'MATCH' : 'MISMATCH',
            esperado: catalogEan,
            detectado: pdpEan,
            motivo: eanMatch ? 'EAN coincide exactamente' : 'EAN en PDP (' + pdpEan + ') contradice catalogo (' + catalogEan + ')'
        });
    } else {
        diagnostico.push({
            atributo: 'ean',
            estado: 'UNKNOWN',
            esperado: catalogEan || 'N/D',
            detectado: pdpEan || 'No expuesto',
            motivo: 'EAN no expuesto o no disponible'
        });
    }

    // =========================================================================
    // RESOLUCIÓN DETERMINÍSTICA DE LA IDENTIDAD (REGLAS 12, 4, 7, 14)
    // =========================================================================

    // REGLA 12: CONTRADICCIÓN TIENE PRIORIDAD ABSOLUTA
    for (var m = 0; m < diagnostico.length; m++) {
        if (diagnostico[m].estado === 'MISMATCH') {
            return {
                resultado: 'INVALID_MISMATCH',
                esEquivalente: 'NO',
                valido: false,
                motivo: 'MISMATCH en atributo "' + diagnostico[m].atributo + '": ' + diagnostico[m].motivo,
                diagnostico: diagnostico
            };
        }
    }

    // REGLA 4: ATRIBUTOS OBLIGATORIOS (producto/tipo, marca, cantidad, unidad)
    var mandatoryAttrs = ['marca', 'producto/tipo', 'cantidad', 'unidad'];
    for (var man = 0; man < diagnostico.length; man++) {
        var itemMan = diagnostico[man];
        if (mandatoryAttrs.indexOf(itemMan.atributo) !== -1 && itemMan.estado === 'UNKNOWN') {
            return {
                resultado: 'INVALID_INSUFFICIENT_DATA',
                esEquivalente: 'NO',
                valido: false,
                motivo: 'Falta atributo obligatorio: ' + itemMan.atributo + ' (' + itemMan.motivo + ')',
                diagnostico: diagnostico
            };
        }
    }

    // REGLA 7: UNKNOWN NO ADMISIBLE EN CASO DE AMBIGÜEDAD
    for (var a = 0; a < diagnostico.length; a++) {
        if (diagnostico[a].estado === 'UNKNOWN' && diagnostico[a].generaAmbiguedad === true) {
            return {
                resultado: 'INVALID_AMBIGUOUS',
                esEquivalente: 'NO',
                valido: false,
                motivo: 'Ambiguedad: atributo desconocido "' + diagnostico[a].atributo + '" no permite distinguir entre productos competidores del catalogo',
                diagnostico: diagnostico
            };
        }
    }

    // REGLA 14: CONDICIONES DE VALID_EXACT
    return {
        resultado: 'VALID_EXACT',
        esEquivalente: 'SI',
        valido: true,
        motivo: 'Identidad comercial verificada exitosamente (VALID_EXACT)',
        diagnostico: diagnostico
    };
}

// 11. EVALUACIÓN DE TARJETAS EN CAPA 1 (DOM SEARCH)
function evaluarTarjetaCapa1(tarjetaTexto, href, dataSku, productoCatalogo, catalogoCompleto) {
    var tNorm = normalizarTexto(tarjetaTexto);
    var hNorm = normalizarTexto(href);
    var sNorm = normalizarTexto(dataSku);

    var ident = (productoCatalogo && productoCatalogo.atributos_identidad) || {};
    var incompatibles = Array.isArray(ident.incompatibles) ? ident.incompatibles : [];
    if (typeof productoCatalogo.atributos_incompatibles === 'string' && productoCatalogo.atributos_incompatibles.length > 0) {
        incompatibles = productoCatalogo.atributos_incompatibles.split('|');
    }

    // Descarte inmediato si la tarjeta contiene algún término incompatible
    for (var i = 0; i < incompatibles.length; i++) {
        var incNorm = normalizarTexto(incompatibles[i]);
        if (!incNorm) continue;
        var incRegex = new RegExp('(?:^|[\\s.,;-_/])' + incNorm.replace(/[\s-]+/g, '[\\s-]+') + '(?:$|[\\s.,;-_/])', 'i');
        if (incRegex.test(tNorm)) {
            return { resultado: 'REJECTED_INCOMPATIBLE', incompatible: incompatibles[i] };
        }
    }

    var mReqNorm = normalizarTexto(productoCatalogo.marca || '');
    var pReqNorm = normalizarTexto(productoCatalogo.producto || '');
    var cReqNorm = parseFloat(String(productoCatalogo.cantidad || '').replace(',', '.'));
    var uReqNorm = normalizarUnidad(productoCatalogo.unidad || '');

    // Verificar marca
    if (!mReqNorm || tNorm.indexOf(mReqNorm) === -1) {
        return { resultado: 'REJECTED_MARCA' };
    }

    // Verificar tipo/producto positivo
    var prodKeywords = {
        'leche': ['leche', 'leches'],
        'yerba': ['yerba'],
        'aceite': ['aceite'],
        'fideos': ['fideo', 'fideos', 'spaghetti', 'tallarines', 'tirabuzon', 'mostachol', 'pasta', 'fusilli', 'penne'],
        'arroz': ['arroz'],
        'azucar': ['azucar'],
        'harina': ['harina'],
        'galletitas': ['galletita', 'galletitas', 'galleta', 'galletas', 'oreo', 'chocolinas', 'pepitos', 'sonrisas'],
        'gaseosa': ['gaseosa', 'gaseosas', 'coca-cola', 'coca cola', 'sprite']
    };
    var kws = prodKeywords[pReqNorm] || [pReqNorm];
    var matchProd = kws.some(function(k) { return tNorm.indexOf(normalizarTexto(k)) !== -1; });
    if (!matchProd) {
        return { resultado: 'REJECTED_PRODUCTO' };
    }

    // Verificar presentación
    var regexPres = /\b(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?|g|gr|grs|gramos?|ml|cc|cm3|l|lt|lts|litros?)\b/i;
    var matchPres = tNorm.match(regexPres);
    var coincidePres = false;

    if (matchPres) {
        var cardCant = parseFloat(matchPres[1].replace(',', '.'));
        var cardUnit = normalizarUnidad(matchPres[2]);
        if (Math.abs(cardCant - cReqNorm) < 0.001 && (!cardUnit || cardUnit === uReqNorm)) {
            coincidePres = true;
        } else if (productoCatalogo.justificacion_equivalencia && productoCatalogo.justificacion_equivalencia.trim().length > 0) {
            coincidePres = true;
        }
    } else {
        var presCompact = normalizarTexto(String(productoCatalogo.cantidad || '')) + (uReqNorm ? uReqNorm.toLowerCase() : '');
        if (tNorm.indexOf(presCompact) !== -1) coincidePres = true;
    }

    if (!coincidePres) {
        return { resultado: 'REJECTED_PRESENTACION' };
    }

    return { resultado: 'FOUND_EXACT' };
}

// ==============================================================================
// 15. MANEJO OBLIGATORIO DE COOKIES, ANUNCIOS, MODALES Y OBSTÁCULOS
// ==============================================================================
function detectarObstaculosDOM(supermercado, documentRef) {
    var doc = documentRef || (typeof document !== 'undefined' ? document : null);
    if (!doc) return { obstaculoDetectado: false, buscadorDisponible: false };

    function norm(s) {
        return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    }

    // 1. Detección de banners de cookies inequívocos
    var cookieSelectors = [
        '#onetrust-accept-btn-handler',
        'button#onetrust-accept-btn-handler',
        '#onetrust-reject-all-handler',
        'button[class*="cookie-consent"]',
        'button[id*="cookie-accept"]',
        'a[class*="cookie-accept"]'
    ];

    for (var i = 0; i < cookieSelectors.length; i++) {
        var btn = doc.querySelector(cookieSelectors[i]);
        if (btn && (btn.offsetParent !== null || btn.offsetWidth > 0)) {
            btn.setAttribute('id', 'tagui_obstaculo_btn');
            try { btn.style.outline = '3px solid #ff5252'; } catch(e){}
            return {
                obstaculoDetectado: true,
                tipo: 'COOKIES',
                descripcion: 'Banner de consentimiento / OneTrust (' + cookieSelectors[i] + ')'
            };
        }
    }

    // 2. Detección de modales visibles y popups bloqueantes (newsletter, ubicación, etc.)
    var closeSelectors = [
        'button[aria-label="Cerrar"]',
        'button[aria-label="cerrar"]',
        'button[aria-label="Close"]',
        'button[aria-label="close"]',
        '.vtex-modal__close-button',
        '.vtex-modal-layout-0-x-closeButton',
        'button.close',
        'button[data-dismiss="modal"]',
        'div[class*="modal"] button[class*="close"]',
        'div[class*="popup"] button[class*="close"]',
        'div[class*="newsletter"] button[class*="close"]',
        'button[class*="cio-modal-close"]'
    ];

    for (var j = 0; j < closeSelectors.length; j++) {
        var closeBtn = doc.querySelector(closeSelectors[j]);
        if (closeBtn && (closeBtn.offsetParent !== null || closeBtn.offsetWidth > 0)) {
            closeBtn.setAttribute('id', 'tagui_obstaculo_btn');
            try { closeBtn.style.outline = '3px solid #ff5252'; } catch(e){}
            return {
                obstaculoDetectado: true,
                tipo: 'MODAL_BLOQUEANTE',
                descripcion: 'Modal/Popup con boton de cierre (' + closeSelectors[j] + ')'
            };
        }
    }

    // 3. Botones explícitos de aceptación o descarte en modales/avisos
    var allButtons = doc.querySelectorAll('button, a[role="button"], input[type="button"]');
    var textosAceptar = ['aceptar todas', 'aceptar cookies', 'estoy de acuerdo', 'entendido', 'continuar', 'ahora no', 'no gracias'];
    for (var k = 0; k < allButtons.length; k++) {
        var b = allButtons[k];
        var txt = norm(b.innerText || b.value || b.getAttribute('aria-label') || '');
        if (!txt) continue;
        for (var m = 0; m < textosAceptar.length; m++) {
            if (txt === textosAceptar[m] && (b.offsetParent !== null || b.offsetWidth > 0)) {
                var parent = b.closest ? b.closest('[class*="modal"], [class*="popup"], [class*="banner"], [class*="cookie"], [id*="cookie"], [class*="consent"]') : null;
                if (parent || txt === 'aceptar todas' || txt === 'aceptar cookies') {
                    b.setAttribute('id', 'tagui_obstaculo_btn');
                    try { b.style.outline = '3px solid #ff5252'; } catch(e){}
                    return {
                        obstaculoDetectado: true,
                        tipo: 'BANNER_CONSENTIMIENTO',
                        descripcion: 'Boton de aceptacion/cierre "' + txt + '"'
                    };
                }
            }
        }
    }

    // 4. Verificación de selección de sucursal obligatoria sin cierre
    var sucursalObligatoria = doc.querySelector('[class*="postal-code"][class*="required"], [class*="sucursal-modal"][class*="mandatory"]');
    if (sucursalObligatoria && (sucursalObligatoria.offsetParent !== null || sucursalObligatoria.offsetWidth > 0)) {
        return {
            obstaculoDetectado: false,
            estado: 'REQUIERE_CONFIGURACION_DE_SUCURSAL',
            motivo: 'El sitio requiere seleccionar sucursal obligatoriamente y no se define en el entorno'
        };
    }

    // 5. Verificación de disponibilidad del buscador
    var searchSels = [
        'input[placeholder*="buscar" i]',
        'input[placeholder*="Buscar" i]',
        'input[type="search"]',
        'input[class*="cio-input"]',
        'input[id*="cio-autocomplete"]',
        'input[placeholder*="comprar" i]'
    ];
    var buscadorEncontrado = false;
    for (var s = 0; s < searchSels.length; s++) {
        var inp = doc.querySelector(searchSels[s]);
        if (inp && (inp.offsetParent !== null || inp.offsetWidth > 0)) {
            buscadorEncontrado = true;
            break;
        }
    }

    return {
        obstaculoDetectado: false,
        buscadorDisponible: buscadorEncontrado,
        estado: 'SITIO_LISTO'
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
        normalizarTexto: normalizarTexto,
        parsePrice: parsePrice,
        crearResultadoExitoso: crearResultadoExitoso,
        crearResultadoError: crearResultadoError,
        determinarStock: determinarStock,
        determinarPromocion: determinarPromocion,
        compararYOrdenar: compararYOrdenar,
        validarIdentidadPDP: validarIdentidadPDP,
        evaluarTarjetaCapa1: evaluarTarjetaCapa1,
        detectarObstaculosDOM: detectarObstaculosDOM
    };
}


