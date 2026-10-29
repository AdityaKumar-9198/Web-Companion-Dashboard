@echo off
setlocal
title Push Web Companion Dashboard to GitHub

echo ========================================================
echo    Pushing Web Companion Dashboard to GitHub
echo    Account: AdityaKumar-9198
echo    Repository: Web-Companion-Dashboard
echo ========================================================
echo.

:: Add MinGit to path if not already in system path
set "PATH=%LOCALAPPDATA%\Programs\MinGit\cmd;%PATH%"

cd /d "%~dp0"

echo [1/3] Checking git status...
git status
echo.

echo [2/3] Adding changes and staging files...
git add .
git commit -m "Update Web Companion Dashboard" 2>nul
echo.

echo [3/3] Pushing to GitHub (main branch)...
echo If prompted, enter your GitHub Personal Access Token or Sign In via browser.
echo.
git push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo    SUCCESS! Project pushed to GitHub:
    echo    https://github.com/AdityaKumar-9198/Web-Companion-Dashboard
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo    NOTE: If the repository doesn't exist yet on GitHub:
    echo    1. Go to https://github.com/new
    echo    2. Set Repository name to: Web-Companion-Dashboard
    echo    3. Keep it Public (or Private) and do NOT check "Add a README"
    echo    4. Click "Create repository"
    echo    5. Then run this script again!
    echo ========================================================
)

echo.
pause

