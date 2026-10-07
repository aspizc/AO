import sys, os, json, dataclasses, importlib.util
from pathlib import Path
root=Path.cwd()
spec=importlib.util.spec_from_file_location('ci_gate',root/'scripts/ci_gate.py')
gate=importlib.util.module_from_spec(spec); sys.modules[spec.name]=gate; spec.loader.exec_module(gate)
original=gate._discover_process_handles
seen=set()
def observe(containment):
    records=gate._owned_process_records(containment,gate._process_records())
    for pid, record in records.items():
        key=(record.identity,record.parent_pid,record.state)
        if key in seen: continue
        seen.add(key)
        try: command=Path(f'/proc/{pid}/cmdline').read_bytes().replace(b'\0',b' ').decode(errors='replace')
        except OSError: command=''
        print(json.dumps({'event':'owned','pid':pid,'ppid':record.parent_pid,'pgid':record.identity.process_group,'startToken':record.identity.start_time,'state':record.state,'command':command,'stat':Path(f'/proc/{pid}/stat').read_text()}),flush=True)
    return original(containment)
gate._discover_process_handles=observe
argv=['node','--test','--test-concurrency=1',*sys.argv[1:]]
outcome=gate._execute_command_serial(argv,root,dict(os.environ),180)
Path('/tmp/a05-trial2-probe-tap.txt').write_bytes(outcome.stdout+outcome.stderr)
print(json.dumps({'status':outcome.status,'exitCode':outcome.returncode}),flush=True)
