@echo off
chcp 65001 >nul
title RPA Comparador de Precios de Supermercados - TagUI
color 0b

echo =====================================================================
echo       RPA TAGUI - COMPARADOR DE SUPERMERCADOS (UTN FRCU)
echo   Sitios consultados: Carrefour Argentina, COTO Digital, Dia %%
echo =====================================================================
echo.

:: Verificar si TagUI está disponible en el sistema
where tagui >nul 2>&1
if %ERRORLEVEL% neq 0 (
    color 0c
    echo [ERROR] No se encontro el comando 'tagui' en las variables de entorno (PATH).
    echo Por favor asegurese de tener TagUI instalado y configurado en el PATH.
    echo Revise las instrucciones detalladas en el archivo README.md.
    echo.
    pause
    exit /b 1
)

:: Verificar existencia de input.csv
if not exist "input.csv" (
    color 0c
    echo [ERROR] No se encontro el archivo 'input.csv'.
    echo Debe crear un archivo 'input.csv' con la lista de productos a consultar.
    echo.
    pause
    exit /b 1
)

echo [OK] TagUI y input.csv detectados correctamente.
echo Iniciando automatizacion RPA...
echo (Se abrira Google Chrome para realizar la navegacion y extraccion)
echo.

tagui scraper_supermercados.tag input.csv

echo.
echo =====================================================================
echo [FIN] Proceso completado exitosamente.
echo Los datos han sido guardados en el archivo: resultados.csv
echo =====================================================================
echo.
pause
