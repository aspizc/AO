import pathlib,tempfile,shutil,subprocess,json,hashlib
root=pathlib.Path.cwd()
with tempfile.TemporaryDirectory(prefix='a04-trial16-red-') as tmp:
 scratch=pathlib.Path(tmp)
 for directory in ['gateway/src','gateway/contracts','tests/gateway/fixtures']:
  shutil.copytree(root/directory,scratch/directory)
 for name in ['gateway/package.json','tests/gateway/prompt_submission.test.js']:
  dest=scratch/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/name,dest)
 (scratch/'gateway/node_modules').symlink_to(root/'gateway/node_modules',target_is_directory=True)
 baseline=root/'plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-16-entry-base_adapter.js'
 shutil.copy2(baseline,scratch/'gateway/src/adapters/base_adapter.js')
 result=subprocess.run(['node','--test','tests/gateway/prompt_submission.test.js'],cwd=scratch,capture_output=True)
 pathlib.Path('/tmp/a04-trial16-red-final.log').write_bytes(result.stdout+result.stderr)
 pathlib.Path('/tmp/a04-trial16-red-result.json').write_text(json.dumps({'exitCode':result.returncode,'baselineSha256':hashlib.sha256(baseline.read_bytes()).hexdigest(),'testSha256':hashlib.sha256((root/'tests/gateway/prompt_submission.test.js').read_bytes()).hexdigest(),'fixtureSha256':hashlib.sha256((root/'tests/gateway/fixtures/codex_0_160_1_welcome_working.json').read_bytes()).hexdigest()},indent=2)+'\n')
 assert result.returncode==1 and b'# fail 2' in result.stdout
print('Corrected fixture and final tests reproduce two RED failures against trial15 source.')
