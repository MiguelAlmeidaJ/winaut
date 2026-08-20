@echo off
setlocal
title Orquestra Agent - Diagnostico GO_GLOBAL

set "WINAUT_GOGLOBAL_DIAGNOSTIC_HOLD_MS=5000"
"%~dp0runtime\node.exe" "%~dp0app\dist\diagnostics\go-global-open.diagnostic.js" 101
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo O diagnostico falhou. Revise a mensagem acima.
)
pause
exit /b %EXIT_CODE%
