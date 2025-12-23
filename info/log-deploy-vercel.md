17:59:51.579 Running build in Portland, USA (West) – pdx1
17:59:51.579 Build machine configuration: 2 cores, 8 GB
17:59:51.701 Cloning github.com/isma381/sponsoreo (Branch: obj-2, Commit: 0f4f2d1)
17:59:52.348 Cloning completed: 647.000ms
17:59:52.584 Restored build cache from previous deployment (ELeVcDaNghq6CNCqNSZVC4mvCFtw)
17:59:53.153 Running "vercel build"
17:59:53.585 Vercel CLI 50.1.3
17:59:53.904 Installing dependencies...
17:59:55.125 
17:59:55.126 up to date in 1s
17:59:55.126 
17:59:55.126 168 packages are looking for funding
17:59:55.126   run `npm fund` for details
17:59:55.155 Detected Next.js version: 16.1.0
17:59:55.161 Running "npm run build"
17:59:55.272 
17:59:55.273 > Sponsoreo@0.1.0 build
17:59:55.273 > next build
17:59:55.273 
17:59:56.011 ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
17:59:56.018 ▲ Next.js 16.1.0 (Turbopack)
17:59:56.019 - Experiments (use with caution):
17:59:56.019   · optimizePackageImports
17:59:56.019 
17:59:56.092   Creating an optimized production build ...
17:59:56.439 ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
18:00:07.848 ✓ Compiled successfully in 11.4s
18:00:07.853   Running TypeScript ...
18:00:08.051 
18:00:08.056   We detected TypeScript in your project and reconfigured your tsconfig.json file for you.
18:00:08.057   The following suggested values were added to your tsconfig.json. These values can be changed to fit your project's needs:
18:00:08.057 
18:00:08.057   	- include was updated to add '.next/dev/types/**/*.ts'
18:00:08.057 
18:00:08.058   The following mandatory changes were made to your tsconfig.json:
18:00:08.058 
18:00:08.058   	- jsx was set to react-jsx (next.js uses the React automatic runtime)
18:00:08.058 
18:00:14.449 Failed to compile.
18:00:14.450 
18:00:14.450 ./app/api/transfers/route.ts:96:50
18:00:14.450 Type error: Cannot find name 'defaultChainId'.
18:00:14.450 
18:00:14.450 [0m [90m 94 |[39m         transfers[33m:[39m formattedCached[33m,[39m
18:00:14.451  [90m 95 |[39m         total[33m:[39m formattedCached[33m.[39mlength[33m,[39m
18:00:14.451 [31m[1m>[22m[39m[90m 96 |[39m         chainId[33m:[39m cachedTransfers[[35m0[39m][33m?[39m[33m.[39mchain_id [33m||[39m defaultChainId[33m,[39m
18:00:14.451  [90m    |[39m                                                  [31m[1m^[22m[39m
18:00:14.451  [90m 97 |[39m         fromCache[33m:[39m [36mtrue[39m[33m,[39m
18:00:14.451  [90m 98 |[39m       })[33m;[39m
18:00:14.451  [90m 99 |[39m     }[0m
18:00:14.478 Next.js build worker exited with code: 1 and signal: null
18:00:14.508 Error: Command "npm run build" exited with 1