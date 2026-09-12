@echo off
setlocal
cd /d "%~dp0"
title RPA Comparador de Precios de Supermercados - TagUI
color 0b

echo =====================================================================
echo       RPA TAGUI - COMPARADOR DE SUPERMERCADOS (UTN FRCU)
echo   Sitios consultados: Carrefour Argentina, COTO Digital, Dia %%
echo   Arquitectura: Catalogo Local Previsto + TagUI Determinico en Vivo
echo =====================================================================
echo(

:: 1. Liberar puerto de depuracion 9222 en caso de instancias huerfanas de Chrome
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :9222 ^| findstr LISTENING 2^>nul') do (
    taskkill /f /pid %%a >nul 2>&1
)

:: 2. Cerrar procesos huerfanos que puedan bloquear archivos de log o TagUI
taskkill /f /im php.exe >nul 2>&1
taskkill /f /im tee.exe >nul 2>&1
taskkill /f /im casperjs.exe >nul 2>&1
taskkill /f /im phantomjs.exe >nul 2>&1

:: 3. Validar disponibilidad de Node.js
where node >nul 2>&1
if errorlevel 1 (
    color 0c
    echo [ERROR] No se encontro Node.js en el PATH.
    echo Node.js es requerido para validar el catalogo local.
    pause
    exit /b 1
)

:: 4. Validar disponibilidad de TagUI
where tagui >nul 2>&1
if errorlevel 1 (
    color 0c
    echo [ERROR] No se encontro el comando tagui en el PATH.
    echo Revise las instrucciones en README.md.
    pause
    exit /b 1
)

:: 5. Determinar Modo de Ejecución (INTERACTIVO por defecto o MANUAL con input.csv)
set "MODO_EJECUCION=INTERACTIVO"
if /i "%1"=="manual" set "MODO_EJECUCION=MANUAL"
if /i "%MODO%"=="MANUAL" set "MODO_EJECUCION=MANUAL"
if /i "%MODO_MANUAL%"=="1" set "MODO_EJECUCION=MANUAL"

if "%MODO_EJECUCION%"=="MANUAL" (
    echo [MODO MANUAL] Utilizando archivo input.csv existente...
    if not exist "input.csv" (
        color 0c
        echo [ERROR] No se encontro el archivo input.csv.
        echo Cree el archivo con las columnas: producto,marca,cantidad,unidad
        pause
        exit /b 1
    )
    echo [PASO 1/2] Validando productos contra catalogo local (catalogo/productos.json)...
    echo(
    call node validar_input.js input.csv
    if errorlevel 1 (
        color 0c
        echo(
        echo =====================================================================
        echo [ERROR] La validacion del producto contra el catalogo ha fallado.
        echo El RPA NO se iniciara hasta que se definan productos validos.
        echo =====================================================================
        echo(
        pause
        exit /b 1
    )
    goto INICIAR_TAGUI
)

:: MODO INTERACTIVO (Selección desde terminal contra catalogo/productos.json)
call node menu_interactivo.js
set "EXIT_CODE=%ERRORLEVEL%"

if "%EXIT_CODE%"=="3" (
    echo(
    echo Programa finalizado por el usuario.
    exit /b 0
)

if "%EXIT_CODE%"=="2" (
    echo(
    echo [INFO] Ejecucion cancelada por el usuario. No se inicio TagUI.
    pause
    exit /b 0
)

if not "%EXIT_CODE%"=="0" (
    color 0c
    echo(
    echo =====================================================================
    echo [ERROR] La seleccion o validacion del producto ha fallado.
    echo El RPA NO se iniciara hasta que se definan productos validos.
    echo =====================================================================
    echo(
    pause
    exit /b 1
)

:INICIAR_TAGUI

echo(
echo [PASO 2/2] Iniciando automatizacion RPA en vivo con TagUI...
echo (Se abrira Google Chrome VISIBLE en pantalla completa F11)
echo(

call tagui scraper_supermercados.tag input_tagui.csv
if errorlevel 1 (
    color 0c
    echo(
    echo =====================================================================
    echo [ERROR] El RPA termino con errores durante la ejecucion.
    echo =====================================================================
    echo(
    pause
    exit /b 1
)

echo(
echo =====================================================================
echo [OK] El RPA finalizo correctamente.
echo Los datos han sido guardados en el archivo: resultados.csv (15 columnas)
echo =====================================================================
echo(
pause
