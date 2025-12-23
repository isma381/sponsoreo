17:51:40.194 Running build in Portland, USA (West) – pdx1
17:51:40.194 Build machine configuration: 2 cores, 8 GB
17:51:40.304 Cloning github.com/isma381/sponsoreo (Branch: obj-2, Commit: 6b2a9ca)
17:51:40.897 Cloning completed: 593.000ms
17:51:41.187 Restored build cache from previous deployment (ELeVcDaNghq6CNCqNSZVC4mvCFtw)
17:51:41.725 Running "vercel build"
17:51:42.123 Vercel CLI 50.1.3
17:51:42.416 Installing dependencies...
17:51:43.531 
17:51:43.531 up to date in 919ms
17:51:43.532 
17:51:43.532 168 packages are looking for funding
17:51:43.532   run `npm fund` for details
17:51:43.557 Detected Next.js version: 16.1.0
17:51:43.562 Running "npm run build"
17:51:43.666 
17:51:43.667 > Sponsoreo@0.1.0 build
17:51:43.667 > next build
17:51:43.667 
17:51:44.373 ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
17:51:44.379 ▲ Next.js 16.1.0 (Turbopack)
17:51:44.380 - Experiments (use with caution):
17:51:44.380   · optimizePackageImports
17:51:44.380 
17:51:44.449   Creating an optimized production build ...
17:51:44.773 ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
17:51:55.488 ✓ Compiled successfully in 10.7s
17:51:55.515   Running TypeScript ...
17:51:55.859 
17:51:55.870   We detected TypeScript in your project and reconfigured your tsconfig.json file for you.
17:51:55.872   The following suggested values were added to your tsconfig.json. These values can be changed to fit your project's needs:
17:51:55.872 
17:51:55.872   	- include was updated to add '.next/dev/types/**/*.ts'
17:51:55.872 
17:51:55.872   The following mandatory changes were made to your tsconfig.json:
17:51:55.873 
17:51:55.873   	- jsx was set to react-jsx (next.js uses the React automatic runtime)
17:51:55.873 
17:52:02.035 Failed to compile.
17:52:02.037 
17:52:02.037 ./app/api/transfers/route.ts:410:60
17:52:02.037 Type error: Cannot find name 'chainId'.
17:52:02.037 
17:52:02.037 [0m [90m 408 |[39m     [36mconst[39m finalTransfers [33m=[39m [36mawait[39m executeQuery(finalQuery[33m,[39m [])[33m;[39m
17:52:02.037  [90m 409 |[39m
17:52:02.038 [31m[1m>[22m[39m[90m 410 |[39m     [36mconst[39m formattedFinal [33m=[39m formatTransfers(finalTransfers[33m,[39m chainId)[33m;[39m
17:52:02.038  [90m     |[39m                                                            [31m[1m^[22m[39m
17:52:02.038  [90m 411 |[39m
17:52:02.038  [90m 412 |[39m     [36mreturn[39m [33mNextResponse[39m[33m.[39mjson({
17:52:02.038  [90m 413 |[39m       transfers[33m:[39m formattedFinal[33m,[39m[0m
17:52:02.063 Next.js build worker exited with code: 1 and signal: null
17:52:02.095 Error: Command "npm run build" exited with 1