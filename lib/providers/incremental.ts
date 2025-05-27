import { parse as parseHTML } from 'node-html-parser';

export interface CodeFragment {
  id: string;
  type: 'html' | 'css' | 'js';
  content: string;
  path?: string;
  position?: { start: number; end: number };
}

// 代码解析器，将完整HTML拆分为多个组件片段
export class CodeParser {
  // 将HTML代码解析为HTML、CSS、JS三个主要部分
  static parseHTMLToFragments(htmlCode: string): CodeFragment[] {
    const fragments: CodeFragment[] = [];
    const root = parseHTML(htmlCode);
    
    // 提取HTML结构（移除style和script标签内容）
    const htmlContent = root.toString()
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '<style></style>')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '<script></script>');
    
    fragments.push({
      id: 'html-structure',
      type: 'html',
      content: htmlContent,
    });
    
    // 提取CSS
    const styleElements = root.querySelectorAll('style');
    styleElements.forEach((style: any, index: number) => {
      fragments.push({
        id: `css-${index}`,
        type: 'css',
        content: style.text,
      });
    });
    
    // 提取JavaScript
    const scriptElements = root.querySelectorAll('script');
    scriptElements.forEach((script: any, index: number) => {
      // 忽略src引入的外部脚本
      if (!script.attributes.src) {
        fragments.push({
          id: `js-${index}`,
          type: 'js',
          content: script.text,
        });
      }
    });
    
    return fragments;
  }
  
  // 将拆分的片段重新组合为完整HTML
  static combineFragmentsToHTML(fragments: CodeFragment[]): string {
    // 获取HTML结构
    const htmlStructure = fragments.find(f => f.id === 'html-structure')?.content || '';
    const root = parseHTML(htmlStructure);
    
    // 插入CSS
    const cssFragments = fragments.filter(f => f.type === 'css');
    const styleElements = root.querySelectorAll('style');
    cssFragments.forEach((css, index) => {
      if (index < styleElements.length) {
        styleElements[index].set_content(css.content);
      }
    });
    
    // 插入JavaScript
    const jsFragments = fragments.filter(f => f.type === 'js');
    const scriptElements = root.querySelectorAll('script:not([src])');
    jsFragments.forEach((js, index) => {
      if (index < scriptElements.length) {
        scriptElements[index].set_content(js.content);
      }
    });
    
    return root.toString();
  }
}

// 改进差异计算工具，增加更精确的差异识别功能
export class DiffCalculator {
  // 计算两个代码片段之间的差异
  static calculateDiff(oldCode: string, newCode: string): { 
    additions: string[]; 
    deletions: string[];
    changeRatio: number;
    patches: Array<{start: number; end: number; content: string}>;
  } {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    
    // 简单实现，实际可以使用更复杂的diff算法
    const additions = newLines.filter(line => !oldLines.includes(line));
    const deletions = oldLines.filter(line => !newLines.includes(line));
    
    // 计算变化比例
    const totalLines = Math.max(oldLines.length, newLines.length);
    const changedLines = additions.length + deletions.length;
    const changeRatio = changedLines / totalLines;
    
    // 计算精确的差异补丁（识别变更的具体位置和内容）
    const patches: Array<{start: number; end: number; content: string}> = [];
    
    // 简化版的补丁生成算法
    let i = 0, j = 0;
    let currentPatch: {start: number; end: number; content: string} | null = null;
    
    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        // 相同行，结束当前补丁（如果有）
        if (currentPatch) {
          patches.push(currentPatch);
          currentPatch = null;
        }
        i++;
        j++;
      } else {
        // 找到不同行，开始或继续一个补丁
        if (!currentPatch) {
          currentPatch = {
            start: i,
            end: i,
            content: ''
          };
        }
        
        // 尝试找到下一个匹配点
        let nextMatchI = i;
        let nextMatchJ = j;
        let foundMatch = false;
        
        // 向前搜索最多10行寻找匹配点
        const searchLimit = 10;
        for (let s = 1; s <= searchLimit && !foundMatch; s++) {
          if (i + s < oldLines.length && j < newLines.length && oldLines[i + s] === newLines[j]) {
            // 找到旧代码中往后匹配的点
            nextMatchI = i + s;
            nextMatchJ = j;
            foundMatch = true;
            break;
          }
          
          if (i < oldLines.length && j + s < newLines.length && oldLines[i] === newLines[j + s]) {
            // 找到新代码中往后匹配的点
            nextMatchI = i;
            nextMatchJ = j + s;
            foundMatch = true;
            break;
          }
        }
        
        if (foundMatch) {
          // 找到匹配点，记录变更内容
          if (nextMatchI > i) {
            // 旧代码中有被删除的行
            currentPatch.end = nextMatchI - 1;
          }
          
          // 添加新代码中的行
          if (nextMatchJ > j) {
            currentPatch.content = newLines.slice(j, nextMatchJ).join('\n');
          }
          
          i = nextMatchI;
          j = nextMatchJ;
          
          // 保存当前补丁
          patches.push(currentPatch);
          currentPatch = null;
        } else {
          // 没找到匹配点，移动到下一行继续
          if (i < oldLines.length) i++;
          if (j < newLines.length) {
            if (currentPatch) {
              currentPatch.content += (currentPatch.content ? '\n' : '') + newLines[j];
            }
            j++;
          }
        }
      }
    }
    
    // 保存最后一个未完成的补丁（如果有）
    if (currentPatch) {
      patches.push(currentPatch);
    }
    
    return { additions, deletions, changeRatio, patches };
  }
  
  // 创建更简洁的差异描述，用于提示词生成
  static createDiffDescription(oldCode: string, patchLines: number = 3): string {
    // 按行分割，并添加行号
    const lines = oldCode.split('\n');
    const numberedLines = lines.map((line, idx) => `${idx + 1}: ${line}`);
    
    // 如果代码不太长，直接返回带行号的完整代码
    if (lines.length <= 30) {
      return numberedLines.join('\n');
    }
    
    // 否则，识别可能的关键区域并返回带上下文的节选
    const keyRegions = [
      // HTML关键区域
      /<body[^>]*>/i,
      /<head[^>]*>/i,
      /<main[^>]*>/i,
      /<div[^>]*id=["'](?:app|root|container|main|content)/i,
      
      // CSS关键区域
      /<style[^>]*>/i,
      /\.container/,
      /body\s*{/,
      
      // JS关键区域
      /<script[^>]*>/i,
      /function\s+\w+\s*\(/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /document\.querySelector/,
      /addEventListener/
    ];
    
    const keyLineIndices: number[] = [];
    
    // 查找关键行
    lines.forEach((line, index) => {
      if (keyRegions.some(regex => regex.test(line))) {
        keyLineIndices.push(index);
      }
    });
    
    // 如果没有找到关键行，返回文件的头部和尾部
    if (keyLineIndices.length === 0) {
      const head = numberedLines.slice(0, 15).join('\n');
      const tail = numberedLines.slice(-15).join('\n');
      return `${head}\n...\n${tail}`;
    }
    
    // 扩展关键行的上下文
    const expandedRegions: Array<[number, number]> = [];
    keyLineIndices.forEach(lineIndex => {
      const start = Math.max(0, lineIndex - patchLines);
      const end = Math.min(lines.length - 1, lineIndex + patchLines);
      
      // 检查是否可以合并到之前的区域
      if (expandedRegions.length > 0) {
        const lastRegion = expandedRegions[expandedRegions.length - 1];
        if (start <= lastRegion[1] + 1) {
          // 可以合并
          lastRegion[1] = end;
          return;
        }
      }
      
      // 添加新区域
      expandedRegions.push([start, end]);
    });
    
    // 构建结果
    let result = '';
    expandedRegions.forEach(([start, end], index) => {
      if (index > 0) {
        result += '\n...\n';
      }
      
      result += numberedLines.slice(start, end + 1).join('\n');
    });
    
    return result;
  }
}

// 增加提示词优化器，减少token使用
export class PromptOptimizer {
  // 为差异化更新生成高效提示词
  static generateDiffUpdatePrompt(
    originalPrompt: string,
    fragmentType: 'html' | 'css' | 'js',
    oldContent: string,
    maxContextLength: number = 1500
  ): string {
    // 获取简化的上下文描述
    const contextDescription = DiffCalculator.createDiffDescription(oldContent);
    
    // 根据片段类型和最大上下文长度裁剪上下文
    let trimmedContext = contextDescription;
    if (contextDescription.length > maxContextLength) {
      // 简单裁剪策略
      const halfLength = maxContextLength / 2;
      trimmedContext = 
        contextDescription.substring(0, halfLength) + 
        '\n...[content trimmed]...\n' + 
        contextDescription.substring(contextDescription.length - halfLength);
    }
    
    // 根据片段类型构建专门的提示词
    let promptTemplate = '';
    
    const formatInstructions = `
重要：你必须严格按照以下格式返回代码变更指令，不要返回完整代码：

CHANGE: <行号>-<行号> 替换为:
<新代码>

DELETE: <行号>-<行号>

INSERT AFTER <行号>:
<新代码>

示例格式：
CHANGE: 10-12 替换为:
function newCode() {
  return true;
}

DELETE: 15-18

INSERT AFTER 20:
// 新增代码
`;
    
    switch (fragmentType) {
      case 'css':
        promptTemplate = `你是一位CSS专家，需要根据以下需求修改CSS代码。请只返回变更指令，不要返回完整代码。

${formatInstructions}

用户需求: ${originalPrompt}

当前CSS代码（带行号）:
${trimmedContext}

请只给出具体的变更部分，使用上述指定格式返回。不要添加任何解释，不要使用markdown格式，不要包含任何其他内容。`;
        break;
        
      case 'js':
        promptTemplate = `你是一位JavaScript专家，需要根据以下需求修改JavaScript代码。请只返回变更指令，不要返回完整代码。

${formatInstructions}

用户需求: ${originalPrompt}

当前JavaScript代码（带行号）:
${trimmedContext}

请只给出具体的变更部分，使用上述指定格式返回。不要添加任何解释，不要使用markdown格式，不要包含任何其他内容。`;
        break;
        
      case 'html':
        promptTemplate = `你是一位HTML专家，需要根据以下需求修改HTML结构。请只返回变更指令，不要返回完整代码。

${formatInstructions}

用户需求: ${originalPrompt}

当前HTML代码（带行号）:
${trimmedContext}

请只给出具体的变更部分，使用上述指定格式返回。不要添加任何解释，不要使用markdown格式，不要包含任何其他内容。请保留所有class和id，以确保CSS样式和JavaScript功能正常工作。`;
        break;
    }
    
    return promptTemplate;
  }
  
  // 解析模型返回的差异化更新
  static parseDiffUpdateResponse(response: string, originalCode: string): string {
    // 检查响应是否包含差异化指令
    const hasDiffInstructions = 
      response.includes('CHANGE:') || 
      response.includes('DELETE:') || 
      response.includes('INSERT AFTER');
    
    // 如果没有差异化指令并且响应长度超过原始代码的50%，可能是返回了完整代码
    if (!hasDiffInstructions && response.length > originalCode.length * 0.5) {
      console.log('模型返回了完整代码而非差异指令，自动转换为差异模式');
      
      // 清理响应（移除可能的markdown代码块）
      let cleanResponse = response;
      const codeBlockMatch = response.match(/```(?:\w+)?\s*([\s\S]+?)```/);
      if (codeBlockMatch) {
        cleanResponse = codeBlockMatch[1].trim();
      }
      
      // 计算差异并直接返回新代码
      // 这是简单的解决方案，即当模型不遵循格式时，我们直接使用其输出
      if (cleanResponse !== originalCode) {
        return cleanResponse;
      }
      return originalCode;
    }
    
    // 以下是标准的差异化处理逻辑
    const lines = originalCode.split('\n');
    const result = [...lines];
    
    // 用于存储需要应用的变更，按行号从大到小排序（避免应用更改时的索引问题）
    const changes: Array<{type: 'change' | 'delete' | 'insert', start: number, end: number, content: string}> = [];
    
    // 解析变更指令
    const changeRegex = /CHANGE:\s*(\d+)-(\d+)\s+替换为:\s*([\s\S]*?)(?=(?:CHANGE:|DELETE:|INSERT AFTER|$))/g;
    const deleteRegex = /DELETE:\s*(\d+)-(\d+)/g;
    const insertRegex = /INSERT AFTER\s*(\d+):\s*([\s\S]*?)(?=(?:CHANGE:|DELETE:|INSERT AFTER|$))/g;
    
    // 提取所有变更
    let match;
    
    // 处理替换
    while ((match = changeRegex.exec(response)) !== null) {
      const startLine = parseInt(match[1], 10);
      const endLine = parseInt(match[2], 10);
      const newContent = match[3].trim();
      
      changes.push({
        type: 'change',
        start: startLine - 1, // 转为0-based索引
        end: endLine - 1,
        content: newContent
      });
    }
    
    // 处理删除
    while ((match = deleteRegex.exec(response)) !== null) {
      const startLine = parseInt(match[1], 10);
      const endLine = parseInt(match[2], 10);
      
      changes.push({
        type: 'delete',
        start: startLine - 1,
        end: endLine - 1,
        content: ''
      });
    }
    
    // 处理插入
    while ((match = insertRegex.exec(response)) !== null) {
      const line = parseInt(match[1], 10);
      const newContent = match[2].trim();
      
      changes.push({
        type: 'insert',
        start: line - 1,
        end: line - 1,
        content: newContent
      });
    }
    
    // 如果找不到任何变更，返回原始代码
    if (changes.length === 0) {
      return originalCode;
    }
    
    // 按行号从大到小排序变更
    changes.sort((a, b) => b.start - a.start);
    
    // 应用变更
    for (const change of changes) {
      switch (change.type) {
        case 'change':
          // 替换指定行范围
          const newLines = change.content.split('\n');
          result.splice(change.start, change.end - change.start + 1, ...newLines);
          break;
          
        case 'delete':
          // 删除指定行范围
          result.splice(change.start, change.end - change.start + 1);
          break;
          
        case 'insert':
          // 在指定行后插入内容
          const insertLines = change.content.split('\n');
          result.splice(change.start + 1, 0, ...insertLines);
          break;
      }
    }
    
    return result.join('\n');
  }
}

// 修改IncrementalCodeGenerator类，使用优化的提示词
export class IncrementalCodeGenerator {
  // 通过分析用户的修改请求，确定需要更新的代码片段
  static analyzeModificationRequest(
    modificationPrompt: string,
    currentFragments: CodeFragment[]
  ): { targetFragmentIds: string[]; prompt: string } {
    // 简单分析关键词确定目标片段
    const targetFragmentIds: string[] = [];
    
    if (/css|style|design|appearance|look|color|layout/i.test(modificationPrompt)) {
      targetFragmentIds.push(...currentFragments.filter(f => f.type === 'css').map(f => f.id));
    }
    
    if (/javascript|js|function|behavior|interactive|event/i.test(modificationPrompt)) {
      targetFragmentIds.push(...currentFragments.filter(f => f.type === 'js').map(f => f.id));
    }
    
    if (/html|structure|content|text|image|button|form/i.test(modificationPrompt)) {
      targetFragmentIds.push('html-structure');
    }
    
    // 如果没有特定目标，则默认修改所有片段
    if (targetFragmentIds.length === 0) {
      targetFragmentIds.push(...currentFragments.map(f => f.id));
    }
    
    return { targetFragmentIds, prompt: modificationPrompt };
  }
  
  // 生成专门针对指定片段的修改提示（使用差异化更新提示词）
  static generateFragmentUpdatePrompt(
    originalPrompt: string,
    targetFragment: CodeFragment,
    allFragments: CodeFragment[],
    useDiffUpdates: boolean = true
  ): string {
    // 使用差异化更新提示词
    if (useDiffUpdates) {
      return PromptOptimizer.generateDiffUpdatePrompt(
        originalPrompt,
        targetFragment.type,
        targetFragment.content
      );
    }
    
    // 否则使用原来的方法
    const contextInfo = allFragments
      .filter(f => f.id !== targetFragment.id)
      .map(f => `${f.type.toUpperCase()} (id: ${f.id}):\n${f.content.substring(0, 200)}${f.content.length > 200 ? '...' : ''}`)
      .join('\n\n');
    
    let promptTemplate = '';
    
    switch (targetFragment.type) {
      case 'css':
        promptTemplate = `根据以下要求，只修改CSS样式，不要改变HTML结构和JavaScript功能。
用户需求: ${originalPrompt}

当前CSS内容:
${targetFragment.content}

其他代码上下文信息（仅供参考，不要修改）:
${contextInfo}

请只返回修改后的CSS代码，不要包含任何解释或前缀，不要使用markdown格式。`;
        break;
        
      case 'js':
        promptTemplate = `根据以下要求，只修改JavaScript代码，不要改变HTML结构和CSS样式。
用户需求: ${originalPrompt}

当前JavaScript内容:
${targetFragment.content}

其他代码上下文信息（仅供参考，不要修改）:
${contextInfo}

请只返回修改后的JavaScript代码，不要包含任何解释或前缀，不要使用markdown格式。`;
        break;
        
      case 'html':
        promptTemplate = `根据以下要求，修改HTML结构，保持样式和JavaScript的引用关系。
用户需求: ${originalPrompt}

当前HTML结构:
${targetFragment.content}

其他代码上下文信息（仅供参考，不要修改）:
${contextInfo}

请只返回修改后的HTML代码，不要包含任何解释或前缀，不要使用markdown格式。保持<style>和<script>标签为空，不要填充它们的内容。`;
        break;
    }
    
    return promptTemplate;
  }
  
  // 处理模型响应，根据差异化更新格式应用更改
  static processFragmentUpdateResponse(
    response: string,
    originalFragment: CodeFragment,
    useDiffUpdates: boolean = true
  ): string {
    if (useDiffUpdates) {
      // 解析差异化更新响应并应用到原代码
      return PromptOptimizer.parseDiffUpdateResponse(response, originalFragment.content);
    }
    
    // 如果不使用差异化更新，直接返回响应内容
    return response;
  }
}

// 修改增量更新管理器，支持差异化更新
export class IncrementalUpdateManager {
  private fragments: CodeFragment[] = [];
  private history: Array<{ timestamp: number; fragments: CodeFragment[] }> = [];
  private useDiffUpdates: boolean = true; // 默认启用差异化更新
  
  constructor(initialHTML: string, useDiffUpdates: boolean = true) {
    this.useDiffUpdates = useDiffUpdates;
    this.updateFragments(initialHTML);
  }
  
  // 更新代码片段并保存历史
  private updateFragments(htmlCode: string) {
    this.history.push({
      timestamp: Date.now(),
      fragments: [...this.fragments]
    });
    
    // 限制历史记录数量，避免内存过大
    if (this.history.length > 10) {
      this.history.shift();
    }
    
    this.fragments = CodeParser.parseHTMLToFragments(htmlCode);
  }
  
  // 获取当前完整HTML
  getFullHTML(): string {
    return CodeParser.combineFragmentsToHTML(this.fragments);
  }
  
  // 获取所有片段
  getAllFragments(): CodeFragment[] {
    return [...this.fragments];
  }
  
  // 获取特定片段
  getFragment(id: string): CodeFragment | undefined {
    return this.fragments.find(f => f.id === id);
  }
  
  // 更新特定片段
  updateFragment(id: string, newContent: string): void {
    const fragmentIndex = this.fragments.findIndex(f => f.id === id);
    if (fragmentIndex >= 0) {
      // 保存更新前的状态
      this.history.push({
        timestamp: Date.now(),
        fragments: [...this.fragments]
      });
      
      // 更新片段
      this.fragments[fragmentIndex] = {
        ...this.fragments[fragmentIndex],
        content: newContent
      };
    }
  }
  
  // 处理模型生成的片段更新
  processFragmentUpdate(id: string, response: string): string {
    const fragment = this.getFragment(id);
    if (!fragment) return response;
    
    // 使用差异化处理
    if (this.useDiffUpdates) {
      const updatedContent = IncrementalCodeGenerator.processFragmentUpdateResponse(
        response,
        fragment,
        this.useDiffUpdates
      );
      
      // 更新片段
      this.updateFragment(id, updatedContent);
      return updatedContent;
    }
    
    // 否则直接使用响应作为新内容
    this.updateFragment(id, response);
    return response;
  }
  
  // 撤销到上一个状态
  undo(): boolean {
    if (this.history.length > 0) {
      const previousState = this.history.pop();
      if (previousState) {
        this.fragments = previousState.fragments;
        return true;
      }
    }
    return false;
  }
  
  // 根据用户修改请求生成更新提示
  generateUpdatePrompts(modificationPrompt: string): Array<{ fragmentId: string; prompt: string }> {
    const { targetFragmentIds } = IncrementalCodeGenerator.analyzeModificationRequest(
      modificationPrompt,
      this.fragments
    );
    
    return targetFragmentIds.map(id => {
      const fragment = this.getFragment(id);
      if (!fragment) return { fragmentId: id, prompt: '' };
      
      const prompt = IncrementalCodeGenerator.generateFragmentUpdatePrompt(
        modificationPrompt,
        fragment,
        this.fragments,
        this.useDiffUpdates
      );
      
      return { fragmentId: id, prompt };
    });
  }
  
  // 应用片段更新并返回完整的HTML
  applyFragmentUpdate(fragmentId: string, newContent: string): string {
    this.updateFragment(fragmentId, newContent);
    return this.getFullHTML();
  }
  
  // 设置是否使用差异化更新
  setUseDiffUpdates(value: boolean): void {
    this.useDiffUpdates = value;
  }
} 