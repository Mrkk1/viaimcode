"use client"

import { useEffect } from 'react';
import Script from 'next/script';

// 为 window 添加 Vue 类型
declare global {
  interface Window {
    Vue: any;
    gameVariables: {
      [key: string]: any;
    };
  }
}

export default function ClientGame({ htmlContent }: { htmlContent: string }) {
  useEffect(() => {
    // 清理之前的游戏状态
    const cleanupGame = () => {
      // 清理之前定义的变量
      if (window.gameVariables) {
        Object.keys(window.gameVariables).forEach(key => {
          delete window.gameVariables[key];
        });
      }
      
      // 移除之前的事件监听器
      document.removeEventListener('keydown', window.gameVariables?.keyDown);
      
      // 清理canvas和其他DOM元素
      const container = document.getElementById('game-container');
      if (container) {
        container.innerHTML = '';
      }
    };

    // 初始化游戏变量存储
    if (!window.gameVariables) {
      window.gameVariables = {};
    }

    // 确保Vue加载完成后再初始化游戏
    const initGame = () => {
      // 先清理之前的游戏状态
      cleanupGame();

      const container = document.getElementById('game-container');
      if (container) {
        container.innerHTML = htmlContent;

        // 分离Vue和其他脚本
        const scripts = container.getElementsByTagName('script');
        const scriptsArray = Array.from(scripts);
        
        // 创建一个新的作用域来执行脚本
        const executeScript = (scriptContent: string) => {
          try {
            // 使用 Function 构造器创建一个新的作用域
            const scriptFunction = new Function('gameVariables', `
              with (gameVariables) {
                ${scriptContent}
              }
            `);
            scriptFunction(window.gameVariables);
          } catch (error) {
            console.error('Error executing script:', error);
          }
        };

        // 先执行非Vue脚本
        scriptsArray.forEach(oldScript => {
          // 跳过Vue相关的脚本
          if (oldScript.src && (
            oldScript.src.includes('vue.js') || 
            oldScript.src.includes('vue.min.js') ||
            oldScript.src.includes('vue.global.js') ||
            oldScript.src.includes('vue.global.prod.js')
          )) {
            return;
          }

          if (oldScript.text) {
            executeScript(oldScript.text);
          } else if (oldScript.src) {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => {
              newScript.setAttribute(attr.name, attr.value);
            });
            oldScript.parentNode?.replaceChild(newScript, oldScript);
          }
        });
      }
    };

    // 检查Vue是否已加载
    if (typeof window.Vue !== 'undefined') {
      initGame();
    } else {
      // 如果Vue未加载，添加Vue脚本
      const vueScript = document.createElement('script');
      vueScript.src = 'https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.min.js';
      vueScript.onload = initGame;
      document.head.appendChild(vueScript);
    }

    // 组件卸载时的清理函数
    return cleanupGame;
  }, [htmlContent]);

  return (
    <div 
      id="game-container"
      className="min-h-screen w-full"
    />
  );
} 