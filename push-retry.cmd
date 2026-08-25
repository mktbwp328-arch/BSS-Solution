@echo off
REM Retry pushing the site to GitHub. Run when the connection to GitHub is
REM healthy again (or from a phone hotspot / different network).
cd /d "%~dp0"
:loop
git push -u origin main && goto done
echo Push failed - retrying in 15 seconds... (Ctrl+C to stop)
timeout /t 15 /nobreak >nul
goto loop
:done
echo.
echo Pushed successfully: https://github.com/mktbwp328-arch/BSS-Solution
pause
