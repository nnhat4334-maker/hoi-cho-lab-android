$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$tools = Join-Path $root '.build-tools'
$gradle = Join-Path $tools 'gradle-8.9\bin\gradle.bat'
if (-not (Test-Path $gradle)) {
    New-Item -ItemType Directory -Force $tools | Out-Null
    $zip = Join-Path $tools 'gradle-8.9-bin.zip'
    Write-Host '[1/3] Download Gradle 8.9 from official distribution...'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -UseBasicParsing -Uri 'https://services.gradle.org/distributions/gradle-8.9-bin.zip' -OutFile $zip
    Expand-Archive -Path $zip -DestinationPath $tools -Force
    Remove-Item $zip
}
Write-Host '[2/3] Build offline Hoi Cho Lab Android APK...'
& $gradle --no-daemon -p $root ':app:assembleDebug'
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$apk = Join-Path $root 'app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path $apk)) { throw "Expected APK not found: $apk" }
Copy-Item -Force $apk (Join-Path $root 'HCL.apk')
Write-Host '[3/3] HCL.apk ready (Android debug-signed app for manual installation).'
