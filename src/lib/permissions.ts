export type Role='ADMIN'|'ORCAMENTISTA'|'OBRA'|'FINANCEIRO'|'FUNCIONARIO';
export const permissions={
 ADMIN:['*'],
 ORCAMENTISTA:['clients:read','clients:write','visits:read','visits:write','quotes:read','quotes:write','materials:read'],
 OBRA:['clients:read','projects:read','projects:write','work:write','materials:read','stock:write','photos:write'],
 FINANCEIRO:['clients:read','projects:read','quotes:read','cash:read','cash:write','payments:write','reports:read'],
 FUNCIONARIO:['projects:read','work:write','photos:write']
} as const;
export function can(role:Role,permission:string){return role==='ADMIN'||(permissions[role] as readonly string[]).includes(permission)}
