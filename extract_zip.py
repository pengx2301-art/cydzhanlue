import zipfile
import os

zip_path = r'C:\Users\60496\Desktop\WorkBuddy.zip'
extract_to = r'C:\Users\60496\WorkBuddy\20260317184320'

with zipfile.ZipFile(zip_path, 'r') as z:
    # 只解压核心文件，跳过 node_modules
    members = [f for f in z.namelist() if 'node_modules' not in f]
    print(f"共解压 {len(members)} 个文件/目录...")
    for member in members:
        z.extract(member, extract_to)
    print("解压完成！")
