import zipfile
import os

zip_path = r'C:\Users\60496\Desktop\WorkBuddy.zip'
target_dir = r'C:\Users\60496\.workbuddy\skills'
temp_zip = r'C:\Users\60496\workbuddy_skills_temp.zip'

os.makedirs(target_dir, exist_ok=True)

with zipfile.ZipFile(zip_path, 'r') as z:
    inner_data = z.read('WorkBuddy/20260315203305/conversion-copywriter.zip')
    with open(temp_zip, 'wb') as f:
        f.write(inner_data)

print("=== conversion-copywriter.zip contents ===")
with zipfile.ZipFile(temp_zip, 'r') as inner_zip:
    for name in inner_zip.namelist():
        print("  " + name)

    print("\n=== Extracting to .workbuddy/skills ===")
    for member in inner_zip.namelist():
        inner_zip.extract(member, target_dir)

os.remove(temp_zip)

print("\n[OK] Skill restored to: " + target_dir + "\\conversion-copywriter")
