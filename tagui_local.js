// Funciones auxiliares disponibles globalmente durante la ejecución de TagUI
// Se cargan automáticamente por convención de TagUI (tagui_local.js)
// Compatible con el motor JavaScript de TagUI / PhantomJS

// Obtener fecha actual formateada en DD/MM/AAAA
function getFechaActual() {
    var hoy = new Date();
    var d = hoy.getDate();
    var m = hoy.getMonth() + 1;
    var a = hoy.getFullYear();
    var diaStr = (d < 10 ? '0' : '') + d;
    var mesStr = (m < 10 ? '0' : '') + m;
    return diaStr + '/' + mesStr + '/' + a;
}

// Limpiar y escapar cadenas de texto para evitar romper columnas CSV
function cleanCsv(str) {
    if (!str) return 'N/D';
    var clean = String(str).replace(/"/g, '""').replace(/[\r\n\t]+/g, ' ').trim();
    // Eliminar espacios múltiples consecutivos
    clean = clean.replace(/\s{2,}/g, ' ');
    return clean;
}

// Limpiar precios eliminando textos residuales
function cleanPrice(str) {
    if (!str) return 'N/D';
    var clean = String(str).replace(/[\r\n\t]+/g, ' ').trim();
    clean = clean.replace(/\s{2,}/g, ' ');
    return cleanCsv(clean);
}

// Codificar término para URL
function encodeSearchTerm(term) {
    return encodeURIComponent(String(term || '').trim());
}

// Formatear URL absoluta a partir de URL base y ruta
function formatUrl(baseUrl, path) {
    if (!path || path === 'none' || path.indexOf('#') === 0) return baseUrl;
    if (path.indexOf('http://') === 0 || path.indexOf('https://') === 0) return path;
    if (path.indexOf('/') === 0) return baseUrl + path;
    return baseUrl + '/' + path;
}
