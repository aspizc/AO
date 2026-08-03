import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PROJECT = ROOT / "plan" / "PROJECT_V4"

STREAM_TASKS = {
    "M0/0": ("00", "01"),
    "M0/1": ("00", "01", "02"),
    "M0/2": ("00", "01", "02"),
    "M0/3": ("00",),
    "M0/4": ("00", "01", "02"),
    "A/0": ("00", "01", "02"),
    "B/0": ("00", "01", "02", "03", "04"),
    "B/1": ("00", "01", "02", "03", "04", "05", "06", "07", "08", "09"),
    "B/2": ("00", "01", "02", "03"),
    "B/3": ("00", "01", "02", "03"),
    "B/4": ("00", "01", "02"),
    "B/5": ("00", "01", "02"),
    "C/0": ("00", "01", "02", "03", "04"),
    "D/0": ("00", "01", "02"),
    "D/1": ("00", "01", "02", "03"),
    "E/0": ("00", "01", "02"),
    "E/1": ("00", "01", "02", "03", "04", "05", "06", "07"),
    "E/2": ("00", "01", "02", "03"),
    "E/3": ("00",),
}

EPIC_TASKS = {
    "EP-00": ("M0/0/00", "M0/3/00", "M0/4/00", "M0/4/02"),
    "EP-01": (
        "M0/1/00",
        "M0/1/01",
        "M0/1/02",
        "M0/2/00",
        "M0/2/01",
        "M0/2/02",
    ),
    "EP-02": ("A/0/00", "A/0/01", "A/0/02"),
    "EP-03": ("B/0/00", "B/0/01", "B/0/02", "B/0/03"),
    "EP-04": (
        "B/1/00",
        "B/1/01",
        "B/1/02",
        "B/1/03",
        "B/1/04",
        "B/1/05",
        "B/1/06",
        "B/1/07",
        "B/1/08",
        "B/1/09",
    ),
    "EP-05": ("B/2/00", "B/2/01", "B/2/02", "B/2/03"),
    "EP-06": ("B/0/04", "B/3/00", "B/3/01", "B/3/02", "B/3/03"),
    "EP-07": ("B/4/00", "B/4/01", "B/4/02", "B/5/00", "B/5/01", "B/5/02"),
    "EP-08": ("C/0/00", "C/0/01", "C/0/02", "C/0/03", "C/0/04"),
    "EP-09": (
        "M0/0/01",
        "D/0/00",
        "D/0/01",
        "D/0/02",
        "D/1/00",
        "D/1/01",
        "D/1/02",
        "D/1/03",
    ),
    "EP-10": (
        "E/0/00",
        "E/0/01",
        "E/0/02",
        "E/1/00",
        "E/1/01",
        "E/1/02",
        "E/1/03",
        "E/1/04",
        "E/1/05",
        "E/1/06",
        "E/1/07",
        "E/3/00",
    ),
    "EP-11": ("M0/4/01", "E/2/00", "E/2/01", "E/2/02", "E/2/03"),
}

REQUIRED_FIELDS = (
    "Estado",
    "Objetivo",
    "Scope/evidencia",
    "Aceptación",
    "Tests/gate",
    "Dependencias",
    "Esfuerzo/riesgo",
    "Fuente",
)


def _text(path):
    return path.read_text(encoding="utf-8")


def _expected_task_ids():
    return {
        f"{stream}/{task}"
        for stream, tasks in STREAM_TASKS.items()
        for task in tasks
    }


def _task_path(task_id):
    return PROJECT / f"{task_id}.md"


def _local_targets(document):
    for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", _text(document)):
        if re.match(r"^[a-z][a-z0-9+.-]*:", target) or target.startswith("#"):
            continue
        yield target.split("#", 1)[0].split("?", 1)[0]


def test_project_v4_has_exactly_twelve_epic_files_and_seventy_two_task_files():
    expected_tasks = _expected_task_ids()
    actual_tasks = {
        path.relative_to(PROJECT).with_suffix("").as_posix()
        for stage in ("M0", "A", "B", "C", "D", "E")
        for path in (PROJECT / stage).glob("[0-9]*/[0-9][0-9].md")
    }
    expected_epics = {f"{epic}.md" for epic in EPIC_TASKS}
    actual_epics = {path.name for path in (PROJECT / "epics").glob("EP-[0-9][0-9].md")}

    assert len(expected_tasks) == 72
    assert actual_tasks == expected_tasks
    assert actual_epics == expected_epics


def test_every_task_is_a_detailed_authorized_absorption_sheet_with_one_epic_backlink():
    reverse = {
        task_id: epic
        for epic, task_ids in EPIC_TASKS.items()
        for task_id in task_ids
    }
    assert set(reverse) == _expected_task_ids()

    for task_id, epic in reverse.items():
        text = _text(_task_path(task_id))
        assert text.startswith(f"# {task_id} — ")
        assert "Estado actual: **planificada para absorción V5**" in text
        assert "G-1/G0 están autorizados" in text
        assert "sin la evidencia V5 enlazada" in text
        assert "## Ficha ejecutable" in text
        assert "## Especificación detallada" in text
        for field in REQUIRED_FIELDS:
            assert text.count(f"**{field}:**") == 1, f"{task_id}: {field}"
        assert text.count(f"(../../epics/{epic}.md)") == 1


def test_epic_membership_is_bijective_and_indexes_link_physical_files():
    epic_index = _text(PROJECT / "EPICS.md")
    sheet_index = _text(PROJECT / "SHEETS.md")

    for epic, expected_tasks in EPIC_TASKS.items():
        epic_path = PROJECT / "epics" / f"{epic}.md"
        text = _text(epic_path)
        linked_tasks = {
            match.replace("../", "").removesuffix(".md")
            for match in re.findall(
                r"\(\.\./((?:M0|[A-E])/\d+/\d+\.md)\)",
                text,
            )
        }
        assert linked_tasks == set(expected_tasks)
        assert epic_index.count(f"(epics/{epic}.md)") == 1

    for task_id in _expected_task_ids():
        assert sheet_index.count(f"({task_id}.md)") == 1
        stage, stream, task = task_id.split("/")
        stage_index = _text(PROJECT / stage / "TASKS.md")
        assert stage_index.count(f"({stream}/{task}.md)") == 1


def test_every_stream_has_a_navigable_index():
    for stream, tasks in STREAM_TASKS.items():
        index = PROJECT / stream / "README.md"
        text = _text(index)
        for task in tasks:
            assert text.count(f"({task}.md)") == 1


def test_existing_a_and_c_specs_keep_their_execution_detail():
    for stage in ("A", "C"):
        for path in (PROJECT / stage).glob("[0-9]*/[0-9][0-9].md"):
            text = _text(path)
            assert "| Branch |" in text
            assert "Paths permitidos:" in text
            assert "Rollback:" in text


def test_all_materialized_project_v4_links_resolve():
    documents = {
        PROJECT / "README.md",
        PROJECT / "AUDIT.md",
        PROJECT / "EPICS.md",
        PROJECT / "SHEETS.md",
        PROJECT / "epics" / "README.md",
    }
    documents.update((PROJECT / "epics").glob("EP-[0-9][0-9].md"))
    for stage in ("M0", "A", "B", "C", "D", "E"):
        documents.add(PROJECT / stage / "README.md")
        documents.add(PROJECT / stage / "TASKS.md")
        documents.update((PROJECT / stage).glob("[0-9]*/README.md"))
        documents.update((PROJECT / stage).glob("[0-9]*/[0-9][0-9].md"))

    for document in documents:
        for target in _local_targets(document):
            assert (document.parent / target).resolve().exists(), (
                f"{document.relative_to(ROOT)} has a broken link: {target}"
            )
