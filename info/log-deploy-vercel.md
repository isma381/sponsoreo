11:35:40.537 Running build in Portland, USA (West) – pdx1
11:35:40.541 Build machine configuration: 2 cores, 8 GB
11:35:40.878 Cloning github.com/isma381/sponsoreo (Branch: obj-2, Commit: 002fb56)
11:35:42.105 Cloning completed: 1.227s
11:35:42.847 Restored build cache from previous deployment (Ex9YdJdrXwqudCqcBesz59i9MY4j)
11:35:43.625 Running "vercel build"
11:35:44.066 Vercel CLI 50.1.3
11:35:44.407 Installing dependencies...
11:35:45.743 
11:35:45.744 up to date in 1s
11:35:45.745 
11:35:45.745 168 packages are looking for funding
11:35:45.745   run `npm fund` for details
11:35:45.776 Detected Next.js version: 16.1.0
11:35:45.782 Running "npm run build"
11:35:45.902 
11:35:45.902 > Sponsoreo@0.1.0 build
11:35:45.903 > next build
11:35:45.903 
11:35:46.706 ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
11:35:46.713 ▲ Next.js 16.1.0 (Turbopack)
11:35:46.713 - Experiments (use with caution):
11:35:46.714   · optimizePackageImports
11:35:46.714 
11:35:46.795   Creating an optimized production build ...
11:35:47.192 ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
11:35:59.000 ✓ Compiled successfully in 11.8s
11:35:59.032   Running TypeScript ...
11:35:59.225 
11:35:59.231   We detected TypeScript in your project and reconfigured your tsconfig.json file for you.
11:35:59.232   The following suggested values were added to your tsconfig.json. These values can be changed to fit your project's needs:
11:35:59.232 
11:35:59.232   	- include was updated to add '.next/dev/types/**/*.ts'
11:35:59.233 
11:35:59.233   The following mandatory changes were made to your tsconfig.json:
11:35:59.233 
11:35:59.234   	- jsx was set to react-jsx (next.js uses the React automatic runtime)
11:35:59.234 
11:36:05.596 Failed to compile.
11:36:05.597 
11:36:05.597 ./components/header.tsx:37:37
11:36:05.597 Type error: Property 'profile_image_url' does not exist on type 'never'.
11:36:05.597 
11:36:05.597 [0m [90m 35 |[39m           {user [33m?[39m (
11:36:05.598  [90m 36 |[39m             [33m<[39m[33mProfileMenu[39m
11:36:05.598 [31m[1m>[22m[39m[90m 37 |[39m               profileImageUrl[33m=[39m{user[33m.[39mprofile_image_url}
11:36:05.598  [90m    |[39m                                     [31m[1m^[22m[39m
11:36:05.598  [90m 38 |[39m               username[33m=[39m{user[33m.[39musername}
11:36:05.598  [90m 39 |[39m               email[33m=[39m{user[33m.[39memail}
11:36:05.598  [90m 40 |[39m             [33m/[39m[33m>[39m[0m
11:36:05.630 Next.js build worker exited with code: 1 and signal: null
11:36:05.677 Error: Command "npm run build" exited with 1