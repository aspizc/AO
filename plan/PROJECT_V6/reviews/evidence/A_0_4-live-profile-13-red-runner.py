import pathlib, tempfile, shutil, subprocess, json, hashlib, sys
root=pathlib.Path(sys.argv[1]).resolve()
original=(root/'gateway/src/adapters/base_adapter.js').read_text()
mutations=[
 ('stable-verb','trial13 a changed spinner verb',
  'freshClaude294Response(firstPromptProcess, ready, pending, guard, after, prompt, true) !== workingVerb',
  '!freshClaude294Response(firstPromptProcess, ready, pending, guard, after, prompt, true)'),
 ('completion-set','trial13 completion verbs outside',
  '(?:Baked|Brewed|Churned|Cogitated|Cooked|Crunched|Sautéed|Worked)', '[A-Z][A-Za-z]*'),
]
manifest=[]
with tempfile.TemporaryDirectory(prefix='a04-trial13-mutations-') as tmp:
    scratch=pathlib.Path(tmp)
    for directory in ['gateway/src','gateway/contracts','tests/gateway/fixtures']:
        shutil.copytree(root/directory,scratch/directory)
    for name in ['gateway/package.json','tests/gateway/claude_first_prompt.test.js']:
        dest=scratch/name; dest.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(root/name,dest)
    (scratch/'gateway/node_modules').symlink_to(root/'gateway/node_modules',target_is_directory=True)
    source=scratch/'gateway/src/adapters/base_adapter.js'
    baseline=root/'plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-13-entry-base_adapter.js'
    shutil.copy2(baseline,source)
    argv=['node','--test','tests/gateway/claude_first_prompt.test.js']
    result=subprocess.run(argv,cwd=scratch,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    pathlib.Path('/tmp/a04-trial13-red-reproduced.log').write_bytes(result.stdout)
    manifest.append({'mutation':'trial12-baseline','argv':argv,'exitCode':result.returncode,'sourceSha256':hashlib.sha256(baseline.read_bytes()).hexdigest(),'testSha256':hashlib.sha256((root/'tests/gateway/claude_first_prompt.test.js').read_bytes()).hexdigest()})
    assert result.returncode==1 and b'# tests 29' in result.stdout and b'# fail 8' in result.stdout
    for label,name,before,after in mutations:
        assert original.count(before)==1
        mutant=original.replace(before,after); source.write_text(mutant)
        argv=['node','--test','--test-name-pattern='+name,'tests/gateway/claude_first_prompt.test.js']
        result=subprocess.run(argv,cwd=scratch,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
        pathlib.Path('/tmp/a04-trial13-red-'+label+'.log').write_bytes(result.stdout)
        manifest.append({'mutation':label,'before':before,'after':after,'argv':argv,'exitCode':result.returncode,'sourceSha256':hashlib.sha256(original.encode()).hexdigest(),'mutantSha256':hashlib.sha256(mutant.encode()).hexdigest()})
        assert result.returncode==1 and b'Missing expected rejection' in result.stdout
    source.write_text(original)
pathlib.Path('/tmp/a04-trial13-mutations.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Two distinguishing rejection-guard mutations failed as intended.')
