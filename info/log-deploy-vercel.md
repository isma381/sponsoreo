17:27:42.561 Running build in Portland, USA (West) – pdx1
17:27:42.562 Build machine configuration: 2 cores, 8 GB
17:27:42.685 Cloning github.com/isma381/sponsoreo (Branch: obj-2, Commit: f26d84b)
17:27:43.450 Cloning completed: 763.000ms
17:27:43.669 Restored build cache from previous deployment (3PdwHfVfEo4ESQqC43kaamP9yP1m)
17:27:44.363 Running "vercel build"
17:27:44.782 Vercel CLI 50.1.3
17:27:45.118 Installing dependencies...
17:27:46.404 
17:27:46.405 up to date in 1s
17:27:46.406 
17:27:46.406 168 packages are looking for funding
17:27:46.406   run `npm fund` for details
17:27:46.433 Detected Next.js version: 16.1.0
17:27:46.438 Running "npm run build"
17:27:46.548 
17:27:46.549 > Sponsoreo@0.1.0 build
17:27:46.549 > next build
17:27:46.549 
17:27:47.281 ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
17:27:47.287 ▲ Next.js 16.1.0 (Turbopack)
17:27:47.287 - Experiments (use with caution):
17:27:47.288   · optimizePackageImports
17:27:47.288 
17:27:47.359   Creating an optimized production build ...
17:27:47.709 ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
17:27:58.903 
17:27:58.904 > Build error occurred
17:27:58.910 Error: Turbopack build failed with 1 errors:
17:27:58.910 ./components/TransferCard.tsx:327:10
17:27:58.910 Parsing ecmascript source code failed
17:27:58.911 [0m [90m 325 |[39m         })()}
17:27:58.911  [90m 326 |[39m           [33m<[39m[33m/[39m[33mdiv[39m[33m>[39m
17:27:58.911 [31m[1m>[22m[39m[90m 327 |[39m         )}
17:27:58.911  [90m     |[39m          [31m[1m^[22m[39m
17:27:58.912  [90m 328 |[39m
17:27:58.912  [90m 329 |[39m         {[90m/* UUID para Socios (solo en dashboard) */[39m}
17:27:58.912  [90m 330 |[39m         {showActions [33m&&[39m isSocios [33m&&[39m ([0m
17:27:58.912 
17:27:58.912 Unexpected token. Did you mean `{'}'}` or `&rbrace;`?
17:27:58.912 
17:27:58.913 Import traces:
17:27:58.913   Server Component:
17:27:58.913     ./components/TransferCard.tsx
17:27:58.913     ./app/u/[username]/page.tsx
17:27:58.913 
17:27:58.913   Client Component Browser:
17:27:58.914     ./components/TransferCard.tsx [Client Component Browser]
17:27:58.914     ./app/dashboard/page.tsx [Client Component Browser]
17:27:58.914     ./app/dashboard/page.tsx [Server Component]
17:27:58.914 
17:27:58.914   Client Component SSR:
17:27:58.914     ./components/TransferCard.tsx [Client Component SSR]
17:27:58.915     ./app/dashboard/page.tsx [Client Component SSR]
17:27:58.915     ./app/dashboard/page.tsx [Server Component]
17:27:58.915 
17:27:58.915 
17:27:58.916     at <unknown> (./components/TransferCard.tsx:327:10)
17:27:59.007 Error: Command "npm run build" exited with 1