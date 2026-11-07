export function proxyIndependentRequest(request:Request,env:Record<string,unknown>,fetchUpstream?:typeof fetch):Promise<Response>;
