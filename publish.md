# How to publish packages

*NOTE: Quit VS Code and any typescript compile --watch process you might have, or else they cause some dist/ files in the packages to be missing.*

## 1. Bump up the version for the package

Either do it manually for the changed package in the `package.json` file or use the following command to update the version of all the packages, even unchanged ones: 

`pnpm -r exec npm version patch`

## 2. Do a dry-run first

To do a dry run for all the packages use the following command:

`pnpm -r publish --access public --no-git-checks --dry-run`

If you want to dry-run a specific package, `cd` into the package directory and use the following command:

`pnpm publish --access public --no-git-checks --dry-run`


## 3. Publish the packages

To publish all the packages with updated versions use the following command:

`pnpm -r publish --access public --no-git-checks` 

If you want to publish a specific package, `cd` into the package directory and use the following command:

`pnpm publish --access public --no-git-checks`


## 4. Keep contributing ❤️
