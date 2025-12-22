// Simple workflow validator using accumulated rules

const fs = require('fs');

function validateWorkflow(workflowPath) {
  const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
  const issues = [];

  // Rule 1: Check file paths
  const sshNodes = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.ssh');
  sshNodes.forEach(node => {
    const command = node.parameters?.command || '';
    if (command.includes('GRIMLOCK') && !command.includes('/grimlock/')) {
      issues.push({
        node: node.name,
        rule: '[PATH] Always Use Full Paths',
        issue: 'Missing /grimlock/ subdirectory in path'
      });
    }
  });

  // Rule 2: Check for JSON.parse on .md files
  const codeNodes = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.code');
  codeNodes.forEach(node => {
    const code = node.parameters?.jsCode || '';
    if (code.includes('JSON.parse') && code.includes('.md')) {
      issues.push({
        node: node.name,
        rule: '[FORMAT] YAML Frontmatter Parsing',
        issue: 'Using JSON.parse on .md file (likely YAML frontmatter)'
      });
    }
  });

  // Rule 3: Check for js-yaml
  codeNodes.forEach(node => {
    const code = node.parameters?.jsCode || '';
    if (code.includes('js-yaml') || code.includes('require(\'yaml\')')) {
      issues.push({
        node: node.name,
        rule: '[MODULE] No js-yaml in N8N Cloud',
        issue: 'Attempting to use unavailable module'
      });
    }
  });

  return issues;
}

// CLI usage
if (process.argv[2]) {
  const issues = validateWorkflow(process.argv[2]);
  if (issues.length === 0) {
    console.log('✅ Workflow validation passed');
  } else {
    console.log('❌ Validation issues found:');
    issues.forEach(issue => {
      console.log(`\n  Node: ${issue.node}`);
      console.log(`  Rule: ${issue.rule}`);
      console.log(`  Issue: ${issue.issue}`);
    });
    process.exit(1);
  }
}

module.exports = { validateWorkflow };
