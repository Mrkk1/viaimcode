"use client"

import { useEffect, useRef, useState } from "react"
import Editor from "@monaco-editor/react"

interface CodeEditorProps {
  code: string;
  isEditable?: boolean;
  onChange?: (value: string) => void;
}

export function CodeEditor({ code, isEditable = false, onChange }: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const [isInitialMount, setIsInitialMount] = useState(true);
  const [isUserEditing, setIsUserEditing] = useState(false);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    console.log('Monaco Editor mounted:', !!editor);

    // Only scroll to the end on initial load
    if (isInitialMount) {
      editor.revealLine(editor.getModel().getLineCount());
      setIsInitialMount(false);
    }

    // Add event listener for user interactions
    editor.onDidChangeCursorPosition(() => {
      if (isEditable) {
        setIsUserEditing(true);
      }
    });
  };

  // 使用useEffect来处理跳转事件监听，确保编辑器实例可用
  useEffect(() => {
    const handleJumpToLine = (event: CustomEvent) => {
      console.log('收到跳转事件:', event.detail);
      const { lineNumber } = event.detail;
      
      if (lineNumber && editorRef.current) {
        const editor = editorRef.current;
        console.log('准备跳转到行:', lineNumber, '编辑器实例:', !!editor);
        
        try {
          // 确保行号在有效范围内
          const model = editor.getModel();
          const totalLines = model.getLineCount();
          const targetLine = Math.min(Math.max(1, lineNumber), totalLines);
          
          console.log('目标行:', targetLine, '总行数:', totalLines);
          
          // 跳转到指定行并居中显示
          editor.revealLineInCenter(targetLine);
          
          // 设置光标位置
          editor.setPosition({ lineNumber: targetLine, column: 1 });
          
          // 选中整行
          const lineMaxColumn = model.getLineMaxColumn(targetLine);
          editor.setSelection({
            startLineNumber: targetLine,
            startColumn: 1,
            endLineNumber: targetLine,
            endColumn: lineMaxColumn
          });
          
          // 聚焦编辑器
          editor.focus();
          
          console.log('跳转完成，行:', targetLine, '列范围: 1 -', lineMaxColumn);
        } catch (error) {
          console.error('跳转到行时出错:', error);
        }
      } else {
        console.warn('跳转失败 - 缺少参数:', { lineNumber, hasEditor: !!editorRef.current });
      }
    };

    // 添加事件监听器
    window.addEventListener('jumpToLine', handleJumpToLine as EventListener);
    console.log('已添加jumpToLine事件监听器');

    // 清理函数
    return () => {
      window.removeEventListener('jumpToLine', handleJumpToLine as EventListener);
      console.log('已移除jumpToLine事件监听器');
    };
  }, []); // 空依赖数组，只在组件挂载和卸载时执行

  const handleEditorChange = (value: string | undefined) => {
    if (onChange && value !== undefined) {
      onChange(value);
    }
  };

  useEffect(() => {
    if (editorRef.current) {
      // Only scroll to the end if the user is not actively editing
      // or if the editor is not in edit mode
      if (!isUserEditing && !isEditable) {
        editorRef.current.revealLine(editorRef.current.getModel().getLineCount());
      }
    }
  }, [code, isUserEditing, isEditable]);

  // Reset the isUserEditing status when edit mode is disabled
  useEffect(() => {
    if (!isEditable) {
      setIsUserEditing(false);
    }
  }, [isEditable]);

  return (
    <div className="h-full w-full overflow-hidden">
      <Editor
        height="100%"
        language="html"
        theme="vs-dark"
        value={code}
        options={{
          readOnly: !isEditable,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          wordWrap: "on",
          automaticLayout: true, // Automatically adjusts the size
        }}
        onMount={handleEditorDidMount}
        onChange={handleEditorChange}
      />
    </div>
  )
}
