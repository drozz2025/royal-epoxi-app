import {createStagedBackend} from './staging.mjs';
import {createIndependentRuntime} from './runtime.mjs';
const app=createStagedBackend({env:process.env,bootstrap:createIndependentRuntime});
export default app;
