import os
import zipfile

zip_path = r'C:\Users\60496\Desktop\WorkBuddy.zip'

with zipfile.ZipFile(zip_path, 'r') as z:
    files = z.namelist()
    
    # 过滤掉 node_modules，只看项目核心文件
    core_files = [f for f in files if 'node_modules' not in f]
    
    print(f"=== 核心文件列表（排除 node_modules，共 {len(core_files)} 项）===\n")
    for f in core_files:
        print(f)
    
    # 读取关键文件内容
    key_files = [
        'WorkBuddy/20260315203305/dashboard-ui/index.html',
        'WorkBuddy/20260315203305/dashboard-ui/login.html',
        'WorkBuddy/20260315203305/dashboard-ui/style.css',
        'WorkBuddy/20260315203305/dashboard-ui/charts.js',
        'WorkBuddy/20260315203305/db.js',
        'WorkBuddy/20260315203305/.workbuddy/rules/ui-design-style.mdc',
    ]
    
    for kf in key_files:
        if kf in files:
            print(f"\n\n{'='*60}")
            print(f">>> {kf}")
            print('='*60)
            try:
                content = z.read(kf).decode('utf-8', errors='replace')
                print(content[:3000])
                if len(content) > 3000:
                    print(f"\n... [文件过长，已截断，总长 {len(content)} 字符]")
            except Exception as e:
                print(f"读取失败: {e}")
