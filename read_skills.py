import zipfile

zip_path = r'C:\Users\60496\Desktop\WorkBuddy.zip'

targets = [
    'WorkBuddy/20260315203305/pack_skill.py',
    'WorkBuddy/20260315203305/package_skill.py',
    'WorkBuddy/20260315203305/install_skills.ps1',
    'WorkBuddy/20260315203305/install_skills.bat',
]

with zipfile.ZipFile(zip_path, 'r') as z:
    for t in targets:
        print(f"\n{'='*60}")
        print(f">>> {t}")
        print('='*60)
        try:
            content = z.read(t).decode('utf-8', errors='replace')
            print(content)
        except Exception as e:
            print(f"读取失败: {e}")
    
    # 另外看看有没有嵌套的 zip（conversion-copywriter.zip）
    print(f"\n{'='*60}")
    print(">>> conversion-copywriter.zip 内部结构")
    print('='*60)
    import io
    inner_data = z.read('WorkBuddy/20260315203305/conversion-copywriter.zip')
    inner_zip = zipfile.ZipFile(io.BytesIO(inner_data))
    for name in inner_zip.namelist():
        print(name)
