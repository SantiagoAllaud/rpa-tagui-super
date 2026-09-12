@echo off
setlocal
cd /d "%~dp0"
title RPA Comparador de Precios de Supermercados - TagUI
color 0b

echo =====================================================================
echo       RPA TAGUI - COMPARADOR DE SUPERMERCADOS (UTN FRCU)
echo   Sitios consultados: Carrefour Argentina, COTO Digital, Dia
echo =====================================================================
echo(

:: Liberar puerto de depuracion 9222 en caso de instancias huerfanas de Chrome
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :9222 ^| findstr LISTENING 2^>nul') do (
    taskkill /f /pid %%a >nul 2>&1
)

where tagui >nul 2>&1
if errorlevel 1 (
    color 0c
    echo [ERROR] No se encontro el comando tagui en el PATH.
    echo Revise las instrucciones en README.md.
    pause
    exit /b 1
)

if not exist "input.csv" (
    color 0c
    echo [ERROR] No se encontro el archivo input.csv.
    pause
    exit /b 1
)

echo [OK] TagUI e input.csv detectados correctamente.
echo Iniciando automatizacion RPA...
echo (Se abrira Google Chrome VISIBLE para realizar la navegacion e interaccion)
echo(

call tagui scraper_supermercados.tag input.csv

echo(
echo =====================================================================
echo [FIN] Proceso completado exitosamente.
echo Los datos han sido guardados en el archivo: resultados.csv
echo =====================================================================
echo(
pause
