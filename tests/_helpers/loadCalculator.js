/**
 * 测试辅助：从 frontend-user/js/app.js 中加载 bidCalculator 工厂函数
 * 不修改被测源码（保持浏览器环境下的纯净），通过 Function 沙箱执行其代码
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_SOURCE = resolve(__dirname, '../../frontend-user/js/app.js');

const source = readFileSync(APP_SOURCE, 'utf-8');
// 在源码末尾追加返回语句，通过 new Function 执行后取得工厂引用
const factory = new Function(`${source}\nreturn bidCalculator;`)();

export const bidCalculator = factory;
