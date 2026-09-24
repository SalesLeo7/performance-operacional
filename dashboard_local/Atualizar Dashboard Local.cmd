@echo off
setlocal
cd /d "%~dp0"
set "PYTHON_BIN=C:\Users\leonardo.sales\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if not exist "%PYTHON_BIN%" set "PYTHON_BIN=python"
echo Atualizando os dados do dashboard. O processamento completo pode levar cerca de dois minutos...
"%PYTHON_BIN%" build_data.py
if errorlevel 1 (
  echo.
  echo Falha ao atualizar os dados. Verifique se a planilha esta fechada e tente novamente.
  pause
  exit /b 1
)
"%PYTHON_BIN%" build_standalone.py
if errorlevel 1 (
  echo.
  echo Falha ao gerar o arquivo Dashboard Atualizado.html.
  pause
  exit /b 1
)
echo.
echo Abrindo Dashboard Atualizado.html
start "" "%~dp0..\Dashboard Atualizado.html"
