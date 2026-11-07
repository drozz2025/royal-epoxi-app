import {build} from 'esbuild';
await build({entryPoints:['index.mjs'],outfile:'build/index.mjs',bundle:true,platform:'node',target:'node24',format:'esm',sourcemap:false,banner:{js:"import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);"}});
