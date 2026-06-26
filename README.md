# esix.github.io

Personal site built with [Hexo](https://hexo.io/) + landscape theme.
Hosted at https://esix.github.io.

Demo projects (`source/demo/`) are stored as built static files. GitHub Actions can rebuild them from their own repos when a demo repo explicitly triggers a site rebuild.

---

## Local development

Install dependencies:
```bash
npm install
```

Start local server with drafts:
```bash
npm start
```

Preview at http://localhost:4000.

### Updating demo projects locally

Build all demos and copy their output into `source/demo/`:
```bash
yarn update-demos
```

This requires the demo project repos to be checked out as siblings of this repo:
```
~/pro/
  esix.github.io/   ← this repo
  mmheroes/
  ball-to-goal/
```

Then regenerate and preview:
```bash
npm run build
npm start
```

---

## Deployment

Pushing to `master` triggers GitHub Actions, which:
1. Runs `hexo generate`
2. Deploys to GitHub Pages

When a demo repo triggers `repository_dispatch`, the workflow first rebuilds the demo projects and copies their output into `source/demo/`, then builds and deploys the site.

You never need to deploy manually.

### Demo project auto-rebuild

When you push to `master` in a demo repo, its CI pipeline:
1. Builds the project (catches errors early)
2. Triggers a rebuild of this site via `repository_dispatch`

#### One-time setup: create the PAT secret

1. Go to https://github.com/settings/tokens and create a **classic token** with `repo` scope. Name it e.g. `SITE_DEPLOY_TOKEN`.
2. Add this token as a secret named `SITE_DEPLOY_TOKEN` in **each demo repo**:
   - https://github.com/esix/mmheroes/settings/secrets/actions
   - https://github.com/esix/ball-to-goal/settings/secrets/actions

After that, pushing to any demo repo will automatically rebuild the site.

---

## Adding a new demo project

1. **In `update-demos.mjs`** — add an entry:
   ```js
   { name: 'my-project', src: resolve(SITE_DIR, '../my-project'), dist: resolve(SITE_DIR, '../my-project/dist') },
   ```

2. **In `.github/workflows/pages.yml`** — add checkout, cache, build, and copy steps (copy the mmheroes block and adjust names/paths).

3. **In the new project's repo** — add `.github/workflows/trigger-site.yml` (copy from mmheroes, change the `demo` value in the payload). Add the `SITE_DEPLOY_TOKEN` secret to that repo.
