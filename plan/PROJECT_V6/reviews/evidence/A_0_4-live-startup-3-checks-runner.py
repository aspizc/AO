import pathlib, tempfile, shutil, subprocess, json, hashlib
root = pathlib.Path.cwd()
source = (root / 'gateway/src/adapters/base_adapter.js').read_text()
a = source.index('function codexUpdateWelcomeWork')
b = source.index('function codexGap', a)
c = source.index('function freshCodexWork(')
d = source.index('const sleep =', c)
mutations = {
 'geometry': (a,b,'pane.width === 120 && pane.height === 40','true'),
 'cursor': (a,b,'pane.cursor === 36 && pane.cursorX === 2','true'),
 'capture': (a,b,'rows.length === 41 && rows[40] === ""','true'),
 'width': (a,b,'rows.every((row) => row.length <= pane.width)','true'),
 'header': (a,b,'codexUpdateWelcomeHeader(rows, pane.width)','true'),
 'echo-shape': (a,b,'/^› [\\x20-\\x7e]+$/.test(row)','true'),
 'working': (a,b,'codexWorking.test(row)','true'),
 'blank-history': (a,b,'/^ *$/.test(row)','true'),
 'placeholder': (a,b,'/^› Ask Codex to do anything *$/.test(rows[36])','true'),
 'gap': (a,b,'/^ *$/.test(rows[37])','true'),
 'spinner': (a,b,'codexSpinnerStatus.test(rows[38])','true'),
 'cwd-status': (a,b,'rows[38].startsWith(status)','true'),
 'footer': (a,b,'rows[39] === "  ? for shortcuts" + " ".repeat(77) + "⚠ 2 warnings · f2 to view"','true'),
 'after-process': (c,d,'["serverPid", "target", "panePid", "width", "height"].some((key) => after[key] !== guard[key])','false'),
 'first-enter': (c,d,'attempt !== 0','false'),
 'prior-working': (c,d,'prior.some((rows) => rows.some((row) => codexWorking.test(row)))','false'),
 'new-echo': (c,d,'!before.some((row) => row.replace(/ +$/, "") === echo)','true'),
 'prefix': (c,d,'rows.slice(0, index).every((row, offset) => row === before[offset])','true'),
}
variants = {'red': subprocess.check_output(['git','show','82f8e74:gateway/src/adapters/base_adapter.js'],cwd=root).decode()}
for name,(start,end,before,after) in mutations.items():
 segment = source[start:end]
 assert segment.count(before) == 1, name
 variants[name] = source[:start]+segment.replace(before,after)+source[end:]
results = {}
with tempfile.TemporaryDirectory(prefix='a04-startup3-checks-') as tmp:
 scratch = pathlib.Path(tmp)
 for directory in ['gateway/src','gateway/contracts','tests/gateway/fixtures']:
  shutil.copytree(root/directory,scratch/directory)
 for file in ['gateway/package.json','tests/gateway/prompt_submission.test.js']:
  dest = scratch/file; dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/file,dest)
 (scratch/'gateway/node_modules').symlink_to(root/'gateway/node_modules',target_is_directory=True)
 for name,mutated in variants.items():
  (scratch/'gateway/src/adapters/base_adapter.js').write_text(mutated)
  run = subprocess.run(['node','--test','tests/gateway/prompt_submission.test.js'],cwd=scratch,capture_output=True)
  pathlib.Path('/tmp/a04-startup3-'+name+'.log').write_bytes(run.stdout+run.stderr)
  results[name] = {'exitCode':run.returncode,'sourceSha256':hashlib.sha256(mutated.encode()).hexdigest(),'failures':[line for line in run.stdout.decode().splitlines() if line.startswith('not ok')]}
pathlib.Path('/tmp/a04-startup3-mutations.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
assert [name for name, result in results.items() if result['exitCode'] == 0] == ['new-echo']
assert all(result['exitCode'] == 1 and result['failures'] for name, result in results.items() if name != 'new-echo')
