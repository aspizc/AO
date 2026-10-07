import unittest

from src.tool import greeting


class GreetingTests(unittest.TestCase):
    def test_library_preserves_requested_recipient(self):
        self.assertEqual(greeting("operator"), "Hello, operator!")
