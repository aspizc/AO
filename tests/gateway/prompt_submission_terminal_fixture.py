"""Owned raw terminal: transport/classification proof, never a provider fixture."""
import os
from pathlib import Path
import select
import sys
import termios
import tty

directory = Path(sys.argv[1])
provider = sys.argv[2] if len(sys.argv) > 2 else "codex"
previous = termios.tcgetattr(0)
tty.setraw(0)
prompt = None
accepted = False


def draw():
    history = (directory / "history").read_text() if (directory / "history").exists() else ""
    if provider == "claude-code":
        draft = 'Try "fixture example"' if prompt is None else "" if accepted else prompt
        footer = "esc to interrupt" if accepted else "? for shortcuts"
        content = history + "\r\n" + "─" * 120 + "\r\n❯\u00a0" + draft + "\r\n" + "─" * 120 + "\r\n" + footer
        cursor_x = 2 if prompt is None or accepted else len(draft) + 2
        os.write(1, ("\x1b[?2004h\x1b[2J\x1b[H" + content + f"\x1b[3;{cursor_x + 1}H").encode())
        return
    draft = "Ask Codex to do anything" if prompt is None or accepted else prompt
    rows = draft.split("\n")
    content = history + "\r\n\r\n"
    if accepted:
        content += "• Working (0s • esc to interrupt)\r\n\r\n"
    start = content.count("\r\n")
    content += "› " + "\r\n  ".join(rows) + "\r\n\r\n  ? for shortcuts  100% context left"
    cursor_y = start + (0 if prompt is None or accepted else len(rows) - 1)
    cursor_x = 2 if prompt is None or accepted else len(rows[-1]) + 2
    os.write(1, ("\x1b[?2004h\x1b[2J\x1b[H" + content
                 + f"\x1b[{cursor_y + 1};{cursor_x + 1}H").encode())


try:
    draw()
    data = b""
    with (directory / "received").open("ab", buffering=0) as received:
        while True:
            if select.select([0], [], [], 0.01)[0]:
                chunk = os.read(0, 65536)
                if not chunk:
                    break
                received.write(chunk)
                data += chunk
                if prompt is None and b"\x1b[201~" in data:
                    prompt = data.split(b"\x1b[200~", 1)[1].split(b"\x1b[201~", 1)[0].decode()
                    draw()
                if prompt is not None and data.endswith(b"\r"):
                    accepted = True
                    draw()
finally:
    termios.tcsetattr(0, termios.TCSANOW, previous)
