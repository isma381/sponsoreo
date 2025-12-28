19:23:20.751 Running build in Portland, USA (West) – pdx1
19:23:20.752 Build machine configuration: 2 cores, 8 GB
19:23:20.890 Cloning github.com/isma381/sponsoreo (Branch: obj-2, Commit: e5bfb8b)
19:23:21.645 Cloning completed: 755.000ms
19:23:22.199 Restored build cache from previous deployment (3PAvdj2PhfrNDMHRMA5JQNQT5CcW)
19:23:22.894 Running "vercel build"
19:23:23.334 Vercel CLI 50.1.3
19:23:23.697 Installing dependencies...
19:23:25.020 
19:23:25.021 up to date in 1s
19:23:25.021 
19:23:25.022 173 packages are looking for funding
19:23:25.022   run `npm fund` for details
19:23:25.050 Detected Next.js version: 16.1.0
19:23:25.058 Running "npm run build"
19:23:25.169 
19:23:25.170 > Sponsoreo@0.1.0 build
19:23:25.170 > next build
19:23:25.170 
19:23:25.932 ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
19:23:25.939 ▲ Next.js 16.1.0 (Turbopack)
19:23:25.940 - Experiments (use with caution):
19:23:25.940   · optimizePackageImports
19:23:25.940 
19:23:26.019   Creating an optimized production build ...
19:23:26.470 ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
19:23:54.424 ✓ Compiled successfully in 28.0s
19:23:54.431   Running TypeScript ...
19:23:54.795 
19:23:54.796   We detected TypeScript in your project and reconfigured your tsconfig.json file for you.
19:23:54.797   The following suggested values were added to your tsconfig.json. These values can be changed to fit your project's needs:
19:23:54.797 
19:23:54.797   	- include was updated to add '.next/dev/types/**/*.ts'
19:23:54.797 
19:23:54.797   The following mandatory changes were made to your tsconfig.json:
19:23:54.798 
19:23:54.798   	- jsx was set to react-jsx (next.js uses the React automatic runtime)
19:23:54.798 
19:24:02.439 Failed to compile.
19:24:02.439 
19:24:02.441 ./app/api/dashboard/transfers/route.ts:453:75
19:24:02.441 Type error: Cannot find name 'insertedCount'.
19:24:02.441 
19:24:02.441 [0m [90m 451 |[39m           }
19:24:02.441  [90m 452 |[39m
19:24:02.441 [31m[1m>[22m[39m[90m 453 |[39m           console[33m.[39mlog([32m`[dashboard/transfers] Sincronización completada: ${insertedCount} insertadas, ${updatedCount} actualizadas`[39m)[33m;[39m
19:24:02.441  [90m     |[39m                                                                           [31m[1m^[22m[39m
19:24:02.442  [90m 454 |[39m
19:24:02.442  [90m 455 |[39m           [90m// Recargar datos de BD después de sync[39m
19:24:02.442  [90m 456 |[39m           transfers [33m=[39m [36mawait[39m executeQuery(query[33m,[39m params)[33m;[39m[0m
19:24:02.492 Next.js build worker exited with code: 1 and signal: null
19:24:02.537 Error: Command "npm run build" exited with 1