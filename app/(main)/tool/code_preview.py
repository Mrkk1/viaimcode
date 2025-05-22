"""Code preview tool for generating and previewing HTML code."""

from typing import Any, Dict, Optional, DefaultDict, List
import os
import json
from pathlib import Path
from collections import defaultdict

from app.tool.base import BaseTool, ToolResult
from app.llm import LLM
from app.exceptions import ToolError
from app.config import config
from app.tool.file_operators import FileOperator, LocalFileOperator, SandboxFileOperator, PathLike

class CodePreviewTool(BaseTool):
    """A tool for generating and previewing code."""

    name: str = "code_preview"
    description: str = """Generate and preview code in real-time.
    This tool can generate code based on prompts and provide live preview functionality."""

    parameters: dict = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "description": "The action to perform",
                "enum": ["generate", "preview"],
            },
            "prompt": {
                "type": "string",
                "description": "The prompt for code generation",
            },
            "language": {
                "type": "string",
                "description": "The programming language",
                "default": "html",
            },
            "task_dir": {
                "type": "string",
                "description": "The task directory to save the generated code",
            },
        },
        "required": ["action", "prompt", "task_dir"],
    }

    _file_history: DefaultDict[PathLike, List[str]] = defaultdict(list)
    _local_operator: LocalFileOperator = LocalFileOperator()
    _sandbox_operator: SandboxFileOperator = SandboxFileOperator()

    def _get_operator(self) -> FileOperator:
        """Get the appropriate file operator based on execution mode."""
        return (
            self._sandbox_operator
            if config.sandbox.use_sandbox
            else self._local_operator
        )

    async def validate_path(
        self, path: str, operator: FileOperator
    ) -> None:
        """Validate path based on execution environment."""
        if not path.startswith("/workspace"):
            raise ToolError(f"The path {path} is not a valid path")

        parent_dir = str(Path(path).parent)
        if not await operator.exists(parent_dir):
            raise ToolError(
                f"The parent directory {parent_dir} does not exist. Please create it first."
            )

    async def execute(self, **kwargs) -> ToolResult:
        """Execute the code preview tool."""
        action = kwargs.get("action")
        prompt = kwargs.get("prompt")
        language = kwargs.get("language", "html")
        task_dir = kwargs.get("task_dir")

        if not task_dir:
            raise ToolError("Task directory is required")

        if not prompt:
            raise ToolError("Prompt is required for code generation")

        operator = self._get_operator()
        await self.validate_path(task_dir, operator)

        if action == "generate":
            try:
                generated_code = await self._generate_code(prompt)
                if not generated_code:
                    raise ToolError("Failed to generate code: Empty response")
                
                parent_dir = str(Path(task_dir).parent)
                if not await operator.exists(parent_dir):
                    os.makedirs(parent_dir, exist_ok=True)

                file_path = os.path.join(task_dir, "index.html")
                await operator.write_file(file_path, generated_code)
                self._file_history[file_path].append(generated_code)

                result = {
                    "code": generated_code,
                    "file_path": file_path,
                    "message": "Code generated and saved successfully"
                }

                return ToolResult(output=json.dumps(result))

            except Exception as e:
                raise ToolError(f"Code generation failed: {str(e)}")

        elif action == "preview":
            file_path = os.path.join(task_dir, "index.html")

            if not await operator.exists(file_path):
                raise ToolError("No preview file found")

            code = await operator.read_file(file_path)
            result = {
                "code": code,
                "file_path": file_path
            }

            return ToolResult(output=json.dumps(result))

        else:
            raise ToolError(f"Unsupported action: {action}")

    async def _generate_code(self, prompt: str) -> str:
        """Generate code using LLM."""
        try:
            llm = LLM()

            system_prompt = """You are an expert web developer. Your task is to generate complete, functional HTML code based on user requirements.

            Important Requirements:
            1. Structure:
               - Include complete HTML structure (DOCTYPE, html, head, body)
               - Add all necessary meta tags and title
               - Use semantic HTML elements (header, nav, main, etc.)
            
            2. Content:
               - ALWAYS generate actual content in the body based on the user's prompt
               - If the prompt doesn't specify content, create appropriate example content
               - Use real text, not placeholder text like "lorem ipsum"
               - Include meaningful headings, paragraphs, and other content elements
            
            3. Styling:
               - Add CSS styles directly in a <style> tag in the head section
               - Style all content elements appropriately
               - Ensure good visual hierarchy and readability
               - Make the design responsive
            
            4. Best Practices:
               - Add descriptive comments to explain code structure
               - Ensure proper indentation and formatting
               - Make code accessible with ARIA attributes where needed
               - Include interactive elements (buttons, forms) when relevant
            
            Remember: The body section must NEVER be empty. Always include meaningful content that matches the user's requirements or create appropriate example content if not specified.
            
            Output only the complete HTML code, no explanations needed."""

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ]

            response = await llm.execute(messages=messages)

            if isinstance(response, dict):
                code = response.get("content", "")
                if not code:
                    raise ToolError("Generated code is empty")
            else:
                code = str(response)
                if not code:
                    raise ToolError("Generated code is empty")

            code = code.strip()
            if not code:
                raise ToolError("Generated code is empty")
            
            if not code.startswith("<!DOCTYPE html>"):
                code = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Page</title>
</head>
<body>
    {code}
</body>
</html>"""

            if "<body>" not in code or "</body>" not in code:
                raise ToolError("Generated code is missing body tags")

            return code

        except Exception as e:
            error_msg = f"Code generation failed: {str(e)}"
            if isinstance(e, ToolError):
                error_msg = str(e)
            raise ToolError(error_msg) 