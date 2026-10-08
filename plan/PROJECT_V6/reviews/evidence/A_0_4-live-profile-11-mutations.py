import gzip
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

root = Path(sys.argv[1]).resolve()
evidence = root / 'plan/PROJECT_V6/reviews/evidence'
prefix = 'A_0_4-live-profile-11'
mutations = [
    ('stale', 'gateway/src/adapters/base_adapter.js',
     'prior.some((lines) => lines.slice(0, 35).some((row) => row.trim() !== ""))',
     'false', 'trial11 an older identical completed turn'),
    ('attempt', 'gateway/src/adapters/base_adapter.js',
     'provider === "claude-code" && attempt === 0',
     'provider === "claude-code"', 'trial11 a completed response after the retry Enter'),
    ('kill', 'gateway/src/adapters/claude_adapter.js',
     'async kill({ tmuxTarget, traceId, role }) {\n    this.forgetFreshClaudeSpawn({ tmuxTarget });',
     'async kill({ tmuxTarget, traceId, role }) {', 'trial11 killing a plain-launch Claude'),
]
sha = lambda data: hashlib.sha256(data).hexdigest()
results = []
with tempfile.TemporaryDirectory(prefix='a04-trial11-mutations-') as temporary:
    scratch = Path(temporary)
    shutil.copytree(root / 'gateway/src', scratch / 'gateway/src')
    shutil.copytree(root / 'gateway/contracts', scratch / 'gateway/contracts')
    shutil.copy2(root / 'gateway/package.json', scratch / 'gateway/package.json')
    (scratch / 'gateway/node_modules').symlink_to((root / 'gateway/node_modules').resolve(), target_is_directory=True)
    (scratch / 'tests/gateway/fixtures').mkdir(parents=True)
    for name in ['claude_first_prompt.test.js', 'fixtures/a04_live_profiles_trial9.json']:
        shutil.copy2(root / 'tests/gateway' / name, scratch / 'tests/gateway' / name)
    for label, path, before, after, pattern in mutations:
        target = scratch / path
        original = target.read_bytes()
        text = original.decode()
        assert text.count(before) == 1, (label, text.count(before))
        mutant = text.replace(before, after).encode()
        target.write_bytes(mutant)
        command = ['node', '--test', '--test-name-pattern', pattern, 'tests/gateway/claude_first_prompt.test.js']
        outcome = subprocess.run(command, cwd=scratch, env=os.environ.copy(), stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        with (evidence / f'{prefix}-red-{label}.log.gz').open('xb') as stream:
            stream.write(gzip.compress(outcome.stdout, mtime=0))
        result = {'mutation': label, 'sourcePath': path, 'sourceSha256': sha(original),
                  'mutantSha256': sha(mutant), 'replace': {'before': before, 'after': after},
                  'testSha256': sha((scratch / 'tests/gateway/claude_first_prompt.test.js').read_bytes()),
                  'argv': command, 'exitCode': outcome.returncode,
                  'missingExpectedRejection': b'Missing expected rejection' in outcome.stdout,
                  'oneFailedTest': b'# fail 1\n' in outcome.stdout}
        results.append(result)
        target.write_bytes(original)
        assert outcome.returncode == 1 and result['missingExpectedRejection'] and result['oneFailedTest'], outcome.stdout.decode()
with (evidence / f'{prefix}-mutations.json').open('x') as stream:
    json.dump({'scratchOnly': True, 'results': results}, stream, indent=2)
    stream.write('\n')
print('Each of the three distinguishing tests fails on its isolated mutation with Missing expected rejection; production source untouched.')
