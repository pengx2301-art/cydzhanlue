import requests
import zipfile
import os
import shutil

skills = [
    {
        "name": "vercel-react-best-practices",
        "url": "https://codeload.github.com/vercel-labs/agent-skills/zip/refs/heads/main",
        "extract_from": "agent-skills-main/skills/vercel-react-best-practices"
    },
    {
        "name": "web-design-guidelines",
        "url": "https://codeload.github.com/vercel-labs/agent-skills/zip/refs/heads/main",
        "extract_from": "agent-skills-main/skills/web-design-guidelines"
    },
    {
        "name": "frontend-design",
        "url": "https://codeload.github.com/anthropics/skills/zip/refs/heads/main",
        "extract_from": "skills-main/skills/frontend-design"
    }
]

target_dir = r'C:\Users\60496\.workbuddy\skills'
os.makedirs(target_dir, exist_ok=True)

print(f"Installing skills to: {target_dir}\n")

for skill in skills:
    print(f">>> Downloading {skill['name']}...")
    try:
        response = requests.get(skill['url'], timeout=30)
        response.raise_for_status()

        zip_path = os.path.join(target_dir, f"{skill['name']}.zip")
        with open(zip_path, 'wb') as f:
            f.write(response.content)

        print(f"    Extracting...")
        with zipfile.ZipFile(zip_path, 'r') as z:
            print(f"    ZIP contents: {[f for f in z.namelist()[:20]]}")

            dest = os.path.join(target_dir, skill['name'])
            if os.path.exists(dest):
                shutil.rmtree(dest)

            # Extract all files from the skill folder
            extracted = False
            for member in z.namelist():
                if member.startswith(skill['extract_from']) and member != skill['extract_from']:
                    # Remove prefix and extract
                    relative_path = member[len(skill['extract_from']):].lstrip('/')
                    if relative_path:
                        dest_path = os.path.join(dest, relative_path)
                        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                        if not member.endswith('/'):
                            with open(dest_path, 'wb') as out_f:
                                out_f.write(z.read(member))
                        extracted = True

            if extracted:
                print(f"    [OK] {skill['name']}")
            else:
                print(f"    [WARN] No files extracted for {skill['name']}")

        os.remove(zip_path)

    except Exception as e:
        print(f"    [ERROR] {skill['name']}: {e}")

print("\nDone!")
