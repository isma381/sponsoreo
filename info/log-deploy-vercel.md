09:32:30.314 Running build in Portland, USA (West) – pdx1
09:32:30.315 Build machine configuration: 2 cores, 8 GB
09:32:30.457 Cloning github.com/isma381/sponsoreo (Branch: obj-2, Commit: 944c7d5)
09:32:31.073 Cloning completed: 615.000ms
09:32:31.377 Restored build cache from previous deployment (8maNnyDkucvHgxLKZxH8TUf4UhpV)
09:32:31.926 Running "vercel build"
09:32:32.341 Vercel CLI 50.0.1
09:32:32.654 Installing dependencies...
09:32:34.207 npm warn ERESOLVE overriding peer dependency
09:32:34.208 npm warn ERESOLVE overriding peer dependency
09:32:34.209 npm warn ERESOLVE overriding peer dependency
09:32:34.210 npm warn ERESOLVE overriding peer dependency
09:32:34.210 npm warn ERESOLVE overriding peer dependency
09:32:34.211 npm warn ERESOLVE overriding peer dependency
09:32:35.304 
09:32:35.305 added 5 packages, and changed 3 packages in 2s
09:32:35.305 
09:32:35.305 168 packages are looking for funding
09:32:35.305   run `npm fund` for details
09:32:35.334 Detected Next.js version: 16.0.10
09:32:35.340 Running "npm run build"
09:32:35.519 
09:32:35.520 > Sponsoreo@0.1.0 build
09:32:35.520 > next build
09:32:35.520 
09:32:36.258  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
09:32:36.264    ▲ Next.js 16.0.10 (Turbopack)
09:32:36.265 
09:32:36.333    Creating an optimized production build ...
09:32:36.747  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
09:32:46.713  ✓ Compiled successfully in 10.0s
09:32:46.717    Running TypeScript ...
09:32:46.931 
09:32:46.942    We detected TypeScript in your project and reconfigured your tsconfig.json file for you.
09:32:46.943    The following suggested values were added to your tsconfig.json. These values can be changed to fit your project's needs:
09:32:46.943 
09:32:46.943    	- include was updated to add '.next/dev/types/**/*.ts'
09:32:46.944 
09:32:46.944    The following mandatory changes were made to your tsconfig.json:
09:32:46.944 
09:32:46.945    	- jsx was set to react-jsx (next.js uses the React automatic runtime)
09:32:46.945 
09:32:51.809 Failed to compile.
09:32:51.810 
09:32:51.810 ./app/dashboard/page.tsx:229:21
09:32:51.812 Type error: Type '{ key: string; transfer: Transfer; showActions: true; currentUserId: string | undefined; onEdit: (transferId: string) => void; onTransferPermission: (transferId: string) => Promise<...>; onReturnPermission: (transferId: string) => Promise<...>; }' is not assignable to type 'IntrinsicAttributes & TransferCardProps'.
09:32:51.812   Property 'onEdit' does not exist on type 'IntrinsicAttributes & TransferCardProps'.
09:32:51.812 
09:32:51.812 [0m [90m 227 |[39m                     showActions[33m=[39m{[36mtrue[39m}
09:32:51.812  [90m 228 |[39m                     currentUserId[33m=[39m{currentUserId [33m||[39m undefined}
09:32:51.813 [31m[1m>[22m[39m[90m 229 |[39m                     onEdit[33m=[39m{handleEdit}
09:32:51.813  [90m     |[39m                     [31m[1m^[22m[39m
09:32:51.813  [90m 230 |[39m                     onTransferPermission[33m=[39m{handleTransferPermission}
09:32:51.813  [90m 231 |[39m                     onReturnPermission[33m=[39m{handleReturnPermission}
09:32:51.813  [90m 232 |[39m                   [33m/[39m[33m>[39m[0m
09:32:51.837 Next.js build worker exited with code: 1 and signal: null
09:32:51.866 Error: Command "npm run build" exited with 1