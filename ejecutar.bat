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
echo [OK] TagUI y input.csv detectados correctamente.
echo Iniciando automatizacion RPA...
echo (Se abrira Google Chrome para realizar la navegacion y extraccion)
echo(
call tagui scraper_supermercados.tag input.csv
echo(
echo =====================================================================
echo [FIN] Proceso completado exitosamente.
echo Los datos han sido guardados en el archivo: resultados.csv
echo =====================================================================
echo(
pause
