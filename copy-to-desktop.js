const fs = require('fs');

try {
  const sourceFile = 'c:/Users/60496/WorkBuddy/20260317184320/工作报告-飞书版.txt';
  const targetFile = 'C:/Users/60496/Desktop/工作报告.txt';
  
  // 检查源文件是否存在
  if (!fs.existsSync(sourceFile)) {
    console.error('源文件不存在:', sourceFile);
    process.exit(1);
  }
  
  // 复制文件
  fs.copyFileSync(sourceFile, targetFile);
  
  console.log('✓ 工作报告已成功保存到桌面!');
  console.log('文件位置:', targetFile);
  console.log('');
  console.log('您现在可以在桌面上找到 "工作报告.txt" 文件。');
  console.log('打开后,您可以复制内容到飞书发送。');
  
} catch (error) {
  console.error('复制失败:', error.message);
  process.exit(1);
}
