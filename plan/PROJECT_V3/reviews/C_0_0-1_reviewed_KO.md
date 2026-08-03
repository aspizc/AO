# Review Verdict - Task PROJECT_V3/C/0/0 (Trial 1): KO

## Summary

La implementacion cubre casi todo el alcance de C/0/0 (bounds en ambos
`pyproject.toml`, extra `redis` opcional, `requirements.lock` generado de
forma reproducible con `uv pip compile` desde los manifests, mensaje del
`RuntimeError` actualizado, README Quickstart, tests de estructura nuevos,
CHANGELOG). Sin embargo hay un hallazgo bloqueante: el bound de `rich` en
`cli/pyproject.toml` excluye la version instalada y verificada, por lo que el
lockfile reproduce un entorno distinto del que paso las suites. KO con
correccion acotada.

## Findings

### Bloqueante

1. **`rich>=13.7,<15` excluye la version instalada (15.0.0) y el lock resuelve
   otra (14.3.4).**
   - Evidencia: `.venv/bin/pip show rich` → `Version: 15.0.0` (la propia
     review lo registra en "Installed versions"); `cli/pyproject.toml:8` fija
     `rich>=13.7,<15`; `requirements.lock:143` resuelve `rich==14.3.4`.
   - Por que bloquea: la spec manda "fijar las versiones actualmente
     instaladas en `.venv` como base" con "bounds compatibles", y el error
     comun ❌ recuerda que "la base es lo instalado hoy". El `<15` de la spec
     era un ejemplo, no un valor a copiar contra la evidencia. Tal como esta,
     las suites se verificaron con rich 15.0.0 pero un venv fresco desde el
     lockfile instala rich 14.3.4: el entorno "reproducible" nunca fue el
     verificado, que es exactamente la clase de deriva silenciosa que M2.1/A3
     pretende cerrar.
   - Consecuencia adicional: la verificacion C0-T2 ("venv fresco desde
     lockfile, suites verdes") no se ejecuto realmente contra el contenido del
     lock — el venv de trabajo conserva rich 15.0.0, senal de que nunca se
     hizo `uv pip sync requirements.lock` sobre el.

### Correccion concreta (solo esto en trial 2)

1. Subir el bound en `cli/pyproject.toml` a `rich>=13.7,<16` (mantiene el
   minimo, incluye la 15.0.0 instalada). Alternativa solo si se verifica de
   verdad: downgrade del venv a una 14.x y suites verdes con ella — la opcion
   `<16` es la alineada con "lo instalado hoy".
2. Regenerar `requirements.lock` con el mismo comando documentado
   (`uv pip compile cli/pyproject.toml orchestrator-langgraph/pyproject.toml
   --all-extras --python-version 3.13 --output-file requirements.lock`) y
   comprobar que resuelve `rich==15.0.0`.
3. Actualizar la asercion hardcodeada en
   `tests/structure/test_python_reproducibility.py` (`"rich>=13.7,<15"` →
   `"rich>=13.7,<16"`).
4. Re-verificar: `uv pip sync requirements.lock` (o venv fresco) +
   `pytest orchestrator-langgraph/tests` + `./scripts/ci.sh`, dejando
   constancia en el handoff de que las suites corrieron contra el entorno que
   el lock instala.

### No bloqueantes (correctos, sin accion)

- `langgraph>=1.2.1,<1.2.2`: pin estrecho intencionado y justificado en la
  review (1.2.4 cuelga la suite); el lock resuelve `langgraph==1.2.1` y el
  test de estructura asegura `1.2.4` fuera. Correcto.
- `mcp>=1.27.2,<2` y `temporalio>=1.28.0,<2`: coherentes con lo instalado
  (1.27.2 / 1.28.0) y con el lock.
- Extra `redis = ["redis>=5,<6"]` declarado como `optional-dependencies`; no
  vuelve obligatoria la instalacion base. El lock (compilado con
  `--all-extras`) fija `redis==5.3.1`. Correcto.
- `consumers/metrics.py:163` mantiene el import lazy y el `RuntimeError`
  menciona `pip install "orchestrator-langgraph[redis]"`. Correcto.
- `requirements.lock` generado desde los manifests con `uv pip compile`
  (cabecera autogenerada lo documenta), no un `pip freeze` sucio. Correcto.
- README Quickstart documenta `uv pip sync requirements.lock` +
  `pip install --no-deps -e` y el comando de regeneracion. Correcto.
- Tests de estructura nuevos (C0-T1) cubren bounds, lockfile, README y
  mensaje del extra; tests antiguos actualizados de forma minima.
- Alcance limpio: sin tocar `policies/` ni `gateway/src/`, sin commitear
  `.venv/`, CHANGELOG con `Closes V3 C/0/0`.

## Verification

- `git diff develop...HEAD` (49d3fdb + f0007d0) revisado fichero a fichero.
- `.venv/bin/pip show rich` → 15.0.0; `grep rich requirements.lock` →
  `rich==14.3.4` (hallazgo bloqueante confirmado).
- `.venv/bin/pytest tests/structure/test_python_reproducibility.py` — 3 passed.
- `.venv/bin/pytest orchestrator-langgraph/tests` — 81 passed, 3 skipped.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` — "All checks passed".
- Nota: estas suites verdes corren sobre el venv actual (rich 15.0.0), no
  sobre el entorno que `requirements.lock` instala; no sustituyen a C0-T2.

## Verdict

**KO** — corregir unicamente los 4 puntos de "Correccion concreta" en trial 2.
