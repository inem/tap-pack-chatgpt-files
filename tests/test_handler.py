import importlib.util
import tempfile
from pathlib import Path
import unittest
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("handler", ROOT / "handler.py")
handler = importlib.util.module_from_spec(spec)
spec.loader.exec_module(handler)
CID = "6aa023af-8a24-83ed-8e28-7229f939f99c"


class HandlerTests(unittest.TestCase):
    def test_prefers_readable_markdown(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            markdown = root / "data/readers/chatgpt.sessions/readable/chats" / f"{CID}.md"
            markdown.parent.mkdir(parents=True)
            markdown.write_text("# chat\n")
            target, message = handler.reveal_target(root, CID)
            self.assertEqual(target, markdown)
            self.assertIn(markdown.name, message)

    def test_rejects_path_traversal(self):
        with self.assertRaisesRegex(ValueError, "invalid_conversation"):
            handler.locations("/tmp/profile", "../../etc/passwd")

    @mock.patch.object(handler.subprocess, "run")
    def test_copy_path_uses_profile_projection(self, run):
        value = handler.handle({"profile_root": "/tmp/profile"}, {"action": "copy_path", "conversation_id": CID})
        expected = f"/tmp/profile/data/readers/chatgpt.sessions/readable/chats/{CID}.md"
        self.assertEqual(value["path"], expected)
        run.assert_called_once_with(["pbcopy"], input=expected, text=True, check=True)


if __name__ == "__main__":
    unittest.main()
