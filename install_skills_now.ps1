$skills = @(
    "vercel-labs/agent-skills@vercel-react-best-practices",
    "vercel-labs/agent-skills@web-design-guidelines",
    "anthropics/skills@frontend-design",
    "vercel-labs/agent-browser@agent-browser"
)

$i = 1
$workbuddySkills = "$env:USERPROFILE\.workbuddy\skills"

Write-Host "Target skills dir: $workbuddySkills" -ForegroundColor Cyan

foreach ($skill in $skills) {
    $name = $skill.Split('@')[1]
    Write-Host "`n>>> [$i/4] Installing $name..." -ForegroundColor Yellow
    Write-Host "Command: npx -y skills add $skill -g" -ForegroundColor Gray

    $result = npx -y skills add $skill -g 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] $name installed" -ForegroundColor Green
    } else {
        Write-Host "[WARN] $name may have issues - Exit: $LASTEXITCODE" -ForegroundColor Yellow
        Write-Host $result
    }

    $i++
}

Write-Host "`n=== Skills in .workbuddy/skills ===" -ForegroundColor Cyan
Get-ChildItem $workbuddySkills -Directory -ErrorAction SilentlyContinue | Select-Object Name
Write-Host "=== Done ===" -ForegroundColor Green
