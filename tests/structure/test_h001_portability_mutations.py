from __future__ import annotations

import os
import signal
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
PORTABILITY_TEST = REPO / "tests" / "structure" / "test_h001_portability.py"
MUTATION_TIMEOUT_SECONDS = 30


@dataclass(frozen=True)
class Witness:
    selector: str
    expected_tests: int


@dataclass(frozen=True)
class EmissionProbe:
    detector: str
    value_expression: str
    marker: str


@dataclass(frozen=True)
class Mutation:
    identifier: str
    before: str
    after: str
    witness: Witness
    emission_probe: EmissionProbe | None = None
    emitted_marker: str | None = None


@dataclass(frozen=True)
class PytestResult:
    returncode: int
    tests: int
    failures: int
    errors: int
    skipped: int
    stdout: str
    stderr: str


PROXY_WITNESS = Witness(
    "test_npm_fake_rejects_proxy_bypass_and_unallowlisted_egress",
    2,
)
OUTPUT_WITNESS = Witness(
    "test_output_scan_rejects_every_canary_bearing_surface",
    4,
)
EMISSION_WITNESS = Witness(
    "test_output_scan_rejects_every_canary_bearing_surface[stdout]",
    1,
)
SURFACE_WITNESS = Witness(
    "test_npm_fake_rejects_script_enabled_install_with_stable_sentinel",
    1,
)
INHERITED_WITNESS = Witness(
    "test_bootstrap_rejects_inherited_owner_or_dependency_state",
    5,
)

MUTATIONS = (
    Mutation(
        "proxy_scheme_predicate",
        '    if parsed.scheme != "http":\n',
        "    if False:\n",
        PROXY_WITNESS,
    ),
    Mutation(
        "proxy_exact_host_predicate",
        '    if parsed.hostname != "127.0.0.1":\n',
        "    if False:\n",
        PROXY_WITNESS,
    ),
    Mutation(
        "proxy_username_predicate",
        "    if parsed.username is not None:\n",
        "    if False:\n",
        PROXY_WITNESS,
    ),
    Mutation(
        "proxy_password_predicate",
        "    if parsed.password is not None:\n",
        "    if False:\n",
        PROXY_WITNESS,
    ),
    Mutation(
        "proxy_exact_path_predicate",
        "    if parsed.path != expected_path:\n",
        "    if False:\n",
        PROXY_WITNESS,
    ),
    Mutation(
        "protected_username_detector",
        "            username,\n",
        '            "H001_MUTANT_DISABLED_USERNAME",\n',
        OUTPUT_WITNESS,
        EmissionProbe(
            "protected_username_detector",
            "case.username",
            "H001_EMITTED:protected_username_detector:",
        ),
    ),
    Mutation(
        "protected_credential_url_detector",
        "            credential_url,\n",
        '            "H001_MUTANT_DISABLED_CREDENTIAL_URL",\n',
        OUTPUT_WITNESS,
        EmissionProbe(
            "protected_credential_url_detector",
            "case.credential_url",
            "H001_EMITTED:protected_credential_url_detector:",
        ),
    ),
    Mutation(
        "protected_owner_home_detector",
        "            str(owner_home),\n",
        '            "H001_MUTANT_DISABLED_OWNER_HOME",\n',
        OUTPUT_WITNESS,
        EmissionProbe(
            "protected_owner_home_detector",
            "str(case.owner_home)",
            "H001_EMITTED:protected_owner_home_detector:",
        ),
    ),
    Mutation(
        "protected_reviewer_home_detector",
        "            str(Path.home()),\n",
        '            "H001_MUTANT_DISABLED_REVIEWER_HOME",\n',
        OUTPUT_WITNESS,
        EmissionProbe(
            "protected_reviewer_home_detector",
            "str(Path.home())",
            "H001_EMITTED:protected_reviewer_home_detector:",
        ),
    ),
    Mutation(
        "protected_repo_path_detector",
        "            str(REPO),\n",
        '            "H001_MUTANT_DISABLED_REPO_PATH",\n',
        OUTPUT_WITNESS,
        EmissionProbe(
            "protected_repo_path_detector",
            "str(REPO)",
            "H001_EMITTED:protected_repo_path_detector:",
        ),
    ),
    Mutation(
        "raw_config_surface",
        '        case.output_dir / "raw-config.json",\n',
        "",
        OUTPUT_WITNESS,
    ),
    Mutation(
        "rendered_exception_chain_surface",
        (
            "    for exception in exceptions:\n"
            "        surfaces.extend(\n"
            "            traceback.TracebackException.from_exception(exception).format(chain=True)\n"
            "        )\n"
        ),
        "",
        OUTPUT_WITNESS,
    ),
    Mutation(
        "inherited_xdg_cache_home_guard",
        (
            '    for variable in ("XDG_CACHE_HOME", "UV_CACHE_DIR", '
            '"npm_config_cache"):\n'
        ),
        '    for variable in ("UV_CACHE_DIR", "npm_config_cache"):\n',
        INHERITED_WITNESS,
    ),
    Mutation(
        "inherited_aws_access_key_id_guard",
        '        "AWS_ACCESS_KEY_ID",\n',
        "",
        INHERITED_WITNESS,
    ),
    Mutation(
        "inherited_google_application_credentials_guard",
        '        "GOOGLE_APPLICATION_CREDENTIALS",\n',
        "",
        INHERITED_WITNESS,
    ),
    Mutation(
        "inherited_uv_credentials_guard",
        '        "UV_CREDENTIALS",\n',
        "",
        INHERITED_WITNESS,
    ),
    Mutation(
        "inherited_dot_venv_guard",
        (
            '        if Path(".venv").exists() or '
            'Path("gateway/node_modules").exists():\n'
        ),
        '        if Path("gateway/node_modules").exists():\n',
        INHERITED_WITNESS,
    ),
)


def replace_once(source: str, before: str, after: str, identifier: str) -> str:
    replacement_count = source.count(before)
    assert replacement_count == 1, (
        f"MUTATION_REPLACEMENT_COUNT:{identifier}:expected=1:actual="
        f"{replacement_count}"
    )
    return source.replace(before, after, 1)


def read_junit_counts(report: Path) -> tuple[int, int, int, int]:
    root = ET.parse(report).getroot()
    suites = [root] if root.tag == "testsuite" else list(root.findall("testsuite"))
    assert suites, "MUTATION_JUNIT_MISSING_TESTSUITE"
    return tuple(
        sum(int(suite.attrib.get(attribute, "0")) for suite in suites)
        for attribute in ("tests", "failures", "errors", "skipped")
    )


def kill_owned_process_family(process: subprocess.Popen[str]) -> None:
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass


def run_source_copy(
    source: str,
    witness: Witness,
    report_directory: Path,
    label: str,
) -> PytestResult:
    report = report_directory / f"{label}.xml"
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=PORTABILITY_TEST.parent,
        prefix="test_h001_portability_mutant_",
        suffix=".py",
        delete=False,
    ) as stream:
        stream.write(source)
        mutant_path = Path(stream.name)

    env = dict(os.environ)
    env.pop("PYTEST_ADDOPTS", None)
    env["PYTEST_DISABLE_PLUGIN_AUTOLOAD"] = "1"
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    selector = f"{mutant_path}::{witness.selector}"
    argv = [
        sys.executable,
        "-m",
        "pytest",
        "-q",
        "-rs",
        "-s",
        "-p",
        "no:cacheprovider",
        "--maxfail=1",
        "--tb=short",
        "--junitxml",
        str(report),
        selector,
    ]
    try:
        process = subprocess.Popen(
            argv,
            cwd=REPO,
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True,
        )
        try:
            stdout, stderr = process.communicate(timeout=MUTATION_TIMEOUT_SECONDS)
        except subprocess.TimeoutExpired:
            kill_owned_process_family(process)
            stdout, stderr = process.communicate()
            pytest.fail(
                f"MUTATION_TIMEOUT:{label}:{MUTATION_TIMEOUT_SECONDS}s\n"
                f"stdout:\n{stdout}\n"
                f"stderr:\n{stderr}"
            )
        finally:
            kill_owned_process_family(process)
    finally:
        mutant_path.unlink(missing_ok=True)

    completed = subprocess.CompletedProcess(
        argv,
        process.returncode,
        stdout,
        stderr,
    )

    assert report.is_file(), (
        f"MUTATION_JUNIT_MISSING:{label}:exit={completed.returncode}\n"
        f"stdout:\n{completed.stdout}\n"
        f"stderr:\n{completed.stderr}"
    )
    tests, failures, errors, skipped = read_junit_counts(report)
    return PytestResult(
        returncode=completed.returncode,
        tests=tests,
        failures=failures,
        errors=errors,
        skipped=skipped,
        stdout=completed.stdout,
        stderr=completed.stderr,
    )


def assert_clean_witness(result: PytestResult, witness: Witness, label: str) -> None:
    assert (
        result.returncode,
        result.tests,
        result.failures,
        result.errors,
        result.skipped,
    ) == (0, witness.expected_tests, 0, 0, 0), (
        f"MUTATION_WITNESS_INVALID:{label}:"
        f"exit={result.returncode}:tests={result.tests}:failures={result.failures}:"
        f"errors={result.errors}:skipped={result.skipped}\n"
        f"stdout:\n{result.stdout}\n"
        f"stderr:\n{result.stderr}"
    )


def assert_emitted_marker(result: PytestResult, marker: str, label: str) -> None:
    emissions = [line for line in result.stdout.splitlines() if line.startswith(marker)]
    assert emissions and all(len(line) > len(marker) for line in emissions), (
        f"MUTATION_EMISSION_ORACLE_MISSING:{label}:{marker}\n"
        f"stdout:\n{result.stdout}\n"
        f"stderr:\n{result.stderr}"
    )


@pytest.fixture(scope="module")
def pristine_witnesses(tmp_path_factory: pytest.TempPathFactory) -> None:
    source = PORTABILITY_TEST.read_text(encoding="utf-8")
    report_directory = tmp_path_factory.mktemp("h001-pristine-witnesses")
    for label, witness in (
        ("proxy", PROXY_WITNESS),
        ("output", OUTPUT_WITNESS),
        ("surface", SURFACE_WITNESS),
        ("inherited", INHERITED_WITNESS),
    ):
        result = run_source_copy(source, witness, report_directory, label)
        assert_clean_witness(result, witness, f"pristine_{label}")


@pytest.mark.parametrize(
    "mutation",
    MUTATIONS,
    ids=lambda mutation: mutation.identifier,
)
def test_frozen_portability_witnesses_kill_reviewed_boundary_mutants(
    mutation: Mutation,
    pristine_witnesses: None,
    tmp_path: Path,
) -> None:
    del pristine_witnesses
    source = PORTABILITY_TEST.read_text(encoding="utf-8")

    emission_evidence = "not-required"
    if mutation.emission_probe is not None:
        probe = mutation.emission_probe
        probe_before = (
            f'        ("{probe.detector}", {probe.value_expression}),\n'
        )
        probe_after = (
            "        (\n"
            f'            "{probe.detector}",\n'
            "            (\n"
            f'                print("{probe.marker}" + {probe.value_expression})\n'
            f"                or {probe.value_expression}\n"
            "            ),\n"
            "        ),\n"
        )
        probe_source = replace_once(
            source,
            probe_before,
            probe_after,
            f"{mutation.identifier}_emission_probe",
        )
        probe_result = run_source_copy(
            probe_source,
            EMISSION_WITNESS,
            tmp_path,
            f"{mutation.identifier}_emission_probe",
        )
        assert_clean_witness(
            probe_result,
            EMISSION_WITNESS,
            f"{mutation.identifier}_emission_probe",
        )
        assert_emitted_marker(probe_result, probe.marker, mutation.identifier)
        emission_evidence = probe.marker

    mutated_source = replace_once(
        source,
        mutation.before,
        mutation.after,
        mutation.identifier,
    )
    result = run_source_copy(
        mutated_source,
        mutation.witness,
        tmp_path,
        mutation.identifier,
    )

    if result.returncode == 0:
        assert_clean_witness(result, mutation.witness, mutation.identifier)
        if mutation.emitted_marker is not None:
            assert_emitted_marker(result, mutation.emitted_marker, mutation.identifier)
            emission_evidence = mutation.emitted_marker
        pytest.fail(
            f"SURVIVING_MUTANT:{mutation.identifier}:"
            f"selector={mutation.witness.selector}:tests={result.tests}:"
            f"emission={emission_evidence}\n"
            f"stdout:\n{result.stdout}\n"
            f"stderr:\n{result.stderr}"
        )

    assert result.returncode == 1, (
        f"MUTATION_NON_SEMANTIC_EXIT:{mutation.identifier}:"
        f"exit={result.returncode}:tests={result.tests}:failures={result.failures}:"
        f"errors={result.errors}:skipped={result.skipped}\n"
        f"stdout:\n{result.stdout}\n"
        f"stderr:\n{result.stderr}"
    )
    assert 1 <= result.tests <= mutation.witness.expected_tests
    assert result.failures >= 1
    assert result.errors == 0
    assert result.skipped == 0
