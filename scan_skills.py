import zipfile

zip_path = r'C:\Users\60496\Desktop\WorkBuddy.zip'

with zipfile.ZipFile(zip_path, 'r') as z:
    files = z.namelist()
    print("=== 所有文件（含 node_modules）===\n")
    for f in files:
        # 重点关注 skill、Claw 目录等
        if any(kw in f.lower() for kw in ['skill', 'claw', '.md', 'readme', 'prompt']):
            print(f"[命中] {f}")
    
    print("\n\n=== Claw 目录内容 ===")
    claw_files = [f for f in files if 'Claw' in f]
    for f in claw_files:
        print(f)
    
    print("\n\n=== 完整文件树（排除 node_modules）===")
    core = [f for f in files if 'node_modules' not in f]
    for f in core:
        print(f)
