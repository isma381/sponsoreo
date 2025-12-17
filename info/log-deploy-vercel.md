09:25:58.366 Running build in Portland, USA (West) – pdx1
09:25:58.366 Build machine configuration: 2 cores, 8 GB
09:25:58.478 Cloning github.com/isma381/sponsoreo (Branch: obj-2, Commit: 30aeb5b)
09:25:59.601 Cloning completed: 1.122s
09:25:59.947 Restored build cache from previous deployment (8maNnyDkucvHgxLKZxH8TUf4UhpV)
09:26:00.530 Running "vercel build"
09:26:00.943 Vercel CLI 50.0.1
09:26:01.250 Installing dependencies...
09:26:02.730 npm warn ERESOLVE overriding peer dependency
09:26:02.733 npm warn ERESOLVE overriding peer dependency
09:26:02.734 npm warn ERESOLVE overriding peer dependency
09:26:02.735 npm warn ERESOLVE overriding peer dependency
09:26:02.736 npm warn ERESOLVE overriding peer dependency
09:26:02.736 npm warn ERESOLVE overriding peer dependency
09:26:03.584 
09:26:03.584 added 5 packages, and changed 3 packages in 2s
09:26:03.585 
09:26:03.585 168 packages are looking for funding
09:26:03.585   run `npm fund` for details
09:26:03.636 Detected Next.js version: 16.0.10
09:26:03.641 Running "npm run build"
09:26:03.750 
09:26:03.751 > Sponsoreo@0.1.0 build
09:26:03.751 > next build
09:26:03.752 
09:26:04.482  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
09:26:04.488    ▲ Next.js 16.0.10 (Turbopack)
09:26:04.489 
09:26:04.546    Creating an optimized production build ...
09:26:04.895  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
09:26:14.161  ✓ Compiled successfully in 9.3s
09:26:14.166    Running TypeScript ...
09:26:14.383 
09:26:14.385    We detected TypeScript in your project and reconfigured your tsconfig.json file for you.
09:26:14.385    The following suggested values were added to your tsconfig.json. These values can be changed to fit your project's needs:
09:26:14.386 
09:26:14.386    	- include was updated to add '.next/dev/types/**/*.ts'
09:26:14.387 
09:26:14.387    The following mandatory changes were made to your tsconfig.json:
09:26:14.388 
09:26:14.388    	- jsx was set to react-jsx (next.js uses the React automatic runtime)
09:26:14.389 
09:26:19.199 Failed to compile.
09:26:19.199 
09:26:19.200 Type error: Type 'typeof import("/vercel/path0/app/api/transfers/[transferId]/edit/route")' does not satisfy the constraint 'RouteHandlerConfig<"/api/transfers/[transferId]/edit">'.
09:26:19.200   Types of property 'PUT' are incompatible.
09:26:19.200     Type '(request: NextRequest, { params }: { params: { transferId: string; }; }) => Promise<NextResponse<{ error: string; }> | NextResponse<{ success: boolean; }>>' is not assignable to type '(request: NextRequest, context: { params: Promise<{ transferId: string; }>; }) => void | Response | Promise<void | Response>'.
09:26:19.200       Types of parameters '__1' and 'context' are incompatible.
09:26:19.201         Type '{ params: Promise<{ transferId: string; }>; }' is not assignable to type '{ params: { transferId: string; }; }'.
09:26:19.201           Types of property 'params' are incompatible.
09:26:19.201             Property 'transferId' is missing in type 'Promise<{ transferId: string; }>' but required in type '{ transferId: string; }'.
09:26:19.202 
09:26:19.231 Next.js build worker exited with code: 1 and signal: null
09:26:19.258 Error: Command "npm run build" exited with 1