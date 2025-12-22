#!/bin/bash

# Simulate a failure log
cat > failure_log.txt << 'FAILLOG'
Workflow: Heartbeat Monitor
Node: Parse State File
Error: Unexpected token in JSON at position 0
Context: Attempted JSON.parse() on GRIMLOCK_STATE.md which contains YAML frontmatter
Root Cause: Format assumption mismatch - .md file treated as JSON
FAILLOG

# Call Teacher LLM to analyze
echo "Analyzing failure..."
# (You'll implement this with actual Claude API call)

# Expected output: New rule appended to CLAUDE.md
echo "
### [FORMAT] Never JSON.parse YAML Frontmatter Files

**Rule**: GRIMLOCK state files use YAML frontmatter. Always use regex extraction, not JSON.parse().

**Pattern to avoid**:
\`\`\`javascript
// ❌ WRONG
const state = JSON.parse(fileContent);
\`\`\`

**Correct pattern**:
\`\`\`javascript
// ✅ CORRECT
const yamlMatch = fileContent.match(/^---\n([\s\S]*?)\n---/);
\`\`\`

**Validation**: Check for JSON.parse() calls on .md files
" >> CLAUDE.md

echo "✅ Rule generated and appended to CLAUDE.md"
