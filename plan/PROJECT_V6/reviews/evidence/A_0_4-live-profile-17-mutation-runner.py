import pathlib,tempfile,shutil,subprocess,json,hashlib
root=pathlib.Path.cwd();source=(root/'gateway/src/adapters/base_adapter.js').read_text()
start=source.index('    // One measured post-paste footer variant')
end=source.index('    const footer = rows.findLastIndex',start)
gstart=source.index('      if (pending.warningDraft || guard.warningDraft)')
gend=source.index('      guardedSubmit(run, guard, attempt);',gstart)
mutations={
 'phase':('classifier','phase !== "draft"','false'),
 'version':('classifier','rows[1]?.trim() !== ">_ OpenAI Codex (v0.160.1)"','false'),
 'cursor':('classifier','pane.cursorX !== text.length + 2','false'),
 'status':('classifier','!codexLiveStatus.test(rows[38])','false'),
 'history':('classifier','rows.slice(13, 36).some((row) => row.trim() !== "")','false'),
 'prior-working':('classifier','rows.slice(0, 36).some((row) => codexWorking.test(row))','false'),
 'gap':('classifier','rows[37]?.trim() !== ""','false'),
 'first-enter':('guard','attempt !== 0','false'),
 'stable-capture':('guard','guard.snapshot !== pending.snapshot','false'),
 'process':('guard','[ready, pending].some((frame) => ["serverPid", "target", "panePid", "width", "height"]','[].some((frame) => ["serverPid", "target", "panePid", "width", "height"]'),
 'ready-prefix':('guard','ready.snapshot.split("\\n").slice(0, 36).join("\\n") !== pending.snapshot.split("\\n").slice(0, 36).join("\\n")','false'),
 'ready-status':('guard','ready.snapshot.split("\\n")[38] !== pending.snapshot.split("\\n")[38]','false'),
}
results={}
for name,(kind,before,after) in mutations.items():
 a,b=(start,end) if kind=='classifier' else (gstart,gend)
 segment=source[a:b];assert segment.count(before)==1,name
 mutated=source[:a]+segment.replace(before,after)+source[b:]
 with tempfile.TemporaryDirectory(prefix='a04-trial17-mutation-') as tmp:
  scratch=pathlib.Path(tmp)
  for directory in ['gateway/src','gateway/contracts','tests/gateway/fixtures']:shutil.copytree(root/directory,scratch/directory)
  for file in ['gateway/package.json','tests/gateway/prompt_submission.test.js']:
   dest=scratch/file;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/file,dest)
  (scratch/'gateway/node_modules').symlink_to(root/'gateway/node_modules',target_is_directory=True)
  (scratch/'gateway/src/adapters/base_adapter.js').write_text(mutated)
  run=subprocess.run(['node','--test','tests/gateway/prompt_submission.test.js'],cwd=scratch,capture_output=True)
  pathlib.Path('/tmp/a04-trial17-mutation-'+name+'.log').write_bytes(run.stdout+run.stderr)
  failures=[s for s in run.stdout.decode().splitlines() if s.startswith('not ok')]
  results[name]={'exitCode':run.returncode,'mutantSha256':hashlib.sha256(mutated.encode()).hexdigest(),'failures':failures}
pathlib.Path('/tmp/a04-trial17-mutations.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
assert all(r['exitCode']==1 and any('trial17' in s for s in r['failures']) for r in results.values())
