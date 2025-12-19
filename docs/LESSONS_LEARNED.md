# GRIMLOCK Lessons Learned

Post-sprint retrospectives and accumulated knowledge.

---

## How to Use This Document

After each sprint:
1. Copy the Sprint Retrospective Template below
2. Fill in details while they're fresh
3. Extract key lessons to the Accumulated Knowledge section
4. Update patterns/anti-patterns as appropriate

---

## Sprint Retrospective Template

### Sprint: [PROJECT_NAME]
**Date:** [START_DATE] to [END_DATE]
**Duration:** [X] hours
**Final Status:** [SUCCESS / PARTIAL / FAILED / ABORTED]

#### Summary
[2-3 sentences describing what was accomplished]

#### Milestones
| Milestone | Status | Notes |
|-----------|--------|-------|
| M1 | Pass/Fail/Skip | |
| M2 | Pass/Fail/Skip | |
| ... | | |

#### What Worked Well
- [Item 1]
- [Item 2]
- [Item 3]

#### What Didn't Work
- [Item 1]: [Root cause] → [How we addressed it]
- [Item 2]: [Root cause] → [How we addressed it]

#### Escalations
| Severity | Count | Notable Issues |
|----------|-------|----------------|
| WARNING | [X] | |
| PAUSE | [X] | |
| EMERGENCY | [X] | |

#### Recommendations for Future Sprints
1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

---

## Accumulated Knowledge

### Patterns That Work

#### PRD Design
- **Specific success criteria:** Vague criteria lead to validation failures
- **Realistic milestones:** 1-3 hours per milestone is optimal
- **Clear scope boundaries:** Detection patterns prevent scope creep

#### State Management
- **Frequent commits:** Commit state after every significant action
- **Atomic updates:** Update one section at a time to avoid corruption
- **Recovery checkpoints:** Create checkpoints before risky operations

#### Communication
- **Heartbeat consistency:** Skip posts if no change to reduce noise
- **Escalation context:** Include last action and state snapshot
- **DM for critical:** Use DMs sparingly, only for PAUSE/EMERGENCY

### Anti-Patterns to Avoid

#### PRD Design
- **Overly ambitious scope:** Leads to timeout (CB001)
- **Missing validation methods:** Can't verify success criteria
- **Circular dependencies:** Milestone A needs B, B needs A

#### Execution
- **Long-running commands:** Can trigger timeout (E012)
- **Parallel file writes:** May cause Git conflicts (E021)
- **Ignoring warnings:** WARNING often precedes PAUSE

#### Recovery
- **Force-pushing state:** Loses history, breaks recovery
- **Skipping checkpoints:** Can't recover to known-good state
- **Ignoring circuit breakers:** They exist for good reasons

---

## Error Resolution Playbook

### E001: PRD File Not Found
**Root Cause:** File not committed or wrong path
**Prevention:** Always `git status` before starting sprint
**Fix:** Commit file, use correct path

### E002: Invalid PRD YAML
**Root Cause:** Syntax error in YAML
**Prevention:** Validate with `python3 -c "import yaml; yaml.safe_load(open('file.yaml'))"`
**Fix:** Use YAML linter, check for tabs vs spaces

### E010/E011: SSH Connection/Auth Failed
**Root Cause:** EC2 down, key expired, network issue
**Prevention:** Test SSH before sprint, use elastic IP
**Fix:** Check EC2 status, update credentials

### E020: State File Corrupted
**Root Cause:** Interrupted write, manual edit during sprint
**Prevention:** Never manually edit during active sprint
**Fix:** Restore from Git: `git checkout HEAD~1 -- GRIMLOCK_STATE.md`

### CB002: Consecutive Failures
**Root Cause:** Validation criteria not achievable or flawed
**Prevention:** Test validations manually before sprint
**Fix:** Review criteria, fix or skip milestone

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial template |

---

## Sprint Archive

### Sprint 1: GRIMLOCK (Self-Build)

*To be filled after first sprint*

---

*GRIMLOCK Lessons Learned v1.0 - December 2024*
