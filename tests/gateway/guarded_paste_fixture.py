"""Record terminal input independently of a provider or shell paste parser."""

import os
from pathlib import Path
import select
import sys
import termios
import tty


directory = Path(sys.argv[1])
previous = termios.tcgetattr(0)
tty.setraw(0)
last_mode = None
try:
    with (directory / "received").open("ab", buffering=0) as received:
        while True:
            mode = (directory / "mode").read_text()
            if mode != last_mode:
                sequence, enabled = mode.split(":")
                os.write(1, b"\x1b[?2004h" if enabled == "on" else b"\x1b[?2004l")
                os.write(1, f"\r\nfixture-mode:{sequence}:{enabled}\r\n".encode())
                last_mode = mode
            if select.select([0], [], [], 0.01)[0]:
                data = os.read(0, 65536)
                if not data:
                    break
                received.write(data)
finally:
    termios.tcsetattr(0, termios.TCSANOW, previous)
