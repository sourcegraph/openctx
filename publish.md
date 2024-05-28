# How to publish packages

*NOTE: Quit VS Code and any typescript compile --watch process you might have, or else they cause some dist/ files in the packages to be missing.*

### 1. Bump up the versions

Either do it manually for the changed package in the `package.json` file or use the following command to update the version of all the packages, even unchanged ones: 

`pnpm -r exec npm version patch`

### 2. Login to npmjs

Use the credentials for `sourcegraph-bot` from [1password](https://start.1password.com/open/i?a=HEDEDSLHPBFGRBTKAKJWE23XX4&v=dnrhbauihkhjs5ag6vszsme45a&i=oye4u4faaxmxxesugzqxojr4q4&h=team-sourcegraph.1password.com).

`pnpm login`

### 3. Do a dry-run first

To do a dry run for all the packages use the following command:

`pnpm -r publish --access public --no-git-checks --dry-run`

If you want to dry-run a specific package, `cd` into the package directory and use the following command:

`pnpm publish --access public --no-git-checks --dry-run`


### 4. Publish the packages

To publish all the packages with updated versions use the following command:

`pnpm -r publish --access public --no-git-checks` 

If you want to publish a specific package, `cd` into the package directory and use the following command:

`pnpm publish --access public --no-git-checks`


### 5. Keep contributing ❤️
