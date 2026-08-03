from pathlib import Path

COMPONENT_ROOT = Path(__file__).resolve().parents[2]
PACKAGE_ROOT = COMPONENT_ROOT / "src" / "orchestrator_langgraph"


def test_langgraph_dirs_exist():
    required_dirs = [
        COMPONENT_ROOT / "src",
        PACKAGE_ROOT,
        PACKAGE_ROOT / "client",
        PACKAGE_ROOT / "graphs",
        PACKAGE_ROOT / "nodes",
        COMPONENT_ROOT / "tests",
        COMPONENT_ROOT / "tests" / "structure",
    ]

    for directory in required_dirs:
        assert directory.is_dir(), f"missing directory: {directory.relative_to(COMPONENT_ROOT)}"


def test_pyproject_toml_present():
    pyproject = COMPONENT_ROOT / "pyproject.toml"

    assert pyproject.is_file()
    text = pyproject.read_text(encoding="utf-8")
    assert 'name = "orchestrator-langgraph"' in text
    assert ">=3.11" in text
    assert '"langgraph>=' in text
    assert '"mcp>=' in text


def test_package_importable():
    import orchestrator_langgraph

    assert orchestrator_langgraph.__name__ == "orchestrator_langgraph"
