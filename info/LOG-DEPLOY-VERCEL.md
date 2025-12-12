12:24:48.750 Running build in Portland, USA (West) – pdx1
12:24:48.751 Build machine configuration: 2 cores, 8 GB
12:24:48.867 Cloning github.com/isma381/sponsoreo (Branch: main, Commit: b7d7c0a)
12:24:49.635 Cloning completed: 768.000ms
12:24:49.872 Restored build cache from previous deployment (7sVEhVdRqHN7dkEe6MMwwfN3vdmf)
12:24:50.430 Running "vercel build"
12:24:50.842 Vercel CLI 50.0.0
12:24:51.156 Installing dependencies...
12:24:52.389 
12:24:52.390 up to date in 1s
12:24:52.391 
12:24:52.391 168 packages are looking for funding
12:24:52.391   run `npm fund` for details
12:24:52.419 Detected Next.js version: 16.0.9
12:24:52.425 Running "npm run build"
12:24:52.533 
12:24:52.533 > sponsoreo@0.1.0 build
12:24:52.533 > next build
12:24:52.533 
12:24:53.299  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
12:24:53.306    ▲ Next.js 16.0.9 (Turbopack)
12:24:53.307 
12:24:53.380    Creating an optimized production build ...
12:24:53.751  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
12:25:02.292  ✓ Compiled successfully in 8.5s
12:25:02.306    Running TypeScript ...
12:25:02.555 
12:25:02.556    We detected TypeScript in your project and reconfigured your tsconfig.json file for you.
12:25:02.564    The following suggested values were added to your tsconfig.json. These values can be changed to fit your project's needs:
12:25:02.564 
12:25:02.565    	- include was updated to add '.next/dev/types/**/*.ts'
12:25:02.565 
12:25:02.566    The following mandatory changes were made to your tsconfig.json:
12:25:02.566 
12:25:02.566    	- jsx was set to react-jsx (next.js uses the React automatic runtime)
12:25:02.567 
12:25:06.802 Failed to compile.
12:25:06.803 
12:25:06.803 ./components/ui/button.tsx:31:9
12:25:06.803 Type error: No overload matches this call.
12:25:06.803   The last overload gave the following error.
12:25:06.803     Object literal may only specify known properties, and 'className' does not exist in type 'Partial<unknown> & Attributes'.
12:25:06.803 
12:25:06.803 [0m [90m 29 |[39m       [36mconst[39m child [33m=[39m [33mReact[39m[33m.[39m[33mChildren[39m[33m.[39monly(props[33m.[39mchildren) [36mas[39m [33mReact[39m[33m.[39m[33mReactElement[39m[33m;[39m
12:25:06.804  [90m 30 |[39m       [36mreturn[39m [33mReact[39m[33m.[39mcloneElement(child[33m,[39m {
12:25:06.804 [31m[1m>[22m[39m[90m 31 |[39m         className[33m:[39m cn(baseStyles[33m,[39m variants[variant][33m,[39m sizes[size][33m,[39m className)[33m,[39m
12:25:06.804  [90m    |[39m         [31m[1m^[22m[39m
12:25:06.804  [90m 32 |[39m         [33m...[39m(child[33m.[39mprops [36mas[39m [33mRecord[39m[33m<[39m[33mstring[39m[33m,[39m any[33m>[39m)[33m,[39m
12:25:06.804  [90m 33 |[39m       })[33m;[39m
12:25:06.804  [90m 34 |[39m     }[0m
12:25:06.830 Next.js build worker exited with code: 1 and signal: null
12:25:06.870 Error: Command "npm run build" exited with 1