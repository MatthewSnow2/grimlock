# GRIMLOCK Prompt Learning System - BLUEPRINT

A self-improving system that learns from n8n workflow failures and accumulates institutional knowledge.

---

## Current State

### Completed (Week 0)
- [x] Project structure created (`/home/ubuntu/projects/grimlock/prompt-learning/`)
- [x] `CLAUDE.md` - Initial rules file with seed knowledge
- [x] `teacher_prompt_n8n.md` - Teacher LLM prompt for failure analysis
- [x] `test_learning_loop.sh` - Simulated learning loop test
- [x] `grimlock_validator.js` - Rule-based workflow validator
- [x] Tested validator against real workflows (Escalation Handler, Heartbeat Monitor)
- [x] Demonstrated 3-rule detection: PATH, FORMAT, MODULE

### Files Created
```
prompt-learning/
├── BLUEPRINT.md              # This file
├── CLAUDE.md                 # Accumulated rules (currently 4 rules)
├── teacher_prompt_n8n.md     # Teacher LLM prompt template
├── test_learning_loop.sh     # Learning loop simulation
├── grimlock_validator.js     # Static workflow validator
├── failure_log.txt           # Sample failure log
├── escalation_handler.json   # Exported workflow (passes)
├── heartbeat_monitor.json    # Exported workflow (passes)
└── bad_workflow_example.json # Test case (fails - 3 violations)
```

---

## Success Metrics & Timeline

### Week 1: Foundation ✅ (In Progress)
**Goal**: Can generate one new rule from a simulated failure

| Task | Status | Notes |
|------|--------|-------|
| Create project structure | ✅ Done | |
| Write Teacher LLM prompt | ✅ Done | `teacher_prompt_n8n.md` |
| Create basic validator | ✅ Done | 3 rules implemented |
| Simulate failure → rule generation | ✅ Done | `test_learning_loop.sh` |
| Connect to real Claude API | ⬜ Pending | Replace hardcoded rule generation |
| Test with real n8n failure | ⬜ Pending | Use actual execution failure |

### Week 2: Rule Accumulation
**Goal**: CLAUDE.md has 20+ n8n-specific rules

| Task | Status | Notes |
|------|--------|-------|
| Create orchestrator script | ⬜ Pending | Fetch failures → Teacher → Append rules |
| Categorize rules by type | ⬜ Pending | PATH, FORMAT, MODULE, CIRCUIT_BREAKER, SECURITY, INTEGRATION |
| Add validation for each new rule | ⬜ Pending | Extend `grimlock_validator.js` |
| Create n8n workflow for learning loop | ⬜ Pending | Automate the process |
| Reach 10 rules | ⬜ Pending | |
| Reach 20 rules | ⬜ Pending | |

### Week 3: Validation Coverage
**Goal**: Validator catches 3/4 of recent failure types

| Task | Status | Notes |
|------|--------|-------|
| Audit last 20 workflow failures | ⬜ Pending | Categorize by root cause |
| Generate rules for each pattern | ⬜ Pending | |
| Measure catch rate | ⬜ Pending | Target: 75% |
| Add complex pattern detection | ⬜ Pending | Multi-node issues |
| Create regression test suite | ⬜ Pending | Bad workflow examples |

### Week 4: Zero Repeats
**Goal**: Zero repeated failures from previously-learned patterns

| Task | Status | Notes |
|------|--------|-------|
| Integrate validator into workflow creation | ⬜ Pending | Pre-flight checks |
| Add pre-commit hook for n8n exports | ⬜ Pending | |
| Track repeat failure rate | ⬜ Pending | Target: 0% |
| Create dashboard/report | ⬜ Pending | Rules used, failures prevented |

---

## Phase 2: Next Steps (Priority Order)

### Step 1: Real Teacher LLM Integration
Replace the simulated rule generation with actual Claude API calls.

**File**: `orchestrator.py`
```python
# Pseudocode
1. Fetch failed execution from n8n API
2. Extract error details (node, message, context)
3. Call Claude API with teacher_prompt_n8n.md + failure data
4. Parse response for new rule
5. Append rule to CLAUDE.md
6. Optionally update grimlock_validator.js
```

**Acceptance Criteria**:
- [ ] Takes execution ID as input
- [ ] Generates properly formatted rule
- [ ] Appends to CLAUDE.md without duplicates
- [ ] Logs the learning event

### Step 2: Automated Failure Detection
Create n8n workflow to detect failures and trigger learning.

**Workflow**: `GRIMLOCK Learning Loop`
```
Schedule (hourly)
  → List recent executions (status: error)
  → Filter: not already processed
  → For each failure:
      → Call orchestrator via SSH/webhook
      → Mark as processed
  → Post summary to Slack
```

### Step 3: Dynamic Validator Updates
Extend validator to read rules from CLAUDE.md dynamically.

**Enhancement**:
```javascript
// grimlock_validator.js v2
function loadRulesFromClaudeMd() {
  // Parse CLAUDE.md for rule patterns
  // Generate validation checks dynamically
}
```

### Step 4: Pre-Flight Validation Workflow
Validate workflows BEFORE activation.

**Workflow**: `GRIMLOCK Pre-Flight Check`
```
Webhook: /grimlock/validate
  → Receive workflow JSON
  → Run grimlock_validator.js
  → Return pass/fail with details
  → Block activation if critical issues
```

---

## Long-Term Vision

### Month 1: Basic Prevention
- Prevents path errors
- Prevents format mismatches
- Prevents module unavailability
- **Rules**: ~25

### Month 3: Pattern Recognition
- Recognizes circuit breaker gaps
- Detects integration anti-patterns
- Identifies credential issues
- **Rules**: ~75

### Month 6: Predictive Analysis
- Predicts failures before they occur
- Suggests improvements proactively
- Learns from near-misses
- **Rules**: ~150

### Month 12: Institutional Knowledge
- Complete GRIMLOCK knowledge base
- Consulted before any workflow change
- Documents why patterns exist
- **Rules**: ~300+

---

## Rule Categories

| Category | Code | Description | Current Count |
|----------|------|-------------|---------------|
| Path Errors | `[PATH]` | File path issues | 1 |
| Format Mismatches | `[FORMAT]` | Data format errors | 2 |
| Module Issues | `[MODULE]` | Unavailable dependencies | 1 |
| Circuit Breaker | `[CIRCUIT_BREAKER]` | Safety logic gaps | 1 |
| Security | `[SECURITY]` | Credential/access issues | 0 |
| Integration | `[INTEGRATION]` | Multi-node failures | 0 |

**Total Rules**: 5 (Target Week 2: 20+)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FAILURE DETECTION                        │
│  n8n Execution History → Filter Errors → Queue for Learning │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      TEACHER LLM                             │
│  Failure Context + teacher_prompt_n8n.md → Generate Rule    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     RULE STORAGE                             │
│  CLAUDE.md ← Append New Rule (deduplicated)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      VALIDATION                              │
│  grimlock_validator.js → Check Workflows Against Rules      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      PREVENTION                              │
│  Pre-Flight Checks → Block Bad Workflows → Zero Repeats     │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Commands

```bash
# Test validator on a workflow
node grimlock_validator.js <workflow.json>

# Run learning loop simulation
./test_learning_loop.sh

# Export workflow from n8n (manual)
# n8n UI → Workflow → ... → Download

# View current rules
cat CLAUDE.md
```

---

## Notes

- Every failure makes the system stronger
- Rules should be specific and testable
- Include code examples in every rule
- Validation methods enable automation
- Start simple, iterate fast

---

*Last Updated: 2025-12-20*
*Phase: Week 1 - Foundation*
