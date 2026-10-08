import pathlib, tempfile, shutil, subprocess, json, hashlib
root = pathlib.Path.cwd()
source = (root/'gateway/src/adapters/base_adapter.js').read_text()
a = source.index('function codexPostTurnPane')
b = source.index('function codexGap', a)
c = source.index('      if (pending.warningDraft || guard.warningDraft)')
d = source.index('      guardedSubmit(run, guard, attempt);', c)
mutations = {
 'geometry':(a,b,'pane.width !== 120 || pane.height !== 40','false'),
 'cursor-row':(a,b,'pane.cursor !== 36','false'),
 'capture':(a,b,'rows.length !== 41 || rows[40] !== ""','false'),
 'width':(a,b,'rows.some((row) => row.length > pane.width)','false'),
 'header':(a,b,'!codexUpdateWelcomeHeader(rows, pane.width)','false'),
 'cwd-length':(a,b,'rows[10].slice(5).length !== 87','false'),
 'Ready-status':(a,b,'rows[38] !== `  GPT-6.1-Sol medium fast · ${rows[10].slice(5)} · R…`','false'),
 'prior-prompt':(a,b,'/^› [\\x21-\\x7e][\\x20-\\x7e]*$/.test(row)','true'),
 'response':(a,b,'/^• [\\x21-\\x7e][\\x20-\\x7e]*$/.test(row)','true'),
 'completion':(a,b,'/^ {2}Worked for [0-9]{1,5}s • (?:[01][0-9]|2[0-3]):[0-5][0-9] *$/.test(row)','true'),
 'blank-history':(a,b,'/^ *$/.test(row)','true'),
 'gap':(a,b,'!/^ *$/.test(rows[37])','false'),
 'ready-cursor':(a,b,'pane.cursorX !== 2','false'),
 'placeholder':(a,b,'!/^› Ask Codex to do anything *$/.test(rows[36])','false'),
 'ready-footer':(a,b,'rows[39] !== "  ? for shortcuts" + " ".repeat(77) + "⚠ 2 warnings · f2 to view"','false'),
 'draft-ascii':(a,b,'/[^\\x20-\\x7e]/.test(text)','false'),
 'draft-cursor':(a,b,'pane.cursorX !== text.length + 2','false'),
 'draft-footer':(a,b,'rows[39] !== " ".repeat(94) + "⚠ 2 warnings · f2 to view"','false'),
 'phase':(a,b,'else return null;','else text = "";'),
 'first-enter':(c,d,'attempt !== 0','false'),
 'stable-capture':(c,d,'guard.snapshot !== pending.snapshot','false'),
 'process':(c,d,'[ready, pending].some((frame) => ["serverPid", "target", "panePid", "width", "height"]','[].some((frame) => ["serverPid", "target", "panePid", "width", "height"]'),
 'ready-prefix':(c,d,'ready.snapshot.split("\\n").slice(0, 36).join("\\n") !== pending.snapshot.split("\\n").slice(0, 36).join("\\n")','false'),
}
variants={'red':subprocess.check_output(['git','show','fecc3e5:gateway/src/adapters/base_adapter.js'],cwd=root).decode()}
for name,(start,end,before,after) in mutations.items():
 segment=source[start:end];assert segment.count(before)==1,name
 variants[name]=source[:start]+segment.replace(before,after)+source[end:]
results={}
with tempfile.TemporaryDirectory(prefix='a04-startup4-checks-') as tmp:
 scratch=pathlib.Path(tmp)
 for directory in ['gateway/src','gateway/contracts','tests/gateway/fixtures']:shutil.copytree(root/directory,scratch/directory)
 for file in ['gateway/package.json','tests/gateway/prompt_submission.test.js']:
  dest=scratch/file;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/file,dest)
 (scratch/'gateway/node_modules').symlink_to(root/'gateway/node_modules',target_is_directory=True)
 for name,mutated in variants.items():
  (scratch/'gateway/src/adapters/base_adapter.js').write_text(mutated)
  run=subprocess.run(['node','--test','tests/gateway/prompt_submission.test.js'],cwd=scratch,capture_output=True)
  pathlib.Path('/tmp/a04-startup4-'+name+'.log').write_bytes(run.stdout+run.stderr)
  results[name]={'exitCode':run.returncode,'sourceSha256':hashlib.sha256(mutated.encode()).hexdigest(),'failures':[line for line in run.stdout.decode().splitlines() if line.startswith('not ok')]}
pathlib.Path('/tmp/a04-startup4-mutations.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
assert all(result['exitCode']==1 and result['failures'] for result in results.values())
