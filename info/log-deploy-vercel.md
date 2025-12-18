18:05:10.635 Running build in Portland, USA (West) – pdx1
18:05:10.635 Build machine configuration: 2 cores, 8 GB
18:05:10.767 Cloning github.com/isma381/sponsoreo (Branch: obj-2, Commit: 5ca6437)
18:05:11.550 Cloning completed: 783.000ms
18:05:11.889 Restored build cache from previous deployment (8RmSGtqE7sbht2KxCgEhF7ePAeM4)
18:05:12.470 Running "vercel build"
18:05:12.884 Vercel CLI 50.0.1
18:05:13.185 Installing dependencies...
18:05:14.322 
18:05:14.323 up to date in 939ms
18:05:14.323 
18:05:14.324 168 packages are looking for funding
18:05:14.324   run `npm fund` for details
18:05:14.349 Detected Next.js version: 16.0.10
18:05:14.354 Running "npm run build"
18:05:14.459 
18:05:14.460 > Sponsoreo@0.1.0 build
18:05:14.460 > next build
18:05:14.461 
18:05:15.186  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
18:05:15.192    ▲ Next.js 16.0.10 (Turbopack)
18:05:15.192 
18:05:15.264    Creating an optimized production build ...
18:05:15.615  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
18:05:25.639  ✓ Compiled successfully in 10.0s
18:05:25.657    Running TypeScript ...
18:05:25.872 
18:05:25.883    We detected TypeScript in your project and reconfigured your tsconfig.json file for you.
18:05:25.883    The following suggested values were added to your tsconfig.json. These values can be changed to fit your project's needs:
18:05:25.883 
18:05:25.884    	- include was updated to add '.next/dev/types/**/*.ts'
18:05:25.884 
18:05:25.884    The following mandatory changes were made to your tsconfig.json:
18:05:25.884 
18:05:25.884    	- jsx was set to react-jsx (next.js uses the React automatic runtime)
18:05:25.885 
18:05:31.235 Failed to compile.
18:05:31.236 
18:05:31.236 ./components/TransferCard.tsx:206:70
18:05:31.236 Type error: Property 'blockTimestamp' does not exist on type '{ id: string; hash: string; from: string; to: string; value: number; token: string; chain: string; chainId: number; contractAddress: string | null; created_at?: string | Date | undefined; ... 8 more ...; location?: string | ... 1 more ... | undefined; }'.
18:05:31.236 
18:05:31.236 [0m [90m 204 |[39m               [33m<[39m[33m/[39m[33mLink[39m[33m>[39m
18:05:31.236  [90m 205 |[39m               [33m<[39m[33mspan[39m[33m>[39m•[33m<[39m[33m/[39m[33mspan[39m[33m>[39m
18:05:31.237 [31m[1m>[22m[39m[90m 206 |[39m               [33m<[39m[33mspan[39m className[33m=[39m[32m"text-foreground"[39m[33m>[39m{formatDate(transfer[33m.[39mblockTimestamp [33m||[39m transfer[33m.[39mcreated_at)}[33m<[39m[33m/[39m[33mspan[39m[33m>[39m
18:05:31.237  [90m     |[39m                                                                      [31m[1m^[22m[39m
18:05:31.237  [90m 207 |[39m             [33m<[39m[33m/[39m[33mdiv[39m[33m>[39m
18:05:31.237  [90m 208 |[39m           [33m<[39m[33m/[39m[33mdiv[39m[33m>[39m
18:05:31.237  [90m 209 |[39m         [33m<[39m[33m/[39m[33mdiv[39m[33m>[39m[0m
18:05:31.276 Next.js build worker exited with code: 1 and signal: null
18:05:31.331 Error: Command "npm run build" exited with 1