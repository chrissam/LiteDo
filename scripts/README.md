# Scripts

This directory contains utility scripts for LiteDo.

## generate-sample.js

A Node.js script that generates large sample JSON files for testing and development purposes.

### Usage

```bash
# Generate 10,000 sample tasks
node scripts/generate-sample.js 10000 > ~/Downloads/large-sample.json

# Generate 5,000 sample tasks (default)
node scripts/generate-sample.js > sample.json

# Generate 1,000 sample tasks
node scripts/generate-sample.js 1000 > small-sample.json
```

### Command Line Arguments

- **First argument**: Number of tasks to generate (default: 2000)
- **Output**: Use `>` to redirect output to a file

### Examples

```bash
# Generate a large file for performance testing
node scripts/generate-sample.js 50000 > ~/Downloads/performance-test.json

# Generate a small file for quick testing
node scripts/generate-sample.js 100 > test-data.json

# View the output in terminal (not recommended for large numbers)
node scripts/generate-sample.js 10
```

### Generated Data Structure

The script creates realistic sample data with:
- **Tasks**: Random titles, descriptions, and priorities
- **Tags**: From a predefined pool (work, home, personal, study, etc.)
- **Dates**: Random creation and due dates within the last 180 days
- **Subtasks**: Random number of subtasks with completion status
- **Completion**: Realistic completion patterns

### File Format

Output is valid JSON that can be imported directly into LiteDo:
- Use the "Import JSON" feature in the File Management dropdown
- Or drag and drop the generated file onto the application

### Requirements

- Node.js installed on your system
- Run from the project root directory
