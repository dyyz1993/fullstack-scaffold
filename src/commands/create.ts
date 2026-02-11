import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createProject(projectName: string): Promise<void> {
  // 在当前工作目录创建项目
  // 使用前请先 cd 到目标目录，例如：cd /Users/xuyingzhou/Project
  const targetDir = path.resolve(process.cwd(), projectName);
  const templateDir = path.join(__dirname, '../../template');

  // 检查目标目录是否已存在
  if (await fs.pathExists(targetDir)) {
    console.error(chalk.red(`  ✖ 目录 ${projectName} 已存在`));
    process.exit(1);
  }

  try {
    // 创建项目目录
    const spinner = ora('Creating project directory...').start();
    await fs.ensureDir(targetDir);
    spinner.succeed(chalk.green('Project directory created'));

    // 复制模板文件
    spinner.start('Copying template files...');
    await fs.copy(templateDir, targetDir, {
      filter: (src) => {
        const relative = path.relative(templateDir, src);
        return !relative.startsWith('node_modules');
      }
    });
    spinner.succeed(chalk.green('Template files copied'));

    // 更新 package.json 中的项目名称
    spinner.start('Configuring package.json...');
    const pkgJsonPath = path.join(targetDir, 'package.json');
    const pkgJson = await fs.readJson(pkgJsonPath);
    pkgJson.name = projectName;
    await fs.writeJson(pkgJsonPath, pkgJson, { spaces: 2 });
    spinner.succeed(chalk.green('package.json configured'));

    console.log('');
    console.log(chalk.green('  ✓ Project created successfully!'));
    console.log('');
    console.log(chalk.cyan('  Next steps:'));
    console.log(chalk.white(`    cd ${projectName}`));
    console.log(chalk.white('    npm install'));
    console.log(chalk.white('    npm run dev'));
    console.log('');
    console.log(chalk.gray('  Happy coding! 🐟'));
    console.log('');

  } catch (error) {
    console.error(chalk.red('  ✖ Error creating project:'), error);
    process.exit(1);
  }
}
