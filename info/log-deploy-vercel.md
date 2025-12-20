10:50:52.628 Running build in Portland, USA (West) – pdx1
10:50:52.628 Build machine configuration: 2 cores, 8 GB
10:50:52.786 Cloning github.com/isma381/sponsoreo (Branch: obj-2, Commit: 67e9150)
10:50:53.432 Cloning completed: 646.000ms
10:50:53.815 Restored build cache from previous deployment (5GP8KoH5G4XNzhbgsGR99cbGvX3b)
10:50:54.459 Running "vercel build"
10:50:54.882 Vercel CLI 50.1.3
10:50:55.185 Installing dependencies...
10:50:56.424 
10:50:56.425 up to date in 1s
10:50:56.425 
10:50:56.425 168 packages are looking for funding
10:50:56.425   run `npm fund` for details
10:50:56.453 Detected Next.js version: 16.1.0
10:50:56.459 Running "npm run build"
10:50:56.570 
10:50:56.570 > Sponsoreo@0.1.0 build
10:50:56.571 > next build
10:50:56.571 
10:50:57.322 ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
10:50:57.329 ▲ Next.js 16.1.0 (Turbopack)
10:50:57.329 
10:50:57.403   Creating an optimized production build ...
10:50:57.799 ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
10:51:08.886 ✓ Compiled successfully in 11.1s
10:51:08.893   Running TypeScript ...
10:51:09.170 
10:51:09.172   We detected TypeScript in your project and reconfigured your tsconfig.json file for you.
10:51:09.173   The following suggested values were added to your tsconfig.json. These values can be changed to fit your project's needs:
10:51:09.173 
10:51:09.174   	- include was updated to add '.next/dev/types/**/*.ts'
10:51:09.175 
10:51:09.175   The following mandatory changes were made to your tsconfig.json:
10:51:09.175 
10:51:09.176   	- jsx was set to react-jsx (next.js uses the React automatic runtime)
10:51:09.178 
10:51:14.895 Failed to compile.
10:51:14.896 
10:51:14.896 Type error: Type 'typeof import("/vercel/path0/app/api/users/[username]/route")' does not satisfy the constraint 'RouteHandlerConfig<"/api/users/[username]">'.
10:51:14.896   Types of property 'GET' are incompatible.
10:51:14.897     Type '(request: NextRequest, { params }: { params: { username: string; }; }) => Promise<NextResponse<{ error: string; }> | NextResponse<{ profile: { id: any; username: any; profile_image_url: any; description: any; category: any; location: any; created_at: any; }; }>>' is not assignable to type '(request: NextRequest, context: { params: Promise<{ username: string; }>; }) => void | Response | Promise<void | Response>'.
10:51:14.897       Types of parameters '__1' and 'context' are incompatible.
10:51:14.897         Type '{ params: Promise<{ username: string; }>; }' is not assignable to type '{ params: { username: string; }; }'.
10:51:14.897           Types of property 'params' are incompatible.
10:51:14.898             Property 'username' is missing in type 'Promise<{ username: string; }>' but required in type '{ username: string; }'.
10:51:14.898 
10:51:14.922 Next.js build worker exited with code: 1 and signal: null
10:51:14.955 Error: Command "npm run build" exited with 1