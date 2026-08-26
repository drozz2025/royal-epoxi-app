export type Role='ADMIN'|'ORCAMENTISTA'|'OBRA'|'FINANCEIRO'|'FUNCIONARIO';
export type QuoteStatus='RASCUNHO'|'ENVIADO'|'PENDENTE'|'ACEITE'|'RECUSADO'|'CANCELADO'|'EXPIRADO';
export type ProjectStatus='PLANEAMENTO'|'AGENDADA'|'EM_OBRA'|'PAUSADA'|'CONCLUIDA'|'CANCELADA';
export interface Client{id:string;name:string;company?:string;nif?:string;phone?:string;email?:string;address?:string;notes?:string}
export interface Material{id:string;name:string;unit:string;cost:number;yieldPerUnit?:number;wastePct?:number;stock:number;minStock:number}
export interface QuoteLine{description:string;quantity:number;unit:string;unitPrice:number;cost:number}
export interface Quote{id:string;clientId:string;number:string;status:QuoteStatus;lines:QuoteLine[];directCost:number;salePrice:number;marginPct:number;validUntil?:string}
export interface Project{id:string;quoteId?:string;clientId:string;number:string;status:ProjectStatus;areaM2:number;plannedCost:number;actualCost:number;salePrice:number;startDate?:string;endDate?:string}
