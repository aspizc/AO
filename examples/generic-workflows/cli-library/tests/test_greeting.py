import subprocess
import sys
import unittest

from greeting import greeting


class GreetingTest(unittest.TestCase):
    def test_cli_uses_library_greeting(self):
        result = subprocess.run([sys.executable, "greeting.py", "Ada"], capture_output=True, text=True, check=True)
        self.assertEqual(result.stdout.strip(), greeting("Ada"))
        self.assertEqual(result.stdout.strip(), "Hello, Ada!")
