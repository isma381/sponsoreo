11:52:47.834 Running build in Portland, USA (West) – pdx1
11:52:47.835 Build machine configuration: 2 cores, 8 GB
11:52:48.060 Cloning github.com/isma381/sponsoreo (Branch: obj-2, Commit: 9910aea)
11:52:48.696 Cloning completed: 636.000ms
11:52:48.975 Restored build cache from previous deployment (9uJXMf9aCLHndQMzvp2JpnXgsZSm)
11:52:49.547 Running "vercel build"
11:52:49.999 Vercel CLI 50.1.3
11:52:50.316 Installing dependencies...
11:52:51.566 
11:52:51.567 up to date in 1s
11:52:51.568 
11:52:51.568 168 packages are looking for funding
11:52:51.568   run `npm fund` for details
11:52:51.596 Detected Next.js version: 16.1.0
11:52:51.602 Running "npm run build"
11:52:51.714 
11:52:51.714 > Sponsoreo@0.1.0 build
11:52:51.714 > next build
11:52:51.714 
11:52:52.461 ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
11:52:52.468 ▲ Next.js 16.1.0 (Turbopack)
11:52:52.468 - Experiments (use with caution):
11:52:52.469   · optimizePackageImports
11:52:52.469 
11:52:52.545   Creating an optimized production build ...
11:52:52.900 ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
11:53:04.916 
11:53:04.917 > Build error occurred
11:53:04.922 Error: Turbopack build failed with 1 errors:
11:53:04.922 ./app/transfers/page.tsx:81:9
11:53:04.922 Ecmascript file had an error
11:53:04.922 [0m [90m 79 |[39m   }[33m;[39m
11:53:04.922  [90m 80 |[39m
11:53:04.922 [31m[1m>[22m[39m[90m 81 |[39m   [36mconst[39m formatValue [33m=[39m (transfer[33m:[39m [33mEnrichedTransfer[39m) [33m=>[39m {
11:53:04.923  [90m    |[39m         [31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m[31m[1m^[22m[39m
11:53:04.923  [90m 82 |[39m     [36mconst[39m decimals [33m=[39m parseInt(transfer[33m.[39mrawContract[33m.[39mdecimal)[33m;[39m
11:53:04.923  [90m 83 |[39m     [36mconst[39m value [33m=[39m [33mBigInt[39m(transfer[33m.[39mrawContract[33m.[39mvalue)[33m;[39m
11:53:04.923  [90m 84 |[39m     [36mconst[39m divisor [33m=[39m [33mBigInt[39m([35m10[39m [33m**[39m decimals)[33m;[39m[0m
11:53:04.923 
11:53:04.923 the name `formatValue` is defined multiple times
11:53:04.923 
11:53:04.923 Import traces:
11:53:04.923   Client Component Browser:
11:53:04.923     ./app/transfers/page.tsx [Client Component Browser]
11:53:04.924     ./app/transfers/page.tsx [Server Component]
11:53:04.924 
11:53:04.924   Client Component SSR:
11:53:04.924     ./app/transfers/page.tsx [Client Component SSR]
11:53:04.924     ./app/transfers/page.tsx [Server Component]
11:53:04.924 
11:53:04.924 
11:53:04.924     at <unknown> (./app/transfers/page.tsx:81:9)
11:53:05.007 Error: Command "npm run build" exited with 1