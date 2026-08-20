#ifndef PayloadRoot
  #error PayloadRoot must be provided by build-windows-installer.ps1
#endif
#ifndef MyAppVersion
  #define MyAppVersion "0.0.1"
#endif

#define MyAppName "Orquestra Agent"
#define MyAppPublisher "Orquestra"
#define MyAppId "{{2C44457A-970A-4C7C-901F-9C34158F830B}"

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Programs\Orquestra Agent
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
WizardStyle=modern
Compression=lzma2
SolidCompression=yes
OutputBaseFilename=OrquestraAgentSetup-{#MyAppVersion}
UninstallDisplayName={#MyAppName}
CloseApplications=yes
RestartApplications=no

[Files]
Source: "{#PayloadRoot}\app\*"; DestDir: "{app}\app"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#PayloadRoot}\runtime\node.exe"; DestDir: "{app}\runtime"; Flags: ignoreversion
Source: "{#SourcePath}\start-agent.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourcePath}\configure-go-global-credential.cmd"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourcePath}\diagnose-go-global.cmd"; DestDir: "{app}"; Flags: ignoreversion

[UninstallDelete]
Type: files; Name: "{userstartup}\Orquestra Agent.lnk"
Type: filesandordirs; Name: "{userprograms}\Orquestra Agent"

[Code]
var
  EnrollmentPage: TInputQueryWizardPage;
  EnrollmentSucceeded: Boolean;

procedure InitializeWizard;
begin
  EnrollmentPage := CreateInputQueryPage(
    wpWelcome,
    'Vincular ao Orquestra',
    'Informe os dados gerados na plataforma Orquestra',
    'O setup usará o código uma única vez para registrar esta máquina. A credencial permanente será protegida pelo Windows DPAPI.'
  );
  EnrollmentPage.Add('URL da API:', False);
  EnrollmentPage.Add('Código de ativação:', False);
  EnrollmentPage.Values[0] := ExpandConstant('{param:APIURL|}');
  EnrollmentPage.Values[1] := ExpandConstant('{param:ACTIVATIONCODE|}');
end;

function StartsWithHttp(const Value: String): Boolean;
var
  Normalized: String;
begin
  Normalized := Lowercase(Trim(Value));
  Result := (Pos('http://', Normalized) = 1) or (Pos('https://', Normalized) = 1);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;

  if CurPageID = EnrollmentPage.ID then
  begin
    if not StartsWithHttp(EnrollmentPage.Values[0]) then
    begin
      MsgBox('Informe uma URL válida começando com http:// ou https://.', mbError, MB_OK);
      Result := False;
      Exit;
    end;

    if Trim(EnrollmentPage.Values[1]) = '' then
    begin
      MsgBox('Informe o código de ativação gerado na plataforma Orquestra.', mbError, MB_OK);
      Result := False;
      Exit;
    end;

    if (Pos('"', EnrollmentPage.Values[0]) > 0) or
       (Pos('"', EnrollmentPage.Values[1]) > 0) then
    begin
      MsgBox('URL ou código de ativação contém caracteres inválidos.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

procedure CreateAgentShortcuts;
var
  StartMenuDir: String;
  WScriptPath: String;
  ScriptParameters: String;
begin
  StartMenuDir := ExpandConstant('{userprograms}\Orquestra Agent');
  ForceDirectories(StartMenuDir);
  WScriptPath := ExpandConstant('{sys}\wscript.exe');
  ScriptParameters := ExpandConstant('"{app}\start-agent.vbs" "{#MyAppVersion}"');

  CreateShellLink(
    StartMenuDir + '\Iniciar Orquestra Agent.lnk',
    'Inicia o Orquestra Agent na sessão Windows atual',
    WScriptPath,
    ScriptParameters,
    ExpandConstant('{app}'),
    '',
    0,
    SW_SHOWNORMAL
  );

  CreateShellLink(
    StartMenuDir + '\Configurar credencial GO_GLOBAL.lnk',
    'Configura a credencial segura usada pelo App Controller/GO-Global',
    ExpandConstant('{app}\configure-go-global-credential.cmd'),
    '',
    ExpandConstant('{app}'),
    '',
    0,
    SW_SHOWNORMAL
  );

  CreateShellLink(
    StartMenuDir + '\Diagnosticar GO_GLOBAL - rotina 101.lnk',
    'Abre App Controller, WinThor e a rotina 101 sem executar ação de negócio',
    ExpandConstant('{app}\diagnose-go-global.cmd'),
    '',
    ExpandConstant('{app}'),
    '',
    0,
    SW_SHOWNORMAL
  );

  CreateShellLink(
    ExpandConstant('{userstartup}\Orquestra Agent.lnk'),
    'Inicia o Orquestra Agent automaticamente ao entrar no Windows',
    WScriptPath,
    ScriptParameters,
    ExpandConstant('{app}'),
    '',
    0,
    SW_SHOWNORMAL
  );
end;

function RunEnrollment: Boolean;
var
  NodePath: String;
  EnrollmentScript: String;
  EnrollmentInputPath: String;
  EnrollmentInput: String;
  EnrollmentInputLines: TArrayOfString;
  Parameters: String;
  ResultCode: Integer;
begin
  NodePath := ExpandConstant('{app}\runtime\node.exe');
  EnrollmentScript := ExpandConstant('{app}\app\dist\enrollment\enroll.js');
  EnrollmentInputPath := ExpandConstant('{tmp}\orquestra-agent-enrollment.json');
  EnrollmentInput :=
    '{"apiUrl":"' + Trim(EnrollmentPage.Values[0]) + '",' +
    '"activationCode":"' + Trim(EnrollmentPage.Values[1]) + '"}';

  SetArrayLength(EnrollmentInputLines, 1);
  EnrollmentInputLines[0] := EnrollmentInput;

  if not SaveStringsToUTF8FileWithoutBOM(
    EnrollmentInputPath,
    EnrollmentInputLines,
    False
  ) then
  begin
    Result := False;
    Exit;
  end;

  Parameters :=
    '"' + EnrollmentScript + '" --input-file ' +
    '"' + EnrollmentInputPath + '"';

  Result := Exec(
    NodePath,
    Parameters,
    ExpandConstant('{app}\app'),
    SW_HIDE,
    ewWaitUntilTerminated,
    ResultCode
  ) and (ResultCode = 0);

  DeleteFile(EnrollmentInputPath);
end;

procedure StartAgent;
var
  ResultCode: Integer;
begin
  Exec(
    ExpandConstant('{sys}\wscript.exe'),
    ExpandConstant('"{app}\start-agent.vbs" "{#MyAppVersion}"'),
    ExpandConstant('{app}'),
    SW_HIDE,
    ewNoWait,
    ResultCode
  );
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  RetryResult: Integer;
begin
  if CurStep <> ssPostInstall then
    Exit;

  EnrollmentSucceeded := False;
  repeat
    EnrollmentSucceeded := RunEnrollment;
    if EnrollmentSucceeded then
      Break;

    RetryResult := MsgBox(
      'Não foi possível vincular esta máquina ao Orquestra.' + #13#10 + #13#10 +
      'Verifique a URL da API, a conectividade e se o código de ativação ainda é válido.' + #13#10 +
      'Você pode gerar um novo código na plataforma e clicar em Repetir.',
      mbError,
      MB_RETRYCANCEL
    );
  until RetryResult <> IDRETRY;

  if EnrollmentSucceeded then
  begin
    CreateAgentShortcuts;
    StartAgent;
    MsgBox(
      'Orquestra Agent instalado e vinculado com sucesso.' + #13#10 + #13#10 +
      'O Agent será iniciado automaticamente nesta sessão e nos próximos logons deste usuário Windows.',
      mbInformation,
      MB_OK
    );
  end
  else
  begin
    MsgBox(
      'Os arquivos do Orquestra Agent foram instalados, mas o vínculo não foi concluído.' + #13#10 +
      'Execute novamente o instalador quando tiver um novo código de ativação.',
      mbInformation,
      MB_OK
    );
  end;
end;
