
from datetime import datetime
from typing import Any, List
from pathlib import Path
import shutil

from typing_extensions import override

from pydantic_ai import Agent, MemoryTool

from anthropic.lib.tools import BetaAbstractMemoryTool
from anthropic.types.beta import (
    BetaMemoryTool20250818Command,
    BetaMemoryTool20250818CreateCommand,
    BetaMemoryTool20250818DeleteCommand,
    BetaMemoryTool20250818InsertCommand,
    BetaMemoryTool20250818RenameCommand,
    BetaMemoryTool20250818StrReplaceCommand,
    BetaMemoryTool20250818ViewCommand,
)


system_prompt = """
you name is Clawd. Your job is to help user with their studies and homework.
Once we get details of the user's subjectwe
we would create a list of problems and difficulties the user would have. 

Instructions:
Chat casually. 
Be friendly and engaging. 
Try to guide conversation towards the main goal. sure you can briefly answer tangential questions but 
be very brief about those. 

Remember that this chat will continue in future so if the user asks you to change/correct any info they can do that. If some info is missing its ok don't keep asking the user. keep it casual and make sure to help the user with what they need. If you have access to tools or memory you can just use it and no need to keep telling the user what you'll do how you'll do it un less you feel its absolutely necessary. 
"""

class ClawdMemoryPad(BetaAbstractMemoryTool):
    def __init__(self, base_path: str = ".clawd_memory"):
        super().__init__()
        self.base_path = Path(base_path)
        self.memory_root = self.base_path / "memories"
        self.memory_root.mkdir(parents=True, exist_ok=True)

    def _validate_path(self, path: str) -> Path:
        if not path.startswith("/memories"):
            raise ValueError(f"Path must start with /memories, got: {path}")

        relative_path = path[len("/memories"):].lstrip("/")
        full_path = self.memory_root / relative_path if relative_path else self.memory_root

        try:
            full_path.resolve().relative_to(self.memory_root.resolve())
        except ValueError as e:
            raise ValueError(f"Path {path} would escape /memories directory") from e

        return full_path

    @override
    def view(self, command: BetaMemoryTool20250818ViewCommand) -> str:
        full_path = self._validate_path(command.path)

        if full_path.is_dir():
            items: List[str] = []
            try:
                for item in sorted(full_path.iterdir()):
                    if item.name.startswith("."):
                        continue
                    items.append(f"{item.name}/" if item.is_dir() else item.name)
                return f"Directory: {command.path}\n" + "\n".join([f"- {item}" for item in items])
            except Exception as e:
                raise RuntimeError(f"Cannot read directory {command.path}: {e}") from e

        elif full_path.is_file():
            try:
                content = full_path.read_text(encoding="utf-8")
                lines = content.splitlines()
                view_range = command.view_range
                if view_range:
                    start_line = max(1, view_range[0]) - 1
                    end_line = len(lines) if view_range[1] == -1 else view_range[1]
                    lines = lines[start_line:end_line]
                    start_num = start_line + 1
                else:
                    start_num = 1

                numbered_lines = [f"{i + start_num:4d}: {line}" for i, line in enumerate(lines)]
                return "\n".join(numbered_lines)
            except Exception as e:
                raise RuntimeError(f"Cannot read file {command.path}: {e}") from e
        else:
            raise RuntimeError(f"Path not found: {command.path}")

    @override
    def create(self, command: BetaMemoryTool20250818CreateCommand) -> str:
        full_path = self._validate_path(command.path)
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(command.file_text, encoding="utf-8")
        return f"File created successfully at {command.path}"

    @override
    def str_replace(self, command: BetaMemoryTool20250818StrReplaceCommand) -> str:
        full_path = self._validate_path(command.path)

        if not full_path.is_file():
            raise FileNotFoundError(f"File not found: {command.path}")

        content = full_path.read_text(encoding="utf-8")
        count = content.count(command.old_str)
        if count == 0:
            raise ValueError(f"Text not found in {command.path}")
        elif count > 1:
            raise ValueError(f"Text appears {count} times in {command.path}. Must be unique.")

        new_content = content.replace(command.old_str, command.new_str)
        full_path.write_text(new_content, encoding="utf-8")
        return f"File {command.path} has been edited"

    @override
    def insert(self, command: BetaMemoryTool20250818InsertCommand) -> str:
        full_path = self._validate_path(command.path)
        insert_line = command.insert_line
        insert_text = command.insert_text

        if not full_path.is_file():
            raise FileNotFoundError(f"File not found: {command.path}")

        lines = full_path.read_text(encoding="utf-8").splitlines()
        if insert_line < 0 or insert_line > len(lines):
            raise ValueError(f"Invalid insert_line {insert_line}. Must be 0-{len(lines)}")

        lines.insert(insert_line, insert_text.rstrip("\n"))
        full_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return f"Text inserted at line {insert_line} in {command.path}"

    @override
    def delete(self, command: BetaMemoryTool20250818DeleteCommand) -> str:
        full_path = self._validate_path(command.path)

        if command.path == "/memories":
            raise ValueError("Cannot delete the /memories directory itself")

        if full_path.is_file():
            full_path.unlink()
            return f"File deleted: {command.path}"
        elif full_path.is_dir():
            shutil.rmtree(full_path)
            return f"Directory deleted: {command.path}"
        else:
            raise FileNotFoundError(f"Path not found: {command.path}")

    @override
    def rename(self, command: BetaMemoryTool20250818RenameCommand) -> str:
        old_full_path = self._validate_path(command.old_path)
        new_full_path = self._validate_path(command.new_path)

        if not old_full_path.exists():
            raise FileNotFoundError(f"Source path not found: {command.old_path}")
        if new_full_path.exists():
            raise ValueError(f"Destination already exists: {command.new_path}")

        new_full_path.parent.mkdir(parents=True, exist_ok=True)
        old_full_path.rename(new_full_path)
        return f"Renamed {command.old_path} to {command.new_path}"

    @override
    def clear_all_memory(self) -> str:
        if self.memory_root.exists():
            shutil.rmtree(self.memory_root)
        self.memory_root.mkdir(parents=True, exist_ok=True)
        return "All memory cleared"

clawd = Agent(  
    'anthropic:claude-sonnet-4-5',
    deps_type=None,
    output_type=str,
    system_prompt=(
        system_prompt
    ),
    builtin_tools=[MemoryTool()],
)

clawd_memory = ClawdMemoryPad()
@clawd_agent.tool_plain
def memory(**command: Any) -> Any:
    return clawd_memory.call(command)

@clawd_agent.tool_plain
def get_current_time() -> datetime:
    return datetime.now()

if __name__ == "__main__":
    message_history = []
    while True:
        user_input = input("You: ")
        response = clawd_agent.run_sync(user_input, message_history=message_history)
        message_history = response.all_messages()
        print(response.output)
