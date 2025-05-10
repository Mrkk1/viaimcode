"use client"

import { useState, useEffect } from "react"
// Import only the icons that are actually used
import { CheckCircle, Circle, Loader2 } from "lucide-react"

interface WorkStepsProps {
  isGenerating: boolean
  generationComplete: boolean
  generatedCode?: string
}

interface Step {
  id: string
  label: string
  detector: (code: string) => boolean
  completed: boolean
}

export function WorkSteps({ isGenerating, generationComplete, generatedCode = "" }: WorkStepsProps) {
  const [steps, setSteps] = useState<Step[]>([
    {
      id: "init",
      label: "Initializing model...",
      detector: () => true, // Always completed as soon as code is generated
      completed: false
    },
    {
      id: "html_structure",
      label: "Generating HTML structure...",
      detector: (code) => code.includes("<html") || code.includes("<body") || code.includes("<head"),
      completed: false
    },
    {
      id: "content",
      label: "Adding content...",
      detector: (code) =>
        code.includes("<div") ||
        code.includes("<p") ||
        code.includes("<h1") ||
        code.includes("<span") ||
        code.includes("<img") ||
        code.includes("<ul") ||
        code.includes("<section"),
      completed: false
    },
    {
      id: "styles",
      label: "Adding styles...",
      detector: (code) => code.includes("<style") || code.includes("class=") || code.includes("style="),
      completed: false
    },
    {
      id: "javascript",
      label: "Implementing JavaScript...",
      // Detects if JavaScript is present in the code, but stays active as long as the LLM is still writing JavaScript
      detector: (code) => {
        // Check if JavaScript elements are present
        const hasJavaScript = code.includes("<script") ||
                             code.includes("function") ||
                             code.includes("addEventListener") ||
                             code.includes("document.") ||
                             code.includes("window.") ||
                             code.includes("const ") ||
                             code.includes("let ") ||
                             code.includes("var ");

        // If no JavaScript is present, the step is not completed
        if (!hasJavaScript) return false;

        // If generation is complete, the step is completed
        if (generationComplete) return true;

        // Check if the code ends with a closing script tag or if JavaScript is still being written
        const scriptTagsCount = (code.match(/<script/g) || []).length;
        const closingScriptTagsCount = (code.match(/<\/script>/g) || []).length;

        // If all script tags are closed and the code doesn't end with JavaScript code,
        // then the step is completed
        return scriptTagsCount === closingScriptTagsCount &&
               !code.trim().endsWith("function") &&
               !code.trim().endsWith("{") &&
               !code.trim().endsWith(";");
      },
      completed: false
    },
    {
      id: "finalize",
      label: "Finalizing...",
      detector: () => generationComplete,
      completed: false
    }
  ]);

  // Current step (the first uncompleted step)
  const currentStepIndex = steps.findIndex(step => !step.completed);

  // Analyze the generated code and update the steps
  useEffect(() => {
    if (generatedCode) {
      const updatedSteps = steps.map(step => ({
        ...step,
        completed: step.detector(generatedCode)
      }));

      setSteps(updatedSteps);
    }

    // If generation is complete, mark all steps as completed
    if (generationComplete) {
      const completedSteps = steps.map(step => ({
        ...step,
        completed: true
      }));

      setSteps(completedSteps);
    }
  }, [generatedCode, generationComplete]);

  return (
    <div className="space-y-1.5 h-full overflow-y-auto">
      {steps.map((step, index) => {
        // Determine the status of the step
        const isCompleted = step.completed;
        const isCurrent = !isCompleted && (currentStepIndex === -1 || index === currentStepIndex);

        return (
          <div key={step.id} className="flex items-center gap-1.5">
            {isCompleted ? (
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : isCurrent && isGenerating ? (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-gray-600 flex-shrink-0" />
            )}
            <span
              className={`text-xs sm:text-sm ${
                isCompleted
                  ? "text-gray-300"
                  : isCurrent
                    ? "text-white font-medium"
                    : "text-gray-600"
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  )
}
