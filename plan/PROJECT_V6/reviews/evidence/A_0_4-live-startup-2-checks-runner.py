import pathlib, tempfile, shutil, subprocess, json, hashlib, gzip
root = pathlib.Path.cwd()
source = (root / 'gateway/src/adapters/base_adapter.js').read_text()
a = source.index('function codexUpdateWelcomeDraft')
b = source.index('function codexGap', a)
c = source.index('    // One measured post-paste footer variant')
d = source.index('    const footer = rows.findLastIndex', c)
e = source.index('      if (pending.updateWelcomeDraft')
f = source.index('      guardedSubmit(run, guard, attempt);', e)
mutations = {
 'notice': (a,b,'codexStartupNotice.every((row, index) => rows[index] === row)','true'),
 'cwd': (a,b,'/^ {5}(?:\\/|~\\/)[A-Za-z0-9_./-]+$/.test(rows[10])','true'),
 'width': (a,b,'rows[index].length <= width','true'),
 'blank-padding': (a,b,'/^ *$/.test(rows[11])','true'),
 'greeting': (a,b,'codexStartupGreetings.has(greeting)','true'),
 'greeting-padding': (a,b,'/^ *$/.test(rows[12].slice(greeting.length))','true'),
 'status-padding': (a,b,'/^ *$/.test(rows[38].slice(status.length))','true'),
 'cwd-status': (a,b,'rows[38].trimEnd() === status','true'),
 'exact-footer': (a,b,'rows[39] === " ".repeat(94) + "⚠ 2 warnings · f2 to view"','true'),
 'ready-footer': (e,f,'ready.snapshot.split("\\n")[39] !== "  ? for shortcuts" + " ".repeat(77) + "⚠ 2 warnings · f2 to view"','false'),
 'phase': (c,d,'phase !== "draft"','false'),
 'cursor': (c,d,'pane.cursorX !== text.length + 2','false'),
 'history': (c,d,'rows.slice(13, 36).some((row) => row.trim() !== "")','false'),
 'ascii': (c,d,'/[^\\x20-\\x7e]/.test(text)','false'),
 'first-enter': (e,f,'attempt !== 0','false'),
 'stable-capture': (e,f,'guard.snapshot !== pending.snapshot','false'),
 'process': (e,f,'[ready, pending].some((frame) => ["serverPid", "target", "panePid", "width", "height"]','[].some((frame) => ["serverPid", "target", "panePid", "width", "height"]'),
 'ready-prefix': (e,f,'ready.snapshot.split("\\n").slice(0, 36).join("\\n") !== pending.snapshot.split("\\n").slice(0, 36).join("\\n")','false'),
}
entry = root / 'plan/PROJECT_V6/reviews/evidence/A_0_4-live-startup-2-entry-source.js.gz'
variants = {'red': gzip.decompress(entry.read_bytes()).decode()}
for name,(start,end,before,after) in mutations.items():
 segment = source[start:end]
 assert segment.count(before) == 1, name
 variants[name] = source[:start] + segment.replace(before,after) + source[end:]
results = {}
with tempfile.TemporaryDirectory(prefix='a04-startup2-checks-') as tmp:
 scratch = pathlib.Path(tmp)
 for directory in ['gateway/src','gateway/contracts','tests/gateway/fixtures']:
  shutil.copytree(root/directory,scratch/directory)
 for file in ['gateway/package.json','tests/gateway/prompt_submission.test.js']:
  dest = scratch/file
  dest.parent.mkdir(parents=True,exist_ok=True)
  shutil.copy2(root/file,dest)
 (scratch/'gateway/node_modules').symlink_to(root/'gateway/node_modules',target_is_directory=True)
 for name,mutated in variants.items():
  (scratch/'gateway/src/adapters/base_adapter.js').write_text(mutated)
  run = subprocess.run(['node','--test','--test-name-pattern=startup|trial17','tests/gateway/prompt_submission.test.js'],cwd=scratch,capture_output=True)
  pathlib.Path('/tmp/a04-startup2-'+name+'.log').write_bytes(run.stdout+run.stderr)
  results[name] = {'exitCode':run.returncode,'sourceSha256':hashlib.sha256(mutated.encode()).hexdigest(),'failures':[line for line in run.stdout.decode().splitlines() if line.startswith('not ok')]}
pathlib.Path('/tmp/a04-startup2-mutations.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
assert all(result['exitCode'] == 1 and result['failures'] for result in results.values())
