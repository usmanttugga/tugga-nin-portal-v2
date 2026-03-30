@echo off
echo Pushing to GitHub...
git add -A
git commit -m "Update app"
git push origin main --force
echo Done!
pause
