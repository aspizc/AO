# A/0/04 trial17 — operator live witness

Date: 2026-10-08T08:33:28.825Z. Disposable Gateway, repository and tmux server.
Runtime: tmux 3.6a-agents.3; Codex codex-cli 0.160.1; Claude Code 2.1.294 (Claude Code).

Candidate SHA-256:

- `gateway/src/adapters/base_adapter.js`: `9c9a96b15e11f293c2e32d1ca73f8d7a07d43c227b40a9f5e536dc777b39b247`
- `tests/gateway/prompt_submission.test.js`: `fa39402b1f64f867694d08a50b9e99b295cc42b49a31363185088c17993fe1da`
- `tests/gateway/fixtures/codex_0_160_1_warning_only_draft.json`: `fe1aef6bdd039d395667d0822314f9a5904012d253745fc1e3b289be43a9570f`

The disposable run spawned one Codex and one Claude Code session, asked each once through `agent.ask`, and returned `askReturned=true` and `acceptance=true` for both. Codex displayed the exact answer on row 18; Claude displayed it on row 8. The private run recorded no manual Enter after `agent.ask`. The transport input count was not captured separately. The Codex token also appears in its status row. This witness covers one run and does not prove the rare warning-only draft was encountered or that all future asks succeed.

## codex

Measured model: `gpt-6.1-sol`; effort: `medium`. Pre-ask and final pane grids below replace the disposable path, user/host and random reply token. Blank rows are retained.

### Before ask

```text
00| 
01|  >_ OpenAI Codex (v0.160.1)
02|     /fixture/agents-orchestrator/live
03|
04|  Back for another round?
05|
06|  To get started, describe a task or try one of these commands:
07|
08|  /init - create an AGENTS.md file with instructions for Codex
09|  /status - show current session configuration
10|  /permissions - choose what Codex is allowed to do
11|  /model - choose what model and reasoning effort to use     
12|  /review - review any changes and find issues                        
13|                                                                        
14|                                                                         
15|                                                                          
16|                                                                          
17|                                                                           
18|                                                                            
19|                                                                            
20|                                                                             
21|                                                                            
22|                                                                            
23|                                                                           
24|                                                                         
25|                                                                      
26|                                                                     
27|                                                                   
28|
29|
30|
31|
32|
33|
34|
35|
36|› Ask Codex to do anything
37|
38|  GPT-6.1-Sol medium fast · /fixture/agents-orchestrator/live 
39|  ? for shortcuts                                                                             ⚠ 2 warnings · f2 to view
40|
```

### After reply

```text
00| 
01|  >_ OpenAI Codex (v0.160.1)
02|     /fixture/agents-orchestrator/live
03|
04|  Back for another round?
05|
06|  To get started, describe a task or try one of these commands:
07|
08|  /init - create an AGENTS.md file with instructions for Codex
09|  /status - show current session configuration
10|  /permissions - choose what Codex is allowed to do
11|  /model - choose what model and reasoning effort to use     
12|  /review - review any changes and find issues                        
13|                                                                        
14|                                                                         
15|› Reply exactly <TOKEN>. Do not use tools.                 
16|                                                                          
17|                                                                           
18|• <TOKEN>                                                    
19|                                                                            
20|                                                                             
21|                                                                            
22|                                                                            
23|                                                                           
24|                                                                         
25|                                                                      
26|                                                                     
27|                                                                   
28|
29|
30|
31|
32|
33|                                 
34|
35|
36|› Ask Codex to do anything                               
37|
38|  GPT-6.1-Sol medium fast · /fixture/agents-orchestrator/live · Reply exactly <TOKEN>
39|  ? for shortcuts                                                                             ⚠ 2 warnings · f2 to view
40|
```

## claude-code

Measured model: `claude-opus-5-5`; effort: `medium`. Pre-ask and final pane grids below replace the disposable path, user/host and random reply token. Blank rows are retained.

### Before ask

```text
00|
01| ▐▛███▛█   Claude Code v2.1.294
02|▝▜██████▀  Opus 5.5 with medium effort · Claude Max
03| ▝▝   ▝▝   /fixture/agents-orchestrator/live
04|
05|
06|
07|
08|
09|
10|
11|
12|
13|
14|
15|
16|
17|
18|
19|
20|
21|
22|
23|
24|
25|
26|
27|
28|
29|
30|
31|
32|
33|
34|                                                                                                    ◐ medium · /effort
35|────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
36|❯ Try "how do I log an error?"
37|────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
38|
39|  ⏵⏵ auto mode on (shift+tab to cycle) · ← for agents
40|
```

### After reply

```text
00|
01| ▐▛███▛█   Claude Code v2.1.294
02|▝▜██████▀  Opus 5.5 with medium effort · Claude Max
03| ▝▝   ▝▝   /fixture/agents-orchestrator/live
04|
05|
06|❯ Reply exactly <TOKEN>. Do not use tools.
07|
08|● <TOKEN>
09|
10|✻ Sautéed for 1s · done 10:33 AM
11|
12|
13|
14|
15|
16|
17|
18|
19|
20|
21|
22|
23|
24|
25|
26|
27|
28|
29|
30|
31|
32|
33|
34|                                                                                                    ◐ medium · /effort
35|────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
36|❯                                                              
37|────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
38|  <user>@<host>:/fixture/agents-orchestrator/live
39|  ⏵⏵ auto mode on (shift+tab to cycle) · ← for agents
40|
```

Limitations: this live transcript records a successful first ask for each provider on the hashed candidate. It does not establish the warning-only draft branch was exercised, a raw keystroke count, or behavior after provider upgrades. Earlier private runs included intermittent fail-closed Codex and Claude refusals; their causes remain limited to the measured layouts documented in the review trail.
