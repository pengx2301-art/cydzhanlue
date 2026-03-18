@echo off
ssh -i C:\Users\60496\Desktop\chongyida.pem -o StrictHostKeyChecking=no ubuntu@81.70.208.147 cd /app && ls -la dashboard-ui
