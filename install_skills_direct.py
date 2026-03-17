import requests
import zipfile
import os
import shutil

skills = [
    {
        "name": "vercel-react-best-practices",
        "url": "https://codeload.github.com/vercel-labs/agent-skills/zip/refs/heads/main",
        "extract_from": "agent-skills-main/vercel-react-best-practices"
    },
    {
        "name": "web-design-guidelines",
        "url": "https://codeload.github.com/vercel-labs/agent-skills/zip/refs/heads/main",
        "extract_from": "agent-skills-main/web-design-guidelines"
    },
    {
        "name": "frontend-design",
        "url": "https://codeload.github.com/anthropics/skills/zip/refs/heads/main",
        "extract_from": "skills-main/frontend-design"
    },
    {
        "name": "agent-browser",
        "url": "https://codeload.github.com/vercel-labs/agent-browser/zip/refs/heads/main",
        "extract_from": "agent-browser-main"
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
            # Find the skill directory
            skill_dir = None
            for name in z.namelist():
                if name.startswith(skill['extract_from']) and name.endswith('/'):
                    skill_dir = name.rstrip('/')
                    break

            if skill_dir:
                # Extract only the skill folder
                dest = os.path.join(target_dir, skill['name'])
                if os.path.exists(dest):
                    shutil.rmtree(dest)
                os.makedirs(dest, exist_ok=True)

                for member in z.namelist():
                    if member.startswith(skill_dir):
                        # Remove prefix and extract
                        arcname = member[len(skill_dir):].lstrip('/')
                        if arcname:
                            dest_path = os.path.join(dest, arcname)
                            if member.endswith('/'):
                                os.makedirs(dest_path, exist_ok=True)
                            else:
                                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                                with open(dest_path, 'wb') as out_f:
                                    out_f.write(z.read(member))

                print(f"    [OK] {skill['name']}")
            else:
                print(f"    [WARN] Skill folder not found in zip")

        # Cleanup
        os.remove(zip_path)

    except Exception as e:
        print(f"    [ERROR] {skill['name']}: {e}")

print("\nDone! Check .workbuddy/skills for installed skills.")
