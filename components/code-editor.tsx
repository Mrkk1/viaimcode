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

    // Nur beim ersten Laden zum Ende scrollen
    if (isInitialMount) {
      editor.revealLine(editor.getModel().getLineCount());
      setIsInitialMount(false);
    }

    // Event-Listener für Benutzerinteraktionen hinzufügen
    editor.onDidChangeCursorPosition(() => {
      if (isEditable) {
        setIsUserEditing(true);
      }
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    if (onChange && value !== undefined) {
      onChange(value);
    }
  };

  useEffect(() => {
    if (editorRef.current) {
      // Nur zum Ende scrollen, wenn der Benutzer nicht aktiv bearbeitet
      // oder wenn der Editor nicht im Bearbeitungsmodus ist
      if (!isUserEditing && !isEditable) {
        editorRef.current.revealLine(editorRef.current.getModel().getLineCount());
      }
    }
  }, [code, isUserEditing, isEditable]);

  // Zurücksetzen des isUserEditing-Status, wenn der Bearbeitungsmodus deaktiviert wird
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
          automaticLayout: true, // Passt die Größe automatisch an
        }}
        onMount={handleEditorDidMount}
        onChange={handleEditorChange}
      />
    </div>
  )
}
