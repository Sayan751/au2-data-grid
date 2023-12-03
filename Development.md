# Release workflow

- Update the versions in all package.json and package-lock.json files. Example, replace 1.0.0-alpha.1 with the new version; review the replacements carefully.
- Do a sanity check:
  - `npm ci`
  - `npm run build`
  - `npm run test`
- Commit the changes with the message `chore: bump version to <version>`.
- Tag the commit with the version number. Example, `git tag v1.0.0-alpha.1 -m v1.0.0-alpha.1`.
- Push the commit and the tag to GitHub. Example, `git push origin main --tags`.