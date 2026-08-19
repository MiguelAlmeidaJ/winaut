Option Explicit

Dim shell, fso, baseDir, logDir, nodePath, cliPath, command, version
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

baseDir = fso.GetParentFolderName(WScript.ScriptFullName)
logDir = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Orquestra\Agent\logs"
version = "dev"
If WScript.Arguments.Count > 0 Then
  version = WScript.Arguments(0)
End If

If Not fso.FolderExists(logDir) Then
  fso.CreateFolder(logDir)
End If

shell.Environment("PROCESS")("WINAUT_AGENT_VERSION") = version
nodePath = baseDir & "\runtime\node.exe"
cliPath = baseDir & "\app\dist\cli.js"
command = "cmd.exe /d /c """"" & nodePath & """ """ & cliPath & """ >> """ & logDir & "\agent.log"" 2>&1"""

shell.Run command, 0, False
