@echo off
REM ===========================================================================
REM  DAY firestore.rules LEN MAY CHU FIREBASE
REM
REM  Dung khi khong dan duoc trong Firebase Console.
REM
REM  VI SAO LA .CMD CHU KHONG PHAI .PS1:
REM  Tren may cong ty, PowerShell chan chay script (execution policy), nen go
REM  "npx" trong PowerShell se bao "npx.ps1 cannot be loaded ... running
REM  scripts is disabled on this system". Tep .cmd chay bang cmd.exe nen khong
REM  dinh rao do. Bam doi chuot vao tep nay la xong, khong phai sua cai gi
REM  trong may.
REM
REM  Cach dung:
REM     day-rules.cmd <MA_PROJECT>
REM  Hoac bam doi chuot roi go ma project khi duoc hoi.
REM
REM  MA PROJECT lay o dau: mo app -> muc Tai khoan -> bam "Kiem tra quyen".
REM  Dong "Project" chinh la no.
REM
REM  LUU Y: neu dong "Co so du lieu" hien ra KHAC (default) thi phai sua truong
REM  "database" trong firebase.json cho dung ten do TRUOC khi chay. Moi co so
REM  du lieu co bo rules rieng, day nham cai khac thi khong co tac dung gi.
REM ===========================================================================

setlocal
cd /d "%~dp0"

set "DUAN=%~1"
if "%DUAN%"=="" set /p DUAN=Ma project Firebase:
if "%DUAN%"=="" (
  echo Chua co ma project. Dung lai.
  pause
  exit /b 1
)

echo.
echo === Dang dung firestore.rules trong thu muc nay ===
findstr /n /c:"function isApproved" firestore.rules >nul
if errorlevel 1 (
  echo CANH BAO: khong thay ham isApproved trong firestore.rules.
  echo Co the dang o nham thu muc, hoac tep chua duoc cap nhat.
  pause
)

echo.
echo === Buoc 1/2: dang nhap Firebase ===
echo Trinh duyet se mo ra de xac nhan. Neu may khong mo duoc trinh duyet,
echo dong cua so nay roi chay lai bang: day-rules.cmd %DUAN% --no-localhost
echo.
call npx.cmd --yes firebase-tools login
if errorlevel 1 goto loi

echo.
echo === Buoc 2/2: day rules len project %DUAN% ===
call npx.cmd --yes firebase-tools deploy --only firestore:rules --project %DUAN%
if errorlevel 1 goto loi

echo.
echo XONG. Vao app bam "Kiem tra quyen" de doi chieu lai.
pause
exit /b 0

:loi
echo.
echo THAT BAI. Doc ky dong bao loi o tren.
echo   - "Failed to get Firebase project" thi ma project dang sai.
echo   - Bao ve database khong tim thay thi sua truong "database" trong
echo     firebase.json cho khop voi dong "Co so du lieu" ma nut Kiem tra
echo     quyen bao.
pause
exit /b 1
