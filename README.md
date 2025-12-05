# cat-ate-my-source-code

A pragmatic backup & restore CLI tool for code projects, focused on disaster recovery and redundancy habits.

> "The Cat Ate My Source Code" - Inspired by *The Pragmatic Programmer*, this tool helps you develop good backup habits and protect your code from disasters.

## Features

- ✅ **Versioned Backups**: Timestamped backups for easy tracking
- ✅ **Multiple Projects**: Configure and backup multiple code projects
- ✅ **Exclude Patterns**: Skip `node_modules`, `.git`, and other unnecessary files
- ✅ **Retention Policy**: Automatically prune old backups
- ✅ **Dry-Run Mode**: Preview what will be backed up
- ✅ **Cross-Platform**: Works on macOS, Linux, and Windows
- ✅ **Config-Driven**: Simple JSON configuration
- 🔜 **Remote Backups**: Interface designed for rsync/SCP (implementation stubbed)

## Installation

### For End Users

Install globally via npm:

```bash
npm install -g cat-ate-my-source-code
```

After installation, use the CLI directly:

```bash
cat-ate-my-source-code backup --project my-app
```

**Or use without installation** (via npx):

```bash
npx cat-ate-my-source-code backup --project my-app
```

### For Developers

Clone the repository and build from source:

```bash
git clone https://github.com/KyPython/cat-ate-my-source-code.git
cd cat-ate-my-source-code
npm install
npm run build
```

For local development:

```bash
npm link  # Creates a global symlink to your local build
```

## Configuration

Create a configuration file in one of these locations:

1. `cat-ate-my-source-code.config.json` in your current working directory
2. `~/.cat-ate-my-source-code/config.json` in your home directory

### Example Configuration

```json
{
  "projects": [
    {
      "name": "my-app",
      "path": "/Users/me/dev/my-app",
      "exclude": ["node_modules", ".git", "dist", "*.log"]
    }
  ],
  "backupTargets": [
    {
      "name": "local-disk",
      "type": "local",
      "path": "/Users/me/backups"
    }
  ],
  "retention": {
    "maxBackupsPerProject": 10
  }
}
```

### Configuration Options

- **projects**: Array of project configurations
  - `name`: Unique project identifier
  - `path`: Absolute or relative path to project directory
  - `exclude`: Array of glob patterns to exclude (e.g., `["node_modules", ".git"]`)

- **backupTargets**: Array of backup destinations
  - `name`: Unique target identifier
  - `type`: `"local"` or `"remote"` (remote is stubbed)
  - `path`: Destination path for backups
  - `ssh`: (Remote only) SSH connection details

- **retention**: Retention policy
  - `maxBackupsPerProject`: Maximum number of backups to keep per project (default: 10)

- **compression**: Enable compression (not yet implemented, default: false)

## Usage

**Note**: The example config file (`cat-ate-my-source-code.config.json`) contains placeholder paths. Update it with your actual project paths before use.

### Backup Commands

Backup a specific project:

```bash
cat-ate-my-source-code backup --project my-app
```

Backup all projects:

```bash
cat-ate-my-source-code backup --all
```

Dry-run to preview:

```bash
cat-ate-my-source-code backup --project my-app --dry-run
```

### List Backups

List all backups for a project:

```bash
cat-ate-my-source-code list --project my-app
```

List backups for all projects:

```bash
cat-ate-my-source-code list
```

### Restore Commands

Restore a backup to a destination:

```bash
cat-ate-my-source-code restore --project my-app --backup 2025-01-15T10-30-00Z --dest /tmp/restore-my-app
```

**Note**: The restore command will not overwrite existing directories by default. Choose a destination that doesn't exist, or use `--in-place` (not yet implemented) with confirmation.

### Check Configuration

Validate your configuration file:

```bash
cat-ate-my-source-code check
```

### Global Options

- `--config <path>`: Specify a custom config file path
- `--verbose` or `-v`: Enable verbose output
- `--dry-run`: Preview operations without making changes

## Backup Structure

Backups are organized as follows:

```
backups/
  └── my-app/
      ├── 2025-01-15T10-30-00Z/
      │   └── [project files]
      ├── 2025-01-15T14-20-00Z/
      │   └── [project files]
      └── ...
```

Each backup is a timestamped directory containing a complete copy of the project (excluding specified patterns).

## Retention Policy

After creating a new backup, the tool automatically removes the oldest backups that exceed `maxBackupsPerProject`. This keeps your backup storage manageable while maintaining a history of recent backups.

## Development

### Build

```bash
npm run build
```

### Run in Development

```bash
npm start backup --project my-app
```

### Test

```bash
npm test
```

## Philosophy

This tool embodies the principles from *The Pragmatic Programmer*:

- **Always Use Version Control**: While Git is essential, backups provide an additional safety net
- **Backup Early, Backup Often**: Automated backups help you develop good habits
- **Design for Failure**: Multiple backup targets and retention policies ensure redundancy
- **DRY (Don't Repeat Yourself)**: Config-driven approach means you define your projects once

The name "cat-ate-my-source-code" is a playful reference to the book's discussion about excuses and the importance of having backups. When disaster strikes (hardware failure, accidental deletion, etc.), you'll be glad you have backups.

## Limitations & Future Work

- **Remote Backups**: Interface is designed but implementation is stubbed. Future versions will support rsync/SCP.
- **Compression**: Config option exists but compression is not yet implemented.
- **In-Place Restore**: `--in-place` flag is designed but not yet implemented for safety.

## License

MIT



