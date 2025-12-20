11:10:13.263 Running build in Portland, USA (West) – pdx1
11:10:13.263 Build machine configuration: 2 cores, 8 GB
11:10:13.385 Cloning github.com/isma381/sponsoreo (Branch: obj-2, Commit: 926cb44)
11:10:13.997 Cloning completed: 612.000ms
11:10:14.349 Restored build cache from previous deployment (5GP8KoH5G4XNzhbgsGR99cbGvX3b)
11:10:14.943 Running "vercel build"
11:10:15.368 Vercel CLI 50.1.3
11:10:16.723 Installing dependencies...
11:10:18.186 
11:10:18.187 up to date in 1s
11:10:18.188 
11:10:18.188 168 packages are looking for funding
11:10:18.188   run `npm fund` for details
11:10:18.216 Detected Next.js version: 16.1.0
11:10:18.222 Running "npm run build"
11:10:18.339 
11:10:18.340 > Sponsoreo@0.1.0 build
11:10:18.340 > next build
11:10:18.340 
11:10:19.123 ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
11:10:19.129 ▲ Next.js 16.1.0 (Turbopack)
11:10:19.130 
11:10:19.203   Creating an optimized production build ...
11:10:19.564 ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
11:10:30.515 ✓ Compiled successfully in 11.0s
11:10:30.515   Running TypeScript ...
11:10:30.821 
11:10:30.827   We detected TypeScript in your project and reconfigured your tsconfig.json file for you.
11:10:30.828   The following suggested values were added to your tsconfig.json. These values can be changed to fit your project's needs:
11:10:30.828 
11:10:30.829   	- include was updated to add '.next/dev/types/**/*.ts'
11:10:30.830 
11:10:30.830   The following mandatory changes were made to your tsconfig.json:
11:10:30.831 
11:10:30.831   	- jsx was set to react-jsx (next.js uses the React automatic runtime)
11:10:30.835 
11:10:36.758 Failed to compile.
11:10:36.758 
11:10:36.758 ./app/u/[username]/page.tsx:283:27
11:10:36.759 Type error: Type 'string | null' is not assignable to type 'string | Date | undefined'.
11:10:36.759   Type 'null' is not assignable to type 'string | Date | undefined'.
11:10:36.759 
11:10:36.759 [0m [90m 281 |[39m                           chainId[33m:[39m transfer[33m.[39mchainId[33m,[39m
11:10:36.759  [90m 282 |[39m                           contractAddress[33m:[39m transfer[33m.[39mcontractAddress[33m,[39m
11:10:36.759 [31m[1m>[22m[39m[90m 283 |[39m                           created_at[33m:[39m transfer[33m.[39mcreated_at[33m,[39m
11:10:36.759  [90m     |[39m                           [31m[1m^[22m[39m
11:10:36.759  [90m 284 |[39m                           fromUser[33m:[39m {
11:10:36.760  [90m 285 |[39m                             username[33m:[39m transfer[33m.[39mfromUser[33m.[39musername[33m,[39m
11:10:36.760  [90m 286 |[39m                             profileImageUrl[33m:[39m transfer[33m.[39mfromUser[33m.[39mprofileImageUrl[33m,[39m[0m
11:10:36.786 Next.js build worker exited with code: 1 and signal: null
11:10:36.817 Error: Command "npm run build" exited with 1