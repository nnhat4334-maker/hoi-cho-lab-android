@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
if not defined ANDROID_HOME set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
if not defined JAVA_HOME set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
if not exist "%JAVA_HOME%\bin\java.exe" (
  echo [ERROR] Cannot find Java from Android Studio: %JAVA_HOME%
  echo Please install Android Studio or set JAVA_HOME to JDK 17 or later.
  pause
  exit /b 1
)
if not exist "%ANDROID_HOME%\platforms\android-35\android.jar" (
  echo [ERROR] Android SDK Platform 35 is missing.
  echo Open Android Studio ^> Tools ^> SDK Manager and install Android 15 API 35.
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-apk.ps1"
if errorlevel 1 (
  echo.
  echo [ERROR] APK build did not complete. Check the error above.
  pause
  exit /b 1
)
echo.
echo [OK] Ready: %~dp0HCL.apk
pause
