import {NextResponse, type NextRequest} from 'next/server';
export function middleware(request:NextRequest){const path=request.nextUrl.pathname;if(path.startsWith('/login')||path.startsWith('/_next')||path.includes('.')) return NextResponse.next();const hasSession=request.cookies.getAll().some(c=>c.name.includes('auth-token')||c.name.includes('sb-'));if(!hasSession){const url=request.nextUrl.clone();url.pathname='/login';url.searchParams.set('next',path);return NextResponse.redirect(url)}return NextResponse.next()}
export const config={matcher:['/((?!api).*)']};
