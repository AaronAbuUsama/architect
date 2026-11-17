"""Regression checks through the evidence page's command-line entry point."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

TOOLS = Path(__file__).resolve().parent
HEADER = "$ python3 check.py\n# commit abc1234 · 2026-11-17T02:00:00Z · exit 0 (expected 0) · 1.2s\n\n"


class EvidencePageTests(unittest.TestCase):
    def render(self, records, ci=None):
        with tempfile.TemporaryDirectory() as root:
            root = Path(root)
            tool = root / "tools" / "evidence"
            tool.mkdir(parents=True)
            for name in ("page.py", "template.html"):
                shutil.copyfile(TOOLS / name, tool / name)
            step = root / "design" / "evidence" / "example"
            step.mkdir(parents=True)
            (step / "step.json").write_text(json.dumps({
                "step": "example", "stage": "local", "title": "Example",
                "summary": "Example", "proves": "Example", "captions": {},
            }))
            if ci is not None:
                (step / "ci.json").write_text(json.dumps([ci]))
            for name, content in records.items():
                (step / name).write_text(content)
            result = subprocess.run(["python3", str(tool / "page.py")], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            return (root / "design" / "evidence" / "index.html").read_text()

    def test_raw_legacy_record_is_preserved_and_unverified(self):
        page = self.render({"raw.txt": "a legacy record\nall checks passed\n"})
        self.assertIn("a legacy record", page)
        self.assertIn("unverified", page)
        self.assertNotIn('class="chip pass"', page)
        self.assertNotIn("/commit/", page)

    def test_valid_capture_keeps_metadata_and_escapes_html(self):
        page = self.render({"normal.txt": HEADER + "<script>alert('x')</script>\n"})
        self.assertIn("commit abc1234", page)
        self.assertIn("/commit/abc1234", page)
        self.assertIn("exit 0 · 1.2s", page)
        self.assertIn('class="chip pass"', page)
        self.assertIn("&lt;script&gt;", page)
        self.assertNotIn("<script>", page)

    def test_partial_or_malformed_metadata_never_turns_green(self):
        for content in ("", "$ check\n", HEADER.replace("abc1234", "unknown"),
                        HEADER.replace("2026-11-17T02:00:00Z", "today"),
                        HEADER.replace("exit 0", "exit ?"),
                        HEADER.replace("1.2s", "unknown"),
                        HEADER.replace("$ python3 check.py", "not a command")):
            with self.subTest(content=content):
                page = self.render({"partial.txt": content})
                self.assertIn("unverified", page)
                self.assertNotIn('class="chip pass"', page)
                self.assertNotIn("/commit/", page)

    def test_mixed_or_empty_records_cannot_mark_a_step_done(self):
        for records in ({}, {"normal.txt": HEADER + "ok", "raw.txt": "ok"}):
            page = self.render(records)
            self.assertNotIn('class="chip pass">done', page)

    def test_raw_record_cannot_hide_a_verified_failure(self):
        page = self.render({"bad.txt": HEADER.replace("exit 0", "exit 1") + "failed", "raw.txt": "unknown"})
        self.assertIn('class="chip bad">not done</span></h2>', page)
        self.assertIn('class="chip unknown">unverified', page)

    def test_raw_record_cannot_hide_a_ci_failure(self):
        page = self.render({"raw.txt": "unknown"}, ci={"url": "https://example.invalid/ci", "conclusion": "failure"})
        self.assertIn('class="chip bad">not done</span></h2>', page)
        self.assertIn('class="chip unknown">unverified', page)

    def test_failure_is_not_a_pass_and_expected_failure_is_caught(self):
        page = self.render({"bad.txt": HEADER.replace("exit 0", "exit 1") + "failed"})
        self.assertIn("unexpected", page)
        self.assertNotIn('class="chip pass"', page)
        page = self.render({"planted.txt": HEADER.replace("exit 0 (expected 0)", "exit 1 (expected 1)") + "failed"})
        self.assertIn("caught", page)

    def test_rendering_redacts_organization_ids_but_preserves_contract_names(self):
        identifiers = ("org_0123456789abcdef", "org_0123456789abcde", "org_abc123")
        names = ("organization.create", "organization.owner", "organization.id")
        for header in ("", HEADER):
            with self.subTest(header=bool(header)):
                page = self.render({"record.txt": header + " ".join(identifiers + names)})
                for identifier in identifiers:
                    self.assertNotIn(identifier, page)
                for name in names:
                    self.assertIn(name, page)
                self.assertEqual(page.count("&lt;organization id&gt;"), len(identifiers))

    def test_rendering_removes_local_paths_and_personal_email(self):
        body = "/Users/example/.codex/worktrees/task/architect/src/a.ts\n/private/var/folders/xx/temp/T/run.log\n/tmp/check-123/log.txt\n/home/example/project/a.ts\nowner@example.invalid\n/Users/\n/home/\n/tmp/\n/private/var/folders/"
        page = self.render({"raw.txt": body})
        for private in ("/Users/", "/private/var/folders/", "/tmp/", "/home/", "owner@example.invalid"):
            self.assertNotIn(private, page)
        self.assertIn("&lt;local path&gt;", page)


if __name__ == "__main__":
    unittest.main()
