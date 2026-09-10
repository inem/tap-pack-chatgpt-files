"""Ground ChatGPT conversation-file actions in the selected TAP profile."""
import json
import os
from pathlib import Path
import re
import subprocess
import sys


CONVERSATION_ID = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)


def locations(profile_root, conversation_id):
    if not isinstance(conversation_id, str) or not CONVERSATION_ID.fullmatch(conversation_id):
        raise ValueError("invalid_conversation")
    sessions = Path(profile_root) / "data" / "readers" / "chatgpt.sessions"
    markdown = sessions / "readable" / "chats" / f"{conversation_id}.md"
    raw = sessions / f"{conversation_id}.json"
    return sessions, markdown, raw


def reveal_target(profile_root, conversation_id):
    sessions, markdown, raw = locations(profile_root, conversation_id)
    if markdown.is_file():
        return markdown, f"Opened {markdown.name}"
    if raw.exists():
        return raw, "No Markdown yet — opened the captured JSON"
    readable = sessions / "readable"
    target = readable if readable.is_dir() else sessions
    return target, "This conversation has not been captured yet"


def handle(context, args):
    if not isinstance(args, dict):
        raise ValueError("invalid_request")
    action = args.get("action")
    conversation_id = args.get("conversation_id")
    _, markdown, _ = locations(context["profile_root"], conversation_id)
    if action == "copy_path":
        subprocess.run(["pbcopy"], input=str(markdown), text=True, check=True)
        return {"path": str(markdown), "message": "Path copied"}
    if action == "reveal":
        target, message = reveal_target(context["profile_root"], conversation_id)
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            target.mkdir(parents=True, exist_ok=True)
        subprocess.run(["open", "-R", str(target)], check=True)
        return {"path": str(target), "message": message}
    raise ValueError("unsupported_action")


def main():
    context = json.loads(os.environ["TAP_PACK_CONTEXT"])
    request = json.loads(sys.stdin.readline())
    try:
        value = handle(context, request.get("args"))
        reply = {"ok": True, "value": value}
    except ValueError as error:
        reply = {"ok": False, "error": {"code": str(error), "message": "Invalid ChatGPT file action"}}
    print(json.dumps(reply, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"error": type(error).__name__}), file=sys.stderr)
        sys.exit(1)
