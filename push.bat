@echo off
set /p TOKEN=Enter your GitHub token: 
git remote set-url origin https://usmanttugga:%TOKEN%@github.com/usmanttugga/tugga-nin.git
git add -A
git commit -m "Update app"
git push origin main --force
echo.
echo Done! Changes are live.
pause
