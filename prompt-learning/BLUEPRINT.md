# GRIMLOCK Prompt Learning System - BLUEPRINT

A self-improving system that learns from n8n workflow failures and accumulates institutional knowledge.

---

## Current State

### Completed (Week 0-1)
- [x] Project structure created (`/home/ubuntu/projects/grimlock/prompt-learning/`)
- [x] `CLAUDE.md` - Initial rules file with seed knowledge
- [x] `teacher_prompt_n8n.md` - Teacher LLM prompt for failure analysis
- [x] `test_learning_loop.sh` - Simulated learning loop test
- [x] `grimlock_validator.js` - Rule-based workflow validator
- [x] Tested validator against real workflows (Escalation Handler, Heartbeat Monitor)
- [x] Demonstrated 3-rule detection: PATH, FORMAT, MODULE

### Completed (Design Wizard - Dec 2024)
- [x] Design Wizard configuration files created
  - `config/design-wizard.yaml` - Question tree
  - `config/context-efficiency.yaml` - Token thresholds
  - `config/validation-rules.yaml` - Warning rules
- [x] `docs/MCP_BEST_PRACTICES.md` - Context efficiency guidelines
- [x] `~/.claude/skills/grimlock-design/SKILL.md` - Claude Code skill
- [x] Design Wizard integrated into existing Command Parser workflow
- [x] Context Analyzer workflow created (ID: sajDhAvgzCcPxtTR)
- [x] PRD template updated with `context_efficiency` and `design_origin` sections

### Completed (PromptLearning Extension - Dec 23, 2024)
- [x] Manual failure reporting added to `/home/ubuntu/projects/PromptLearning/`
- [x] Domain-specific prompts for planning/integration/workflow errors
- [x] First GRIMLOCK lesson captured: "Check n8n workflows before creating new"
- [x] Rule appended to `~/.claude/CLAUDE.md`

### Files Created
```
prompt-learning/
├── BLUEPRINT.md              # This file
├── CLAUDE.md                 # Accumulated rules (7 rules)
├── teacher_prompt_n8n.md     # Teacher LLM prompt template
├── test_learning_loop.sh     # Learning loop simulation
├── grimlock_validator.js     # Static workflow validator
├── failure_log.txt           # Sample failure log
├── escalation_handler.json   # Exported workflow (passes)
├── heartbeat_monitor.json    # Exported workflow (passes)
└── bad_workflow_example.json # Test case (fails - 3 violations)

config/
├── design-wizard.yaml        # Question tree for Design Wizard
├── context-efficiency.yaml   # Token thresholds (3500/4500/7000)
└── validation-rules.yaml     # PRD validation rules
```

---

## Two Learning Systems

### 1. GRIMLOCK Prompt Learning (This System)
**Focus**: n8n workflow-specific failures
**Location**: `/home/ubuntu/projects/grimlock/prompt-learning/`
**Rules stored**: `./CLAUDE.md` (n8n-specific rules)

```
n8n Execution Failure → grimlock_validator.js → Teacher LLM → Rule
```

### 2. PromptLearning (General System)
**Focus**: All failure types (tests, planning, integration, architecture)
**Location**: `/home/ubuntu/projects/PromptLearning/`
**Rules stored**: `~/.claude/CLAUDE.md` (global rules)

```
pytest failures  ─┐
manual reports   ─┼→ Teacher LLM → Rule → ~/.claude/CLAUDE.md
semantic analysis─┘
```

### Integration Point
GRIMLOCK-specific failures can be reported to PromptLearning for global learning:
```bash
python3 /home/ubuntu/projects/PromptLearning/orchestrator.py report-failure \
  --failure-type workflow_error \
  --description "Webhook path missing in trigger node" \
  --context "n8n requires explicit webhook paths" \
  --task "Create GRIMLOCK heartbeat workflow"
```

---

## Success Metrics & Timeline

### Week 1: Foundation ✅ COMPLETE
**Goal**: Can generate one new rule from a simulated failure

| Task | Status | Notes |
|------|--------|-------|
| Create project structure | ✅ Done | |
| Write Teacher LLM prompt | ✅ Done | `teacher_prompt_n8n.md` |
| Create basic validator | ✅ Done | 3 rules implemented |
| Simulate failure → rule generation | ✅ Done | `test_learning_loop.sh` |
| Connect to real Claude API | ✅ Done | Via PromptLearning integration |
| Test with real n8n failure | ✅ Done | SSH timeout failures captured |

### Week 2: Design Wizard ✅ COMPLETE
**Goal**: Interactive MCP design with context efficiency guidance

| Task | Status | Notes |
|------|--------|-------|
| Create config files | ✅ Done | design-wizard.yaml, context-efficiency.yaml |
| Create best practices docs | ✅ Done | MCP_BEST_PRACTICES.md |
| Claude Code skill | ✅ Done | ~/.claude/skills/grimlock-design/ |
| n8n workflow integration | ✅ Done | Integrated into Command Parser |
| Context Analyzer | ✅ Done | Standalone workflow |

### Week 3: PromptLearning Integration ✅ COMPLETE
**Goal**: Capture non-test failures for global learning

| Task | Status | Notes |
|------|--------|-------|
| Manual failure reporting CLI | ✅ Done | `report-failure` command |
| Domain-specific prompts | ✅ Done | 6 failure types supported |
| First lesson captured | ✅ Done | Integration error rule |
| Config schema extended | ✅ Done | failure_sources, failure_prompts |

### Week 4: Rule Accumulation (IN PROGRESS)
**Goal**: CLAUDE.md has 20+ n8n-specific rules

| Task | Status | Notes |
|------|--------|-------|
| Create orchestrator for n8n failures | ⬜ Pending | Fetch failures → Teacher → Append rules |
| Categorize rules by type | ⬜ Pending | PATH, FORMAT, MODULE, etc. |
| Add validation for each new rule | ⬜ Pending | Extend `grimlock_validator.js` |
| Reach 10 rules | 🔄 In Progress | Currently at 7 |
| Reach 20 rules | ⬜ Pending | |

### Week 5: Validation Coverage
**Goal**: Validator catches 3/4 of recent failure types

| Task | Status | Notes |
|------|--------|-------|
| Audit last 20 workflow failures | ⬜ Pending | Categorize by root cause |
| Generate rules for each pattern | ⬜ Pending | |
| Measure catch rate | ⬜ Pending | Target: 75% |
| Add complex pattern detection | ⬜ Pending | Multi-node issues |
| Create regression test suite | ⬜ Pending | Bad workflow examples |

### Week 6: Zero Repeats
**Goal**: Zero repeated failures from previously-learned patterns

| Task | Status | Notes |
|------|--------|-------|
| Integrate validator into workflow creation | ⬜ Pending | Pre-flight checks |
| Add pre-commit hook for n8n exports | ⬜ Pending | |
| Track repeat failure rate | ⬜ Pending | Target: 0% |
| Create dashboard/report | ⬜ Pending | Rules used, failures prevented |

---

## Lessons Learned (Captured via PromptLearning)

### 2024-12-23: Integration Error
**Failure**: Created redundant n8n workflow instead of extending existing Command Parser
**Rule Generated**:
```markdown
### Workflow Management
- **Rule**: Always check for existing workflows using `n8n_list_workflows` before creating a new workflow
- **When**: Implementing any new infrastructure workflow in n8n
- **Why**: Prevents redundant workflow creation and maintains efficient infrastructure management
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FAILURE SOURCES                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ n8n Errors  │  │   Manual    │  │  Semantic Analysis  │  │
│  │ (automated) │  │  (report)   │  │     (future)        │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼───────────────────┼──────────────┘
          │                │                   │
          ▼                ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                      FAILURE ROUTER                          │
│  Route by type: test_failure, planning_error, workflow_error │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    TEACHER LLM (Domain-Aware)                │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │ GRIMLOCK Teacher │  │ PromptLearning Teacher           │ │
│  │ (n8n-specific)   │  │ (planning, integration, arch)    │ │
│  └──────────────────┘  └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      RULE STORAGE                            │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │ prompt-learning/     │  │ ~/.claude/CLAUDE.md          │ │
│  │ CLAUDE.md            │  │ (global rules)               │ │
│  │ (n8n rules)          │  │                              │ │
│  └──────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      VALIDATION                              │
│  grimlock_validator.js → Check Workflows Against Rules       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      PREVENTION                              │
│  Pre-Flight Checks → Block Bad Workflows → Zero Repeats      │
└─────────────────────────────────────────────────────────────┘
```

---

## Rule Categories

| Category | Code | Description | Count |
|----------|------|-------------|-------|
| Path Errors | `[PATH]` | File path issues | 1 |
| Format Mismatches | `[FORMAT]` | Data format errors | 3 |
| Module Issues | `[MODULE]` | Unavailable dependencies | 1 |
| Circuit Breaker | `[CIRCUIT_BREAKER]` | Safety logic gaps | 1 |
| Integration | `[INTEGRATION]` | Multi-node/SSH failures | 2 |
| Security | `[SECURITY]` | Credential/access issues | 1 |

**Total Rules**: 7 (prompt-learning/CLAUDE.md) + 1 (global ~/.claude/CLAUDE.md)

---

## Quick Commands

```bash
# Test validator on a workflow
node grimlock_validator.js <workflow.json>

# Run learning loop simulation
./test_learning_loop.sh

# Report a failure to PromptLearning (global rules)
python3 /home/ubuntu/projects/PromptLearning/orchestrator.py report-failure \
  --failure-type workflow_error \
  --description "Description of what went wrong" \
  --context "What should have happened" \
  --task "Original task"

# View n8n-specific rules
cat /home/ubuntu/projects/grimlock/prompt-learning/CLAUDE.md

# View global rules (includes learned lessons)
cat ~/.claude/CLAUDE.md
```

---

## Next Priority Actions

### Immediate (This Week)
1. [ ] Test Design Wizard via Slack (`/grimlock design`)
2. [ ] Create 3 more n8n-specific rules from recent execution failures
3. [ ] Update grimlock_validator.js to validate new patterns

### Short-Term (Next 2 Weeks)
1. [ ] Create n8n workflow to auto-fetch failed executions
2. [ ] Automate rule generation from execution errors
3. [ ] Reach 15 total rules

### Medium-Term (Next Month)
1. [ ] Pre-flight validation before workflow activation
2. [ ] Measure and track repeat failure rate
3. [ ] Create learning analytics dashboard

---

## Related Projects

| Project | Path | Purpose |
|---------|------|---------|
| GRIMLOCK | `/home/ubuntu/projects/grimlock/` | MCP Server Factory |
| PromptLearning | `/home/ubuntu/projects/PromptLearning/` | General meta-learning system |
| Ratchet | `/home/ubuntu/projects/ratchet/` | First MCP server to be built |

---

*Last Updated: 2024-12-23*
*Phase: Week 4 - Rule Accumulation*
