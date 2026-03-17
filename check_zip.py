import os
import zipfile

zip_path = r'C:\Users\60496\Desktop\WorkBuddy.zip'

if not os.path.exists(zip_path):
    print("文件不存在！")
else:
    size = os.path.getsize(zip_path)
    print(f"文件存在，大小：{size / 1024:.1f} KB")
    print("\n=== ZIP 内容列表 ===")
    with zipfile.ZipFile(zip_path, 'r') as z:
        files = z.namelist()
        for f in files[:100]:
            print(f)
        if len(files) > 100:
            print(f"\n... 共 {len(files)} 个文件/目录")
