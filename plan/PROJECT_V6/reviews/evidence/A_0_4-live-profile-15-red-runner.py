import pathlib, tempfile, shutil, subprocess, json, hashlib, sys
root=pathlib.Path(sys.argv[1]).resolve()
with tempfile.TemporaryDirectory(prefix='a04-trial15-red-') as tmp:
    scratch=pathlib.Path(tmp)
    for directory in ['gateway/src','gateway/contracts','tests/gateway/fixtures']:
        shutil.copytree(root/directory,scratch/directory)
    for name in ['gateway/package.json','tests/gateway/claude_first_prompt.test.js']:
        dest=scratch/name; dest.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(root/name,dest)
    (scratch/'gateway/node_modules').symlink_to(root/'gateway/node_modules',target_is_directory=True)
    baseline=root/'plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-15-entry-base_adapter.js'
    shutil.copy2(baseline,scratch/'gateway/src/adapters/base_adapter.js')
    argv=['node','--test','tests/gateway/claude_first_prompt.test.js']
    result=subprocess.run(argv,cwd=scratch,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    pathlib.Path('/tmp/a04-trial15-red-final.log').write_bytes(result.stdout)
    pathlib.Path('/tmp/a04-trial15-red-result.json').write_text(json.dumps({'argv':argv,'exitCode':result.returncode,'baselineSha256':hashlib.sha256(baseline.read_bytes()).hexdigest(),'testSha256':hashlib.sha256((root/'tests/gateway/claude_first_prompt.test.js').read_bytes()).hexdigest()},indent=2)+'\n')
    assert result.returncode==1 and b'# tests 41' in result.stdout and b'# fail 2' in result.stdout
print('Final tests reproduce two intended failures on trial14 source.')
