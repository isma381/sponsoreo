18:47:11.644 Running build in Portland, USA (West) – pdx1
18:47:11.645 Build machine configuration: 2 cores, 8 GB
18:47:11.981 Cloning github.com/isma381/sponsoreo (Branch: obj-2, Commit: 7be0a16)
18:47:13.151 Cloning completed: 1.170s
18:47:14.151 Restored build cache from previous deployment (DMjhV14oW376hHsCxHvYAkkNNGPQ)
18:47:14.860 Running "vercel build"
18:47:15.290 Vercel CLI 50.1.3
18:47:15.758 Installing dependencies...
18:47:17.180 
18:47:17.181 up to date in 1s
18:47:17.181 
18:47:17.182 173 packages are looking for funding
18:47:17.182   run `npm fund` for details
18:47:17.210 Detected Next.js version: 16.1.0
18:47:17.216 Running "npm run build"
18:47:17.344 
18:47:17.345 > Sponsoreo@0.1.0 build
18:47:17.346 > next build
18:47:17.346 
18:47:18.087 ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
18:47:18.094 ▲ Next.js 16.1.0 (Turbopack)
18:47:18.095 - Experiments (use with caution):
18:47:18.096   · optimizePackageImports
18:47:18.096 
18:47:18.172   Creating an optimized production build ...
18:47:18.564 ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
18:47:47.583 ✓ Compiled successfully in 29.0s
18:47:47.600   Running TypeScript ...
18:47:47.849 
18:47:47.851   We detected TypeScript in your project and reconfigured your tsconfig.json file for you.
18:47:47.851   The following suggested values were added to your tsconfig.json. These values can be changed to fit your project's needs:
18:47:47.851 
18:47:47.852   	- include was updated to add '.next/dev/types/**/*.ts'
18:47:47.852 
18:47:47.852   The following mandatory changes were made to your tsconfig.json:
18:47:47.852 
18:47:47.852   	- jsx was set to react-jsx (next.js uses the React automatic runtime)
18:47:47.853 
18:47:55.296 Failed to compile.
18:47:55.296 
18:47:55.296 ./app/api/transfers/sync/route.ts:746:7
18:47:55.296 Type error: Object literal may only specify known properties, and 'detectedTransfers' does not exist in type '{ transfersProcessed: number; chainsProcessed: number[]; }'.
18:47:55.296 
18:47:55.297 [0m [90m 744 |[39m       transfersProcessed[33m:[39m allTransfersMap[33m.[39msize[33m,[39m 
18:47:55.297  [90m 745 |[39m       chainsProcessed[33m,[39m
18:47:55.297 [31m[1m>[22m[39m[90m 746 |[39m       detectedTransfers[33m:[39m allTransfersMap[33m.[39msize[33m,[39m
18:47:55.297  [90m     |[39m       [31m[1m^[22m[39m
18:47:55.297  [90m 747 |[39m       insertedTransfers[33m:[39m totalInserted[33m,[39m
18:47:55.298  [90m 748 |[39m       walletsChecked[33m:[39m userWallets[33m.[39mlength[33m,[39m
18:47:55.298  [90m 749 |[39m       verifiedAddressesCount[33m:[39m verifiedAddressesSet[33m.[39msize[0m
18:47:55.330 Next.js build worker exited with code: 1 and signal: null
18:47:55.367 Error: Command "npm run build" exited with 1