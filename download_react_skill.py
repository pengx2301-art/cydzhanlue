import requests
import zipfile
import os
import shutil

target_dir = r'C:\Users\60496\.workbuddy\skills'
os.makedirs(target_dir, exist_ok=True)

print(">>> Downloading vercel-react-best-practices from main branch...")
url = "https://codeload.github.com/vercel-labs/agent-skills/zip/refs/heads/main"

response = requests.get(url, timeout=30)
response.raise_for_status()

zip_path = os.path.join(target_dir, "react_skill.zip")
with open(zip_path, 'wb') as f:
    f.write(response.content)

print("    Scanning ZIP structure...")
with zipfile.ZipFile(zip_path, 'r') as z:
    # List all files containing 'react' in the name
    react_files = [f for f in z.namelist() if 'react' in f.lower()]
    print(f"    Found {len(react_files)} files with 'react':")
    for f in react_files[:50]:
        print(f"      {f}")

    # Look for SKILL.md
    skill_md_files = [f for f in z.namelist() if 'SKILL.md' in f]
    print(f"\n    Found {len(skill_md_files)} SKILL.md files:")
    for f in skill_md_files:
        print(f"      {f}")

os.remove(zip_path)
print("\nDone!")
