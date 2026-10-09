"""Disposable raw-terminal decision menus; commands are rendered, never run."""
import os
import pathlib
import select
import sys
import termios
import time
import tty

root = pathlib.Path(sys.argv[1])
kind = sys.argv[2]
initial = (root / 'pane.txt').read_text()
changed = initial.replace('npm test', 'changed-command').replace('/tmp/a06-fixture', '/tmp/changed-fixture')
original = termios.tcgetattr(0)
tty.setraw(0)
try:
    state = None
    while True:
        requested = (root / 'control').read_text() if (root / 'control').exists() else 'initial'
        if state != requested:
            pane = changed if requested == 'redraw' else initial
            os.write(1, ('\x1b[?2004h\x1b[2J\x1b[H' + pane.replace('\n', '\r\n')).encode())
            if (root / 'pending-wrap').exists():
                os.write(1, b"\x1b[?7h\x1b[?25l\x1b[23;1H" + b"X" * 80 + b"\x1b[2K\n")
            state = requested
            (root / 'drawn').write_text(requested)
        if select.select([0], [], [], 0.005)[0]:
            data = os.read(0, 4096)
            with (root / 'received').open('ab') as handle:
                handle.write(data)
        time.sleep(0.001)
finally:
    termios.tcsetattr(0, termios.TCSANOW, original)
