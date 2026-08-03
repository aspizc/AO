# U/0/4 Trial 1 - Human Check

## Decision Needing Human Review

`cross_trace_message_access_denied` is skipped with a TODO because the message store stage (S/0/0 and S/0/1) is deferred by ADR-004 and the MVP has no real message access API to exercise.

## Why This Was Chosen

The U/0/4 instructions allow controlled skips when a threat cannot be tested today, provided a TODO is traced. I avoided creating a fake message API only to satisfy the bypass test, because that would not test a real control.

## Human Review Question

Please confirm whether the skipped message-store bypass test is acceptable under the current MVP scope, or whether Stage S must be pulled into MVP before declaring U closed.
