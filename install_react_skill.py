import requests
import zipfile
import os
import shutil

target_dir = r'C:\Users\60496\.workbuddy\skills'
skill_name = "react-best-practices"
url = "https://codeload.github.com/vercel-labs/agent-skills/zip/refs/heads/main"
prefix = "agent-skills-main/skills/react-best-practices"

os.makedirs(target_dir, exist_ok=True)
print(f">>> Downloading {skill_name}...")

response = requests.get(url, timeout=30)
response.raise_for_status()

zip_path = os.path.join(target_dir, f"{skill_name}.zip")
with open(zip_path, 'wb') as f:
    f.write(response.content)

print(f"    Extracting...")
dest = os.path.join(target_dir, skill_name)
if os.path.exists(dest):
    shutil.rmtree(dest)

with zipfile.ZipFile(zip_path, 'r') as z:
    extracted = 0
    for member in z.namelist():
        if member.startswith(prefix) and member != prefix:
            relative_path = member[len(prefix):].lstrip('/')
            if relative_path:
                dest_path = os.path.join(dest, relative_path)
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                if not member.endswith('/'):
                    with open(dest_path, 'wb') as out_f:
                        out_f.write(z.read(member))
                    extracted += 1

if extracted > 0:
    print(f"    [OK] {skill_name} - {extracted} files extracted")
else:
    print(f"    [WARN] No files extracted")

os.remove(zip_path)
print("Done!")
