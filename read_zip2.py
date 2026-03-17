import zipfile

zip_path = r'C:\Users\60496\Desktop\WorkBuddy.zip'

key_files = [
    'WorkBuddy/20260315203305/package.json',
    'WorkBuddy/20260315203305/server.js',
    'WorkBuddy/20260315203305/db.js',
    'WorkBuddy/20260315203305/.workbuddy/rules/ui-design-style.mdc',
    'WorkBuddy/20260315203305/data/cyd.json',
]

with zipfile.ZipFile(zip_path, 'r') as z:
    for kf in key_files:
        print(f"\n{'='*60}")
        print(f">>> {kf}")
        print('='*60)
        try:
            raw = z.read(kf)
            content = raw.decode('utf-8', errors='replace')
            print(content[:5000])
            if len(content) > 5000:
                print(f"\n... [已截断，总长 {len(content)} 字符]")
        except Exception as e:
            print(f"读取失败: {e}")
