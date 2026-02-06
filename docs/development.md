# Development workflow (optional)

This doc is for collaborators. If you're a hackathon judge/reviewer, you can ignore this and use the setup steps in the root README.

## Branching

- Create a feature branch per person: `feature-<name>`
- Merge into `develop` after your change is tested

### First-time setup example

```bash
git checkout -b feature-yourname
git add .
git commit -m "init"
git push origin feature-yourname
```

### Create `develop` (if missing)

```bash
git checkout -b develop
git push origin develop
```

### Sync & merge

```bash
git fetch origin
git checkout develop
git pull origin develop

git merge feature-yourname
git push origin develop
```

## Common errors

- `fatal: couldn't find remote ref develop` → the remote branch doesn’t exist yet; create/push it.
- `error: pathspec 'develop' did not match any file(s) known to git` → you don’t have the branch locally; create it.
- `fatal: a branch named 'feature-...' already exists` → reuse the existing branch.
