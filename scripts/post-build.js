import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

// 生成基于时间戳的版本号
function generateTimestampVersion() {
  return Date.now().toString();
}

// 生成构建信息
function generateBuildInfo(version) {
  return {
    version: version,
    buildTime: new Date().toISOString(),
    buildNumber: Date.now()
  };
}

// 写入版本文件
function writeVersionFile(outputDir, version) {
  try {
    const versionInfo = generateBuildInfo(version);

    // 确保 dist 目录存在
    mkdirSync(outputDir, { recursive: true });

    // 写入版本文件
    const versionPath = join(outputDir, 'version.json');
    writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));

    console.log(`✅ 版本文件已生成: ${versionPath}`);
    console.log(`📦 时间戳版本: ${versionInfo.version}`);
    console.log(`🕐 构建时间: ${versionInfo.buildTime}`);

    return versionInfo.version;
  } catch (error) {
    console.error('❌ 生成版本文件失败:', error);
    return null;
  }
}

// 更新HTML文件中的版本号
function updateHtmlVersion(outputDir, version) {
  try {
    const htmlPath = join(outputDir, 'index.html');
    let htmlContent = readFileSync(htmlPath, 'utf-8');

    // 替换HTML中的版本号
    htmlContent = htmlContent.replace(
      /<meta name="app-version" content="[^"]*" \/>/,
      `<meta name="app-version" content="${version}" />`
    );

    writeFileSync(htmlPath, htmlContent, 'utf-8');
    console.log(`✅ HTML版本已更新: ${version}`);
  } catch (error) {
    console.error('❌ 更新HTML版本失败:', error);
  }
}

// 运行
const buildVersion = generateTimestampVersion();
const finalVersion = writeVersionFile('./dist', buildVersion);

if (finalVersion) {
  updateHtmlVersion('./dist', finalVersion);
}