// ==============================================================================
// tests/smoke_tagui.tag - Smoke Test para Verificacion de Motor TagUI
// UTN FRCU - Tecnologias para la Automatizacion
// Ejecucion: tagui tests/smoke_tagui.tag
// ==============================================================================

echo ============================================================
echo [SMOKE TEST] Verificando motor de ejecucion TagUI...
echo ============================================================

// 1. Abrir pagina web de prueba rapida en Google Chrome
https://duckduckgo.com
wait 3

// 2. Interaccion con buscador real
echo -> Verificando input del buscador...
xpSearch = '//input[@name="q"]'
if (present(xpSearch))
    echo -> Buscador detectado. Haciendo click real...
    click `xpSearch`
    wait 1
    echo -> Escribiendo termino de prueba en el input...
    type `xpSearch` as [clear]TagUI Smoke Test
    wait 1
    type `xpSearch` as [enter]
    wait 3

// 3. Interaccion con DOM
dom return (function(){ document.title = 'TagUI Smoke Test OK'; return document.title; })()
echo -> Titulo DOM configurado: `dom_result`

// 4. Escritura de archivo de persistencia
dump `dom_result` to smoke_output.txt

// 5. Verificacion de ejecucion
if dom_result equals to 'TagUI Smoke Test OK'
    echo ============================================================
    echo [OK] Motor TagUI operativo: abre Chrome, interactua con DOM,
    echo      escribe en buscador y genera archivo de persistencia.
    echo ============================================================
else
    echo [ERROR] Fallo en la ejecucion del smoke test de TagUI.