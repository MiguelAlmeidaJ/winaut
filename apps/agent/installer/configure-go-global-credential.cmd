@echo off
setlocal
title Orquestra Agent - Configurar credencial GO_GLOBAL

"%~dp0runtime\node.exe" "%~dp0app\dist\tools\configure-go-global-credential.js"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo A configuracao nao foi concluida. Revise a mensagem acima.
)
pause
exit /b %EXIT_CODE%
