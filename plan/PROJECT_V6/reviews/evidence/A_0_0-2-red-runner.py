import io, json, os, pathlib, shutil, subprocess, tarfile, tempfile
root = pathlib.Path.cwd()
scratch = pathlib.Path(tempfile.mkdtemp(prefix="ao-a00-trial2-red-"))
archive = subprocess.check_output(["git", "archive", "e42818c2b9d72eebc88d858965fafa45c0fa1417", "gateway", "policies", "tests"])
with tarfile.open(fileobj=io.BytesIO(archive)) as tar: tar.extractall(scratch, filter="data")
shutil.copyfile(root / "tests/gateway/cli_write_access.test.js", scratch / "tests/gateway/cli_write_access.test.js")
(scratch / "gateway/node_modules").symlink_to((root / "gateway/node_modules").resolve())
command = ["/usr/bin/node", "--test", "--test-name-pattern=profile policy", "tests/gateway/cli_write_access.test.js"]
env = dict(os.environ, PATH="/usr/bin:/bin")
with (root / "plan/PROJECT_V6/reviews/evidence/A_0_0-2-red.txt").open("x") as log:
    log.write("Base: e42818c2b9d72eebc88d858965fafa45c0fa1417\nScratch: " + str(scratch) + "\nCommand: " + " ".join(command) + "\nPATH=/usr/bin:/bin\n"); log.flush()
    result = subprocess.run(command, cwd=scratch, env=env, stdout=log, stderr=subprocess.STDOUT)
    log.write(f"\nExit code: {result.returncode}\n")
print("RED exit:", result.returncode, "Scratch:", scratch)
