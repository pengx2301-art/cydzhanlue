const fs = require('fs');

try {
  fs.copyFileSync('c:/Users/60496/WorkBuddy/20260317184320/用户偏好设置.md', 'C:/Users/60496/Desktop/用户偏好设置.md');
  console.log('✓ 用户偏好设置已复制到桌面');
} catch (error) {
  console.error('复制失败:', error.message);
}
