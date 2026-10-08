"""Isolated baseline RED and mutations; writes temporary copies/logs only to /tmp."""
import pathlib, tempfile, shutil, subprocess, json, hashlib
root = pathlib.Path.cwd()
source = (root/'gateway/src/adapters/base_adapter.js').read_text()
a = source.index('function freshCodexSecondTurn')
b = source.index('function freshCodexWork', a)
segment = source[a:b]
echo = ('rows[23].replace(/ +$/, "") !== `› ${prompt}`', 'false')
unique = ('rows.filter((row) => row.replace(/ +$/, "") === `› ${prompt}`).length !== 1', 'false')
stale = ('prior.some((before) => before.slice(0, 36).some((row) => row.replace(/ +$/, "") === `› ${prompt}`))', 'false')
capture = ('rows.length !== 41 || rows[40] !== ""', 'false')
tail = ('rows.slice(36).some((row, index) => row !== prior[0][index + 36])', 'false')
mutations = {
 'process': [('[ready, pending, after].some', '[ready, pending].some')],
 'mode': [('after.mode !== "0"', 'false')],
 'input-off': [('after.inputOff !== "0"', 'false')],
 'synchronized': [('after.synchronized !== "0"', 'false')],
 'cursor-row': [('after.cursorY !== "36"', 'false')],
 'cursor-column': [('after.cursorX !== "2"', 'false')],
 'ready-profile': [('!codexPostTurnPane(prior[0], { width: Number(ready.width), height: Number(ready.height),\n    cursor: Number(ready.cursorY), cursorX: Number(ready.cursorX) }, "ready")', 'false')],
 'capture': [capture],
 'width': [('rows.some((row) => row.length > 120)', 'false')],
 'old-history-prefix': [('prior.some((before) => rows.slice(0, 23).some((row, index) => row !== before[index]))', 'false')],
 'new-echo': [echo],
 'unique-echo': [unique],
 'prior-echo': [stale],
 'new-echo-and-unique': [echo, unique],
 'prior-echo-and-unique': [stale, unique],
 'composer-status-footer': [tail],
 'capture-and-tail': [capture, tail],
 'Working': [('codexWorking.test(rows[33])', 'true')],
 'assistant': [('/^• [\\x21-\\x7e][\\x20-\\x7e]*$/.test(rows[26])', 'true')],
 'completion': [('/^ {2}Worked for [0-9]{1,5}s • (?:[01][0-9]|2[0-3]):[0-5][0-9] *$/.test(rows[28])', 'true')],
 'blank-history': [('/^ *$/.test(row)', 'true')],
 'attempt': [('attempt !== 0', 'false')],
 'warning-binding': [('!pending.warningDraft || !guard.warningDraft', 'false')],
 'prompt-ascii': [('/[^\\x20-\\x7e]/.test(prompt) || prompt.endsWith(" ")', 'false')],
}
variants = {'red': subprocess.check_output(['git','show','3504b49:gateway/src/adapters/base_adapter.js'],cwd=root).decode()}
for name,replacements in mutations.items():
 altered=segment
 for before,after in replacements:
  assert altered.count(before) == (2 if name == 'blank-history' else 1), name
  altered=altered.replace(before,after)
 variants[name]=source[:a]+altered+source[b:]
results={}
with tempfile.TemporaryDirectory(prefix='a04-startup5-checks-') as tmp:
 scratch=pathlib.Path(tmp)
 for directory in ['gateway/src','gateway/contracts','tests/gateway/fixtures']: shutil.copytree(root/directory,scratch/directory)
 for file in ['gateway/package.json','tests/gateway/prompt_submission.test.js']:
  dest=scratch/file;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/file,dest)
 (scratch/'gateway/node_modules').symlink_to(root/'gateway/node_modules',target_is_directory=True)
 for name,mutated in variants.items():
  (scratch/'gateway/src/adapters/base_adapter.js').write_text(mutated)
  run=subprocess.run(['node','--test','tests/gateway/prompt_submission.test.js'],cwd=scratch,capture_output=True)
  pathlib.Path('/tmp/a04-startup5-'+name+'.log').write_bytes(run.stdout+run.stderr)
  results[name]={'exitCode':run.returncode,'sourceSha256':hashlib.sha256(mutated.encode()).hexdigest(),'failures':[line for line in run.stdout.decode().splitlines() if line.startswith('not ok')]}
pathlib.Path('/tmp/a04-startup5-mutations.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
# Single removals may overlap another conjunct. Preserve and report every survivor.
assert results['red']['exitCode']==1 and results['red']['failures']
