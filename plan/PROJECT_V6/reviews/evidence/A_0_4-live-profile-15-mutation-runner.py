import pathlib,tempfile,shutil,subprocess,json,hashlib
root=pathlib.Path.cwd()
source=(root/'gateway/src/adapters/base_adapter.js').read_text()
mutations={
 'geometry':('    || [pending, guard, after].some((frame) => ["width", "height"].some((key) => frame[key] !== ready[key]))',''),
 'process':('!spawn || [ready, pending, guard, after].some((frame) => identity.some((key) => frame[key] !== spawn[key]))','!spawn'),
}
results={}
for name,(before,after) in mutations.items():
 assert source.count(before)==2
 with tempfile.TemporaryDirectory(prefix='a04-trial15-mutation-') as tmp:
  scratch=pathlib.Path(tmp)
  for directory in ['gateway/src','gateway/contracts','tests/gateway/fixtures']:
   shutil.copytree(root/directory,scratch/directory)
  for file in ['gateway/package.json','tests/gateway/claude_first_prompt.test.js']:
   dest=scratch/file;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/file,dest)
  (scratch/'gateway/node_modules').symlink_to(root/'gateway/node_modules',target_is_directory=True)
  mutated=source.replace(before,after)
  (scratch/'gateway/src/adapters/base_adapter.js').write_text(mutated)
  argv=['node','--test','tests/gateway/claude_first_prompt.test.js']
  run=subprocess.run(argv,cwd=scratch,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  pathlib.Path('/tmp/a04-trial15-mutation-'+name+'.log').write_bytes(run.stdout)
  results[name]={'exitCode':run.returncode,'mutantSha256':hashlib.sha256(mutated.encode()).hexdigest(),'failures':[line for line in run.stdout.decode().splitlines() if line.startswith('not ok')]}
  assert run.returncode==1 and any('trial15' in line for line in results[name]['failures'])
pathlib.Path('/tmp/a04-trial15-mutations.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
