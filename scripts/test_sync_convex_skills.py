"""Regression tests for skill mirror discovery and non-destructive synchronization."""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


class SyncSkillsTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.script = self.root / "scripts" / "sync-convex-skills.py"
        self.script.parent.mkdir()
        shutil.copyfile(Path(__file__).with_name("sync-convex-skills.py"), self.script)
        for tree in (".agents", ".claude"):
            self.write(tree, "CONVEX-WORKFLOWS.md", "contract")

    def write(self, tree, relative, content):
        path = self.root / tree / "skills" / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return path

    def run_sync(self, *args):
        return subprocess.run(
            [sys.executable, str(self.script), *args],
            capture_output=True, text=True, check=False,
        )

    def test_source_only_skill_and_resources_are_created(self):
        for relative in ("SKILL.md", "agents/openai.yaml", "references/example.md"):
            self.write(".agents", f"convex-new/{relative}", relative)
        self.assertEqual(self.run_sync().returncode, 1)
        self.assertEqual(self.run_sync("--apply").returncode, 0)
        for relative in ("SKILL.md", "agents/openai.yaml", "references/example.md"):
            mirror = self.root / ".claude/skills/convex-new" / relative
            self.assertEqual(mirror.read_text(encoding="utf-8"), relative)
        self.assertEqual(self.run_sync().returncode, 0)

    def test_target_only_files_are_reported_without_writes(self):
        for relative in ("convex-orphan/SKILL.md", "convex-existing/agents/openai.yaml"):
            with self.subTest(relative=relative):
                orphan = self.write(".claude", relative, "preserve")
                for args in ((), ("--apply",)):
                    result = self.run_sync(*args)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn("Missing source files", result.stderr)
                    self.assertEqual(orphan.read_text(encoding="utf-8"), "preserve")
                orphan.unlink()

    def test_check_is_read_only_and_apply_refreshes_differences(self):
        self.write(".agents", "convex-existing/SKILL.md", "new")
        mirror = self.write(".claude", "convex-existing/SKILL.md", "old")
        self.assertEqual(self.run_sync().returncode, 1)
        self.assertEqual(mirror.read_text(encoding="utf-8"), "old")
        self.assertEqual(self.run_sync("--apply").returncode, 0)
        self.assertEqual(mirror.read_text(encoding="utf-8"), "new")
        self.assertEqual(self.run_sync().returncode, 0)


if __name__ == "__main__":
    unittest.main()
