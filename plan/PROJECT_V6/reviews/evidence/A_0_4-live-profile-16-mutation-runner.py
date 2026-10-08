import pathlib,tempfile,shutil,subprocess,json,hashlib
root=pathlib.Path.cwd();source=(root/'gateway/src/adapters/base_adapter.js').read_text()
mutations={
 'attempt':('attempt !== 0','false'),
 'process':('[ready, pending].some((frame) => ["serverPid", "target", "panePid", "width", "height"]','[].some((frame) => ["serverPid", "target", "panePid", "width", "height"]'),
 'pending-history':('after.welcomeWork ? [ready, pending, guard] : [ready, guard]','[ready, guard]'),
 'echo-position':('index !== 15 ||','false ||'),
 'blank-transcript':('!rows.slice(16, 33).every((row) => row.trim() === "")','false'),
 'header':('rows[1]?.trim() === ">_ OpenAI Codex (v0.160.1)"','true'),
 'working':('codexWorking.test(rows[33])','true'),
 'gap34':('rows[34]?.trim() === ""','true'),
 'gap35':('rows[35]?.trim() === ""','true'),
}
results={}
for name,(before,after) in mutations.items():
 assert source.count(before)==1,(name,source.count(before))
 with tempfile.TemporaryDirectory(prefix='a04-trial16-mutation-') as tmp:
  scratch=pathlib.Path(tmp)
  for directory in ['gateway/src','gateway/contracts','tests/gateway/fixtures']:shutil.copytree(root/directory,scratch/directory)
  for file in ['gateway/package.json','tests/gateway/prompt_submission.test.js']:
   dest=scratch/file;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/file,dest)
  (scratch/'gateway/node_modules').symlink_to(root/'gateway/node_modules',target_is_directory=True)
  mutated=source.replace(before,after);(scratch/'gateway/src/adapters/base_adapter.js').write_text(mutated)
  run=subprocess.run(['node','--test','tests/gateway/prompt_submission.test.js'],cwd=scratch,capture_output=True)
  pathlib.Path('/tmp/a04-trial16-mutation-'+name+'.log').write_bytes(run.stdout+run.stderr)
  failures=[s for s in run.stdout.decode().splitlines() if s.startswith('not ok')]
  results[name]={'exitCode':run.returncode,'mutantSha256':hashlib.sha256(mutated.encode()).hexdigest(),'failures':failures}
pathlib.Path('/tmp/a04-trial16-mutations.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
assert all(r['exitCode']==1 and any('trial16' in s for s in r['failures']) for r in results.values())
