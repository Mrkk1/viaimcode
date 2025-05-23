"use client"

import { useEffect, useRef, useState } from 'react';

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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const prevBlobUrl = useRef<string | null>(null);

  useEffect(() => {
    // 生成 Blob URL
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);

    // 释放上一个 blobUrl
    if (prevBlobUrl.current) {
      URL.revokeObjectURL(prevBlobUrl.current);
    }
    prevBlobUrl.current = url;

    // 卸载时释放 blobUrl
    return () => {
      if (prevBlobUrl.current) {
        URL.revokeObjectURL(prevBlobUrl.current);
        prevBlobUrl.current = null;
    }
    };
  }, [htmlContent]);

  // --- 保留原有Vue相关逻辑（备用） ---
  // useEffect(() => {
  //   // 清理之前的游戏状态
  //   const cleanupGame = () => {
  //     if (window.gameVariables) {
  //       Object.keys(window.gameVariables).forEach(key => {
  //         delete window.gameVariables[key];
  //       });
  //     }
  //     document.removeEventListener('keydown', window.gameVariables?.keyDown);
  //     const container = document.getElementById('game-container');
  //     if (container) {
  //       container.innerHTML = '';
  //     }
  //   };
  //   if (!window.gameVariables) {
  //     window.gameVariables = {};
  //   }
  //   const initGame = () => {
  //     cleanupGame();
  //     const container = document.getElementById('game-container');
  //     if (container) {
  //       container.innerHTML = htmlContent;
  //       const scripts = container.getElementsByTagName('script');
  //       const scriptsArray = Array.from(scripts);
  //       const executeScript = (scriptContent: string) => {
  //         try {
  //           const scriptFunction = new Function('gameVariables', `with (gameVariables) {${scriptContent}}`);
  //           scriptFunction(window.gameVariables);
  //         } catch (error) {
  //           console.error('Error executing script:', error);
  //         }
  //       };
  //       scriptsArray.forEach(oldScript => {
  //         if (oldScript.src && (
  //           oldScript.src.includes('vue.js') || 
  //           oldScript.src.includes('vue.min.js') ||
  //           oldScript.src.includes('vue.global.js') ||
  //           oldScript.src.includes('vue.global.prod.js')
  //         )) {
  //           return;
  //         }
  //         if (oldScript.text) {
  //           executeScript(oldScript.text);
  //         } else if (oldScript.src) {
  //           const newScript = document.createElement('script');
  //           Array.from(oldScript.attributes).forEach(attr => {
  //             newScript.setAttribute(attr.name, attr.value);
  //           });
  //           oldScript.parentNode?.replaceChild(newScript, oldScript);
  //         }
  //       });
  //     }
  //   };
  //   if (typeof window.Vue !== 'undefined') {
  //     initGame();
  //   } else {
  //     const vueScript = document.createElement('script');
  //     vueScript.src = 'https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.min.js';
  //     vueScript.onload = initGame;
  //     document.head.appendChild(vueScript);
  //   }
  //   return cleanupGame;
  // }, [htmlContent]);

  return (
    <div id="game-container" className="min-h-screen w-full flex justify-center items-start bg-black">
      {blobUrl && (
        <iframe
          src={blobUrl}
          style={{ width: '100vw', height: '100vh', border: 'none', background: 'black', display: 'block' }}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          title="Shared Game"
    />
      )}
    </div>
  );
} 