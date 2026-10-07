import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCANNER = ROOT / "scripts/check_public_hygiene.py"
HOME = "/" + "home/someone/"
CANARY = "/" + "home/dev/project/private/key.pem"


def run_scan(root):
    return subprocess.run([sys.executable, str(SCANNER), "--repo-root", str(root)],
                          capture_output=True, text=True, check=False)


def tracked_repo(tmp_path, files, fixtures=()):
    subprocess.run(["git", "init", "-q", str(tmp_path)], check=True)
    files = {**files, "ci/public-hygiene-fixtures.json": json.dumps(list(fixtures)).replace("/", r"\/")}
    for path, content in files.items():
        target = tmp_path / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content)
    subprocess.run(["git", "-C", str(tmp_path), "add", "--", *files], check=True)
    return tmp_path


def test_reports_planted_home_and_personal_registry_id_with_locations(tmp_path):
    repo = tracked_repo(tmp_path, {
        "live.txt": HOME + "x\n",
        "policies/repositories.json": '{"version":1,"repositories":{\n"novel":{"classification":"internal"}}}\n',
    })
    result = run_scan(repo)
    assert result.returncode == 1
    assert "live.txt:1:" in result.stdout and HOME + "x" in result.stdout
    assert "policies/repositories.json:2:" in result.stdout and "novel" in result.stdout


def test_clean_tracked_repo_passes_and_untracked_paths_are_not_published(tmp_path):
    repo = tracked_repo(tmp_path, {"live.txt": "portable\n"})
    (repo / "untracked.txt").write_text(HOME + "private")
    result = run_scan(repo)
    assert result.returncode == 0, result.stdout + result.stderr


def test_exact_fixture_allowlist_does_not_hide_a_second_home_path(tmp_path):
    repo = tracked_repo(tmp_path, {"tests/canary.py": CANARY + "\n" + HOME + "private\n"},
                        [{"path": "tests/canary.py", "literal": CANARY}])
    result = run_scan(repo)
    assert result.returncode == 1
    assert "tests/canary.py:2:" in result.stdout
    assert "tests/canary.py:1:" not in result.stdout
    (repo / "tests/canary.py").write_text(CANARY + "\n")
    assert run_scan(repo).returncode == 0
    (repo / "tests/other.py").write_text(CANARY)
    subprocess.run(["git", "-C", str(repo), "add", "--", "tests/other.py"], check=True)
    assert "tests/other.py:1:" in run_scan(repo).stdout


def test_history_allowlist_is_exact_and_does_not_cover_live_skills(tmp_path):
    repo = tracked_repo(tmp_path, {
        "plan/old.md": HOME + "historical", "audit/old.md": HOME + "historical",
        "plan_proyecto_v4.md": HOME + "historical", "tareas_implementacion_v4.md": HOME + "historical",
        ".claude/skills/x/SKILL.md": HOME + "private", "plans/live.md": HOME + "private",
    })
    result = run_scan(repo)
    assert result.returncode == 1
    assert ".claude/skills/x/SKILL.md:1:" in result.stdout
    assert "plans/live.md:1:" in result.stdout
    assert "plan/old.md:" not in result.stdout and "audit/old.md:" not in result.stdout


def test_real_tree_has_no_unallowlisted_personal_paths():
    result = run_scan(ROOT)
    assert "home path" not in result.stdout, result.stdout + result.stderr
    assert result.returncode in (0, 1), result.stderr


def test_real_tree_public_registry_ids():
    result = run_scan(ROOT)
    assert result.returncode == 0, result.stdout + result.stderr
