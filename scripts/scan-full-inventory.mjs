import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

const allSrcFiles = walk('src');

const inventory = [];

function addEntry(item) {
  inventory.push({
    id: `ELEM-${String(inventory.length + 1).padStart(4, '0')}`,
    ...item
  });
}

// 1. 扫描 src/index.ts & panels
const indexContent = fs.readFileSync('src/index.ts', 'utf8');
const indexLines = indexContent.split('\n');

// 顶栏与命令、右键菜单
indexLines.forEach((line, idx) => {
  const lineNo = idx + 1;
  if (line.includes('addTopBar')) {
    addEntry({
      module: '宿主入口',
      location: `src/index.ts:${lineNo}`,
      component: 'index.ts',
      type: '顶栏图标按钮',
      label: '顶栏主图标 (iconLvContacts)',
      action: '点击打开工作台Tab / 移动端全屏Dialog',
      batch: 'Batch-1'
    });
  }
  if (line.includes('addCommand')) {
    const match = line.match(/langKey:\s*['"]([^'"]+)['"]/);
    const langKey = match ? match[1] : '快捷键命令';
    addEntry({
      module: '宿主入口',
      location: `src/index.ts:${lineNo}`,
      component: 'index.ts',
      type: '快捷键/命令',
      label: `思源命令: ${langKey}`,
      action: '触发对应快捷指令（如打开工作台、笔记捕获等）',
      batch: 'Batch-1'
    });
  }
  if (line.includes('open-menu-block') || line.includes('open-menu-content')) {
    addEntry({
      module: '宿主入口',
      location: `src/index.ts:${lineNo}`,
      component: 'index.ts',
      type: '右键菜单项',
      label: '编辑器块右键菜单: 人脉相关操作',
      action: '弹出快捷识别资料/从笔记捕获人脉菜单项',
      batch: 'Batch-1'
    });
  }
  if (line.includes('openSetting')) {
    addEntry({
      module: '宿主入口',
      location: `src/index.ts:${lineNo}`,
      component: 'index.ts',
      type: '设置项入口',
      label: '思源集市插件设置齿轮',
      action: '打开小驴人脉独立设置窗口',
      batch: 'Batch-1'
    });
  }
});

// 扫描 person-panel.ts
if (fs.existsSync('src/panels/person-panel.ts')) {
  const panelContent = fs.readFileSync('src/panels/person-panel.ts', 'utf8');
  const panelLines = panelContent.split('\n');
  panelLines.forEach((line, idx) => {
    const lineNo = idx + 1;
    if (line.includes('addEventListener') && line.includes('click')) {
      addEntry({
        module: '浮动档案条',
        location: `src/panels/person-panel.ts:${lineNo}`,
        component: 'person-panel.ts',
        type: '浮动面板按钮',
        label: '文档顶部浮动条交互操作',
        action: '点击触发复制、折叠、记互动、编辑资料或下钻打开工作台',
        batch: 'Batch-1'
      });
    }
  });
}

// 2. 扫描 Svelte 组件
const svelteFiles = allSrcFiles.filter(f => f.endsWith('.svelte'));

for (const file of svelteFiles) {
  const relPath = file.replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  let moduleName = '通用与公共组件';
  let defaultBatch = 'Batch-5';
  if (relPath.includes('/dashboard/')) {
    moduleName = '首页工作台 (Dashboard)';
    defaultBatch = 'Batch-2';
  } else if (relPath.includes('/people/')) {
    moduleName = '联系人名册与详情 (People)';
    defaultBatch = 'Batch-3';
  } else if (relPath.includes('/org/')) {
    moduleName = '组织架构 (Orgs)';
    defaultBatch = 'Batch-4';
  } else if (relPath.includes('/graph/')) {
    moduleName = '关系图谱 (Graph)';
    defaultBatch = 'Batch-4';
  } else if (relPath.includes('SettingsView')) {
    moduleName = '全局设置 (Settings)';
    defaultBatch = 'Batch-5';
  } else if (relPath.includes('Workbench') || relPath.includes('ContextPanel')) {
    moduleName = '工作台外壳与导航 (Workbench)';
    defaultBatch = 'Batch-1';
  } else if (relPath.includes('/capture/')) {
    moduleName = '笔记捕获 (Capture)';
    defaultBatch = 'Batch-1';
  }

  // 判定页面/面板/弹窗/抽屉本身
  const fileName = path.basename(file, '.svelte');
  if (fileName.endsWith('Dialog') || fileName.endsWith('Modal')) {
    addEntry({
      module: moduleName,
      location: `${relPath}:1`,
      component: fileName,
      type: '弹窗容器',
      label: `弹窗: ${fileName}`,
      action: '提供模态交互浮层、支持ESC与遮罩点击关闭',
      batch: defaultBatch
    });
  } else if (fileName.endsWith('Drawer')) {
    addEntry({
      module: moduleName,
      location: `${relPath}:1`,
      component: fileName,
      type: '抽屉容器',
      label: `抽屉: ${fileName}`,
      action: '提供滑出交互抽屉面板',
      batch: defaultBatch
    });
  } else if (fileName.endsWith('View') || fileName === 'Workbench') {
    addEntry({
      module: moduleName,
      location: `${relPath}:1`,
      component: fileName,
      type: '主页面/视图',
      label: `主视图: ${fileName}`,
      action: '承载主导航与一级核心业务大盘',
      batch: defaultBatch
    });
  }

  // 逐行解析具体控件
  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    const trimmed = line.trim();

    // 按钮
    if (trimmed.includes('<button') || (trimmed.includes('role="button"') && !trimmed.includes('<button'))) {
      let label = '操作按钮';
      const titleMatch = trimmed.match(/title=["']([^"']+)["']/);
      const ariaMatch = trimmed.match(/aria-label=["']([^"']+)["']/);
      const textMatch = trimmed.match(/>([^<>{}\n]+)</);
      if (titleMatch) label = titleMatch[1];
      else if (ariaMatch) label = ariaMatch[1];
      else if (textMatch && textMatch[1].trim()) label = textMatch[1].trim();

      const isIcon = trimmed.includes('icon') || trimmed.includes('svg') || trimmed.includes('--b3-theme');

      addEntry({
        module: moduleName,
        location: `${relPath}:${lineNo}`,
        component: fileName,
        type: isIcon ? '图标按钮' : '按钮',
        label: label.slice(0, 30),
        action: '点击触发对应业务逻辑或状态切换',
        batch: defaultBatch
      });
    }

    // 输入框与文本域
    if (trimmed.includes('<input') || trimmed.includes('<textarea')) {
      const isCheckbox = trimmed.includes('type="checkbox"');
      const isRadio = trimmed.includes('type="radio"');
      const isSwitch = trimmed.includes('switch') || trimmed.includes('toggle');
      let type = '单行输入框';
      if (trimmed.includes('<textarea')) type = '多行文本框';
      else if (isCheckbox || isSwitch) type = '复选框/开关';
      else if (isRadio) type = '单选框';

      let placeholderMatch = trimmed.match(/placeholder=["']([^"']+)["']/);
      let label = placeholderMatch ? placeholderMatch[1] : (isCheckbox ? '开关/勾选项' : '输入字段');

      addEntry({
        module: moduleName,
        location: `${relPath}:${lineNo}`,
        component: fileName,
        type,
        label: label.slice(0, 30),
        action: '编辑修改并双向绑定状态值',
        batch: defaultBatch
      });
    }

    // 下拉与分段选择
    if (trimmed.includes('<select')) {
      addEntry({
        module: moduleName,
        location: `${relPath}:${lineNo}`,
        component: fileName,
        type: '下拉选择框',
        label: '下拉选择选项',
        action: '下拉切换选中枚举项',
        batch: defaultBatch
      });
    }

    // 分段控件 / 标签切换 tab
    if (trimmed.includes('role="tab"') || (trimmed.includes('class="') && trimmed.includes('tab') && trimmed.includes('active') && trimmed.includes('on:click'))) {
      addEntry({
        module: moduleName,
        location: `${relPath}:${lineNo}`,
        component: fileName,
        type: '分段/标签切换控件',
        label: '视图或子分类 Tab 切换',
        action: '切换当前活动视图或子页面',
        batch: defaultBatch
      });
    }

    // 空态
    if (trimmed.includes('empty') || trimmed.includes('暂无') || trimmed.includes('空空如也') || trimmed.includes('没有符合')) {
      if (trimmed.includes('<div') || trimmed.includes('<p') || trimmed.includes('class=')) {
        addEntry({
          module: moduleName,
          location: `${relPath}:${lineNo}`,
          component: fileName,
          type: '空态提示/占位',
          label: '空数据引导或未匹配占位',
          action: '显示空态说明与快速创建/收编引导动作',
          batch: defaultBatch
        });
      }
    }

    // 错误态与重试
    if (trimmed.includes('error') || trimmed.includes('failed') || trimmed.includes('失败') || trimmed.includes('异常')) {
      if (trimmed.includes('class=') && (trimmed.includes('notice') || trimmed.includes('msg') || trimmed.includes('state') || trimmed.includes('alert'))) {
        addEntry({
          module: moduleName,
          location: `${relPath}:${lineNo}`,
          component: fileName,
          type: '错误态/提示反馈',
          label: '错误反馈或告警提示条',
          action: '提示错误原因并支持重新尝试或跳过',
          batch: defaultBatch
        });
      }
    }

    // 快捷键监听
    if (trimmed.includes('on:keydown') || trimmed.includes('addEventListener("keydown"')) {
      addEntry({
        module: moduleName,
        location: `${relPath}:${lineNo}`,
        component: fileName,
        type: '键盘快捷键监听',
        label: '键盘事件处理器 (Enter / Esc / Ctrl+Enter)',
        action: '快捷提交表单、切换条目或退出弹窗',
        batch: defaultBatch
      });
    }
  });
}

console.log(`Total scanned elements: ${inventory.length}`);

// 按模块和批次统计
const batchCounts = {};
const typeCounts = {};
const moduleCounts = {};

inventory.forEach(item => {
  batchCounts[item.batch] = (batchCounts[item.batch] || 0) + 1;
  typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
  moduleCounts[item.module] = (moduleCounts[item.module] || 0) + 1;
});

console.log('Batch counts:', batchCounts);
console.log('Type counts:', typeCounts);
console.log('Module counts:', moduleCounts);

// 写入 JSON 与 Markdown 文件
fs.writeFileSync('docs/FULL-ELEMENT-INVENTORY.json', JSON.stringify(inventory, null, 2), 'utf8');

let md = `# 小驴人脉（siyuan-contacts）全交互元素盘点清单与走查跟踪表

- **清单建立时间**：2026-11-01
- **盘点基线版本**：\`v0.7.5\`
- **全量元素总数**：**${inventory.length}** 项
- **划分批次体系**：
  - **Batch 1 (宿主级入口/外壳导航/快捷键/通用组件)**：${batchCounts['Batch-1'] || 0} 项
  - **Batch 2 (首页工作台 Dashboard)**：${batchCounts['Batch-2'] || 0} 项
  - **Batch 3 (联系人名册与详情 People & Detail)**：${batchCounts['Batch-3'] || 0} 项
  - **Batch 4 (组织架构 Orgs & 关系图谱 Graph)**：${batchCounts['Batch-4'] || 0} 项
  - **Batch 5 (全局设置 Settings & 状态/数据流/通用)**：${batchCounts['Batch-5'] || 0} 项

---

## 一、 各类型元素数量统计

| 元素交互类型 | 数量 | 占比 | 走查标准抓手 |
| :--- | :--- | :--- | :--- |
${Object.entries(typeCounts).map(([type, count]) => `| **${type}** | ${count} | ${((count / inventory.length) * 100).toFixed(1)}% | 能否点击/输入、状态反馈、文案清晰、防抖防误触 |`).join('\n')}

---

## 二、 模块与批次走查推进进度表

| 批次代号 | 覆盖模块 | 元素总数 | 本轮状态 | 累计覆盖项 | 累计覆盖率 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Batch 1** | 宿主入口、快捷键、浮动档案条、工作台外壳、笔记捕获向导 | ${batchCounts['Batch-1']} | **本轮重点走查 [In Progress]** | 待汇总 | - |
| **Batch 2** | 首页工作台 (Dashboard)、活跃度热力图、五大Hub弹窗、生命周期漏斗 | ${batchCounts['Batch-2']} | 待推进 (Round 2) | - | - |
| **Batch 3** | 联系人名册 (PeopleView)、人物详情 (PersonDetail)、20个业务子模块、新建/编辑/合并/补录向导 | ${batchCounts['Batch-3']} | 待推进 (Round 3) | - | - |
| **Batch 4** | 组织架构 (OrgsView)、组织编辑器、关系图谱 (RelationGraph)、网络枢纽分析 | ${batchCounts['Batch-4']} | 待推进 (Round 4) | - | - |
| **Batch 5** | 全局设置 (SettingsView)、状态通知 (StatusNotice)、工作区恢复、通用对话框 | ${batchCounts['Batch-5']} | 待推进 (Round 5) | - | - |

---

## 三、 全量元素明细表 (按编号索引)

| 编号 | 批次 | 所属模块 | 组件/文件位置 | 交互类型 | 元素标签/标识 | 触发动作与链路 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${inventory.map(item => `| \`${item.id}\` | ${item.batch} | ${item.module} | \`${item.location}\` | ${item.type} | ${item.label.replace(/\|/g, '/')} | ${item.action.replace(/\|/g, '/')} |`).join('\n')}
`;

fs.writeFileSync('docs/FULL-ELEMENT-INVENTORY.md', md, 'utf8');
console.log('Saved docs/FULL-ELEMENT-INVENTORY.md and .json successfully.');
