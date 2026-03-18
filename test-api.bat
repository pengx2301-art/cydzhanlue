@echo off
echo Testing Balance API with curl...
echo.

echo Login to get token:
curl -X POST http://localhost:8899/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"123456\"}" -c cookies.txt

echo.
echo.
echo Get balance for order 3:
curl -X GET http://localhost:8899/api/orders/3/balance -H "Authorization: Bearer YOUR_TOKEN_HERE"

pause
