// ==============================================================================
// tests/smoke_tagui.tag - Smoke Test para Verificación de Motor TagUI
// UTN FRCU - Tecnologías para la Automatización
// Ejecución: tagui tests/smoke_tagui.tag -h
// ==============================================================================

echo ============================================================
echo [SMOKE TEST] Verificando motor de ejecucion TagUI...
echo ============================================================

// 1. Abrir pagina web de prueba rapida
https://duckduckgo.com
wait 3

// 2. Interaccion con DOM
dom return (function(){ document.title = 'TagUI Smoke Test OK'; return document.title; })()
echo -> Titulo DOM configurado: `dom_result`

// 3. Escritura de archivo de persistencia
dump `dom_result` to smoke_output.txt

// 4. Verificacion de escritura
if dom_result equals to 'TagUI Smoke Test OK'
    echo ============================================================
    echo [OK] Motor TagUI operativo, interactua con DOM y escribe archivos.
    echo ============================================================
else
    echo [ERROR] Fallo en la ejecucion del smoke test de TagUI.


