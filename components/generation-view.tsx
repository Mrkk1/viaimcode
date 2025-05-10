"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
import { debounce } from "lodash"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
// Import only the icons that are actually used
import { Laptop, Smartphone, Tablet, Copy, Download, RefreshCw, Loader2, Save, ArrowRight } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { ThinkingIndicator } from "@/components/thinking-indicator"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { CodeEditor } from "@/components/code-editor"
import { WorkSteps } from "@/components/work-steps"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"

interface GenerationViewProps {
  prompt: string
  setPrompt: (value: string) => void
  model: string
  provider?: string
  generatedCode: string
  isGenerating: boolean
  generationComplete: boolean
  onRegenerateWithNewPrompt: (newPrompt: string) => void
  thinkingOutput?: string
  isThinking?: boolean
}

export function GenerationView({
  prompt,
  setPrompt,
  model,
  provider = 'deepseek',
  generatedCode,
  isGenerating,
  generationComplete,
  onRegenerateWithNewPrompt,
  thinkingOutput = "",
  isThinking = false
}: GenerationViewProps) {
  const [viewportSize, setViewportSize] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [copySuccess, setCopySuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code")
  const [isEditable, setIsEditable] = useState(false)
  const [editedCode, setEditedCode] = useState(generatedCode)
  const [originalCode, setOriginalCode] = useState(generatedCode) // Stores the original code
  const [hasChanges, setHasChanges] = useState(false) // Tracks if changes have been made
  const [previewKey, setPreviewKey] = useState(0) // For manually refreshing the preview
  const [previewContent, setPreviewContent] = useState("") // For debounced preview content
  const [showSaveDialog, setShowSaveDialog] = useState(false) // For the save dialog
  const [newPrompt, setNewPrompt] = useState("") // Für das neue Prompt-Eingabefeld

  // Previous preview content for transition effect
  const prevContentRef = useRef<string>("");

  // Function to prepare HTML content with dark mode styles
  const prepareHtmlContent = (code: string): string => {
    // Add a dark mode default style to the preview content
    const darkModeStyle = `
      <style>
        :root {
          color-scheme: dark;
        }
        html, body {
          background-color: #121212;
          color: #ffffff;
          min-height: 100%;
        }
        body {
          margin: 0;
          padding: 0;
        }
        /* Smooth transition for body background */
        body {
          transition: background-color 0.2s ease;
        }
      </style>
    `;

    let result = "";

    // Check if the code already has a <head> tag
    if (code.includes('<head>')) {
      // Insert the dark mode style into the head
      result = code.replace('<head>', `<head>${darkModeStyle}`);
    } else if (code.includes('<html>')) {
      // Create a head tag if there's an html tag but no head
      result = code.replace('<html>', `<html><head>${darkModeStyle}</head>`);
    } else {
      // Wrap the entire content with proper HTML structure
      result = `
        <!DOCTYPE html>
        <html>
          <head>
            ${darkModeStyle}
          </head>
          <body>
            ${code}
          </body>
        </html>
      `;
    }

    return result;
  };

  // Debounced function for updating preview content
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdatePreview = useCallback(
    debounce((code: string) => {
      const preparedHtml = prepareHtmlContent(code);
      prevContentRef.current = preparedHtml;
      setPreviewContent(preparedHtml);
    }, 50), // Very short debounce for live updates, but enough to prevent excessive re-renders
    []
  );

  // Update editedCode and originalCode when generatedCode changes
  useEffect(() => {
    setEditedCode(generatedCode)
    setOriginalCode(generatedCode)
    setHasChanges(false)

    // Update preview content with debounce
    if (generatedCode) {
      debouncedUpdatePreview(generatedCode);
    }
  }, [generatedCode, debouncedUpdatePreview])

  // Check if changes have been made and update preview content
  useEffect(() => {
    if (editedCode !== originalCode) {
      setHasChanges(true)
    } else {
      setHasChanges(false)
    }

    // Update preview content with debounce when code is edited
    if (editedCode) {
      debouncedUpdatePreview(editedCode);
    }
  }, [editedCode, originalCode, debouncedUpdatePreview])

  // Function to save changes
  const saveChanges = () => {
    setOriginalCode(editedCode)
    setHasChanges(false)
  }

  // Function to copy the generated code to clipboard
  const copyToClipboard = () => {
    // Copy the current code (either edited or original)
    const currentCode = isEditable ? editedCode : originalCode
    navigator.clipboard.writeText(currentCode)
      .then(() => {
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      })
      .catch(err => {
        console.error('Error copying:', err)
      })
  }

  // Function to manually refresh the preview
  const refreshPreview = () => {
    // Update the current content
    const currentCode = isEditable ? editedCode : originalCode;

    // Force immediate update by flushing the debounce queue
    debouncedUpdatePreview.flush();

    // Prepare the HTML content
    const preparedHtml = prepareHtmlContent(currentCode);
    setPreviewContent(preparedHtml);

    // Change the key to reload the preview
    setPreviewKey(prevKey => prevKey + 1);
  }

  // Function to download the generated code as an HTML file
  const downloadCode = () => {
    const currentCode = isEditable ? editedCode : originalCode
    const element = document.createElement("a")
    const file = new Blob([currentCode], {type: 'text/html'})
    element.href = URL.createObjectURL(file)
    element.download = "generated-website.html"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  // Function to handle sending a new prompt
  const handleSendNewPrompt = () => {
    if (!newPrompt.trim() || isGenerating) return
    onRegenerateWithNewPrompt(newPrompt)
    setNewPrompt("") // Reset input field
  }



  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Header - Kompakter gestaltet */}
      <header className="border-b border-gray-800 py-2 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white">
              {provider === 'deepseek' ? 'DEEPSEEK' :
               provider === 'openai_compatible' ? 'CUSTOM API' :
               provider === 'ollama' ? 'OLLAMA' :
               provider === 'lm_studio' ? 'LM STUDIO' : 'AI'}
            </h1>
            <Badge variant="outline" className="bg-gray-900 text-white border-white">
              {model}
            </Badge>
            {thinkingOutput && (
              <div className="ml-2">
                <ThinkingIndicator
                  thinkingOutput={thinkingOutput}
                  isThinking={isThinking}
                  position="top-left"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 h-8"
              disabled={isGenerating}
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Restart</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 h-8"
              disabled={!generatedCode || isGenerating}
              onClick={downloadCode}
            >
              <Download className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Tab-Navigation */}
      <div className="md:hidden flex border-b border-gray-800 bg-gray-900/50">
        <button
          className={`flex-1 py-2 text-sm font-medium ${
            activeTab === "code" ? "text-white border-b-2 border-white" : "text-gray-400"
          }`}
          onClick={() => setActiveTab("code")}
        >
          CODE
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium ${
            activeTab === "preview" ? "text-white border-b-2 border-white" : "text-gray-400"
          }`}
          onClick={() => setActiveTab("preview")}
        >
          PREVIEW
        </button>
      </div>

      {/* Hauptinhalt - Flexibler und responsiver mit Resizable Panels */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile View - Entweder Code oder Preview basierend auf activeTab */}
        <div className="md:hidden w-full flex flex-col">
          {activeTab === "code" ? (
            <>
              {/* Code-Editor-Bereich */}
              <div className="h-[65%] border-b border-gray-800 flex flex-col">
                <div className="flex items-center justify-between p-2 border-b border-gray-800 bg-gray-900/50">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-medium">GENERATED HTML</h2>
                    {generationComplete && (
                      <div className="ml-3 flex items-center space-x-2">
                        <span className="text-xs text-gray-400">
                          {isEditable ? 'Edit' : 'Read Only'}
                        </span>
                        <Switch
                          checked={isEditable}
                          onCheckedChange={(checked) => {
                            if (!checked && hasChanges) {
                              setShowSaveDialog(true);
                            } else {
                              setIsEditable(checked);
                            }
                          }}
                          disabled={isGenerating}
                          className="data-[state=checked]:bg-blue-600"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditable && hasChanges && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-green-500 hover:text-green-400 hover:bg-green-900/20"
                        onClick={saveChanges}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-gray-400 hover:text-white"
                      onClick={copyToClipboard}
                      disabled={!generatedCode || isGenerating}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      {copySuccess ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {isGenerating && !generatedCode ? (
                    <div className="h-full w-full flex items-center justify-center bg-gray-950">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 mb-4 mx-auto animate-spin text-white" />
                        <p className="text-gray-400">Generating code...</p>
                      </div>
                    </div>
                  ) : (
                    <CodeEditor
                      code={isEditable ? editedCode : originalCode}
                      isEditable={isEditable && generationComplete}
                      onChange={(newCode) => setEditedCode(newCode)}
                    />
                  )}
                </div>
              </div>

              {/* Prompt und Work Steps Bereich */}
              <div className="h-[35%] p-3 flex flex-col overflow-hidden">
                <div className="mb-2 flex-shrink-0">
                  <h3 className="text-xs font-medium text-gray-400 mb-1">NEW PROMPT</h3>
                  <div className="relative">
                    <Textarea
                      value={newPrompt}
                      onChange={(e) => setNewPrompt(e.target.value)}
                      placeholder="Enter a new prompt..."
                      className="min-h-[60px] w-full rounded-md border border-gray-800 bg-gray-900/50 p-2 pr-10 text-sm text-gray-300 focus:border-white focus:ring-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendNewPrompt()
                        }
                      }}
                      disabled={isGenerating}
                    />
                    <Button
                      size="sm"
                      className={`absolute bottom-2 right-2 h-6 w-6 p-0 ${newPrompt.trim() ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                      onClick={handleSendNewPrompt}
                      disabled={!newPrompt.trim() || isGenerating}
                    >
                      <ArrowRight className={`h-3 w-3 ${newPrompt.trim() ? 'text-white' : 'text-gray-400'}`} />
                      <span className="sr-only">Send</span>
                    </Button>
                  </div>
                  {prompt && (
                    <div className="mt-2">
                      <h4 className="text-xs font-medium text-gray-400">PREVIOUS PROMPT:</h4>
                      <ScrollArea className="h-12 w-full rounded-md border border-gray-800 bg-gray-900/30 p-2 mt-1">
                        <p className="text-xs text-gray-400">{prompt}</p>
                      </ScrollArea>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-hidden">
                  <h3 className="text-xs font-medium text-gray-400 mb-1">AI WORK STEPS</h3>
                  <div className="h-[calc(100%-20px)] overflow-hidden">
                    <WorkSteps
                      isGenerating={isGenerating}
                      generationComplete={generationComplete}
                      generatedCode={isEditable ? editedCode : generatedCode}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Live Preview für Mobile */}
              <div className="p-2 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
                <h2 className="text-sm font-medium">LIVE PREVIEW</h2>
                <div className="flex items-center gap-1">
                  {generationComplete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 mr-2 text-gray-400 hover:text-white"
                      onClick={refreshPreview}
                      title="Refresh preview"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      <span className="text-xs hidden sm:inline">Refresh</span>
                    </Button>
                  )}
                  <Button
                    variant={viewportSize === "desktop" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setViewportSize("desktop")}
                  >
                    <Laptop className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewportSize === "tablet" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setViewportSize("tablet")}
                  >
                    <Tablet className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewportSize === "mobile" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setViewportSize("mobile")}
                  >
                    <Smartphone className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 p-3 flex items-center justify-center overflow-hidden">
                <div
                  className={`bg-gray-900 rounded-md border border-gray-800 overflow-hidden transition-all duration-300 ${
                    viewportSize === "desktop"
                      ? "w-full h-full"
                      : viewportSize === "tablet"
                        ? "w-[768px] max-h-full"
                        : "w-[375px] max-h-full"
                  }`}
                >
                  {!originalCode && !editedCode ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-400">
                      {isGenerating ? (
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 mb-2 mx-auto animate-spin" />
                          <p>Generating preview...</p>
                        </div>
                      ) : (
                        <p>No preview available yet</p>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full relative">
                      <iframe
                        key={previewKey}
                        srcDoc={previewContent}
                        className="w-full h-full absolute inset-0 z-10"
                        title="Preview"
                        sandbox="allow-scripts"
                        style={{
                          backgroundColor: '#121212',
                          opacity: 1,
                          transition: 'opacity 0.15s ease-in-out'
                        }}
                      />
                      {/* Loading indicator that shows only during generation */}
                      {isGenerating && (
                        <div className="absolute bottom-4 right-4 z-20 bg-gray-800/80 text-white px-3 py-1 rounded-full text-xs flex items-center">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Updating preview...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Desktop View - Resizable Panels */}
        <div className="hidden md:block w-full h-full">
          <ResizablePanelGroup
            direction="horizontal"
            className="w-full h-full"
          >
            {/* Linke Spalte - Code-Editor und Steuerelemente */}
            <ResizablePanel defaultSize={65} minSize={30}>
              <div className="h-full flex flex-col border-r border-gray-800">
                {/* Code-Editor-Bereich */}
                <div className="h-[65%] border-b border-gray-800 flex flex-col">
                  <div className="flex items-center justify-between p-2 border-b border-gray-800 bg-gray-900/50">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-medium">GENERATED HTML</h2>
                      {generationComplete && (
                        <div className="ml-3 flex items-center space-x-2">
                          <span className="text-xs text-gray-400">
                            {isEditable ? 'Edit' : 'Read Only'}
                          </span>
                          <Switch
                            checked={isEditable}
                            onCheckedChange={(checked) => {
                              if (!checked && hasChanges) {
                                setShowSaveDialog(true);
                              } else {
                                setIsEditable(checked);
                              }
                            }}
                            disabled={isGenerating}
                            className="data-[state=checked]:bg-blue-600"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditable && hasChanges && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-green-500 hover:text-green-400 hover:bg-green-900/20"
                          onClick={saveChanges}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-gray-400 hover:text-white"
                        onClick={copyToClipboard}
                        disabled={!generatedCode || isGenerating}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        {copySuccess ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {isGenerating && !generatedCode ? (
                      <div className="h-full w-full flex items-center justify-center bg-gray-950">
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 mb-4 mx-auto animate-spin text-white" />
                          <p className="text-gray-400">Generating code...</p>
                        </div>
                      </div>
                    ) : (
                      <CodeEditor
                        code={isEditable ? editedCode : originalCode}
                        isEditable={isEditable && generationComplete}
                        onChange={(newCode) => setEditedCode(newCode)}
                      />
                    )}
                  </div>
                </div>

                {/* Prompt und Work Steps Bereich */}
                <div className="h-[35%] p-3 flex flex-col overflow-hidden">
                  <div className="mb-2 flex-shrink-0">
                    <h3 className="text-xs font-medium text-gray-400 mb-1">NEW PROMPT</h3>
                    <div className="relative">
                      <Textarea
                        value={newPrompt}
                        onChange={(e) => setNewPrompt(e.target.value)}
                        placeholder="Enter a new prompt..."
                        className="min-h-[60px] w-full rounded-md border border-gray-800 bg-gray-900/50 p-2 pr-10 text-sm text-gray-300 focus:border-white focus:ring-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendNewPrompt()
                          }
                        }}
                        disabled={isGenerating}
                      />
                      <Button
                        size="sm"
                        className={`absolute bottom-2 right-2 h-6 w-6 p-0 ${newPrompt.trim() ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                        onClick={handleSendNewPrompt}
                        disabled={!newPrompt.trim() || isGenerating}
                      >
                        <ArrowRight className={`h-3 w-3 ${newPrompt.trim() ? 'text-white' : 'text-gray-400'}`} />
                        <span className="sr-only">Send</span>
                      </Button>
                    </div>
                    {prompt && (
                      <div className="mt-2">
                        <h4 className="text-xs font-medium text-gray-400">PREVIOUS PROMPT:</h4>
                        <ScrollArea className="h-12 w-full rounded-md border border-gray-800 bg-gray-900/30 p-2 mt-1">
                          <p className="text-xs text-gray-400">{prompt}</p>
                        </ScrollArea>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <h3 className="text-xs font-medium text-gray-400 mb-1">AI WORK STEPS</h3>
                    <div className="h-[calc(100%-20px)] overflow-hidden">
                      <WorkSteps
                        isGenerating={isGenerating}
                        generationComplete={generationComplete}
                        generatedCode={isEditable ? editedCode : generatedCode}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ResizablePanel>

            {/* Resizable Handle */}
            <ResizableHandle withHandle className="bg-gray-800 hover:bg-gray-700" />

            {/* Rechte Spalte - Live-Vorschau */}
            <ResizablePanel defaultSize={35} minSize={25}>
              <div className="h-full flex flex-col">
                <div className="p-2 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
                  <h2 className="text-sm font-medium">LIVE PREVIEW</h2>
                  <div className="flex items-center gap-1">
                    {generationComplete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 mr-2 text-gray-400 hover:text-white"
                        onClick={refreshPreview}
                        title="Refresh preview"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        <span className="text-xs hidden sm:inline">Refresh</span>
                      </Button>
                    )}
                    <Button
                      variant={viewportSize === "desktop" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setViewportSize("desktop")}
                    >
                      <Laptop className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewportSize === "tablet" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setViewportSize("tablet")}
                    >
                      <Tablet className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewportSize === "mobile" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setViewportSize("mobile")}
                    >
                      <Smartphone className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 p-3 flex items-center justify-center overflow-hidden">
                  <div
                    className={`bg-gray-900 rounded-md border border-gray-800 overflow-hidden transition-all duration-300 ${
                      viewportSize === "desktop"
                        ? "w-full h-full"
                        : viewportSize === "tablet"
                          ? "w-[768px] max-h-full"
                          : "w-[375px] max-h-full"
                    }`}
                  >
                    {!originalCode && !editedCode ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-400">
                        {isGenerating ? (
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 mb-2 mx-auto animate-spin" />
                            <p>Generating preview...</p>
                          </div>
                        ) : (
                          <p>No preview available yet</p>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-full relative">
                        <iframe
                          key={previewKey}
                          srcDoc={previewContent}
                          className="w-full h-full absolute inset-0 z-10"
                          title="Preview"
                          sandbox="allow-scripts"
                          style={{
                            backgroundColor: '#121212',
                            opacity: 1,
                            transition: 'opacity 0.15s ease-in-out'
                          }}
                        />
                        {/* Loading indicator that shows only during generation */}
                        {isGenerating && (
                          <div className="absolute bottom-4 right-4 z-20 bg-gray-800/80 text-white px-3 py-1 rounded-full text-xs flex items-center">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Updating preview...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      {/* Speichern-Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Save changes?</DialogTitle>
            <DialogDescription className="text-gray-400">
              Do you want to save your changes before switching to read-only mode?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                // If not saving, reset the edited code to the original code
                setEditedCode(originalCode);
                setIsEditable(false);
                setShowSaveDialog(false);
              }}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Don't save
            </Button>
            <Button
              onClick={() => {
                // Save the changes
                saveChanges();
                setIsEditable(false);
                setShowSaveDialog(false);
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
