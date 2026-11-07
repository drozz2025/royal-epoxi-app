import { betterAuth } from 'better-auth';
import { admin, jwt } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import bcrypt from 'bcryptjs';
import { PostgresDialect } from 'kysely';
export async function verifyMigratedPassword({hash,password}) {
  if (/^\$2[aby]\$/.test(hash)) return bcrypt.compare(password,hash.replace(/^\$2y\$/,'$2b$'));
  return verifyPassword({hash,password});
}
export function createIndependentAuth({pool,baseURL,trustedOrigins,secret,sendResetPassword,testMode=false,basePath='/api/auth'}) {
  if(typeof secret!=='string'||secret.length<32)throw new Error('An independent authentication secret is required');
  const origin=new URL(baseURL);
  if(origin.protocol!=='https:'&&!(testMode&&origin.hostname==='127.0.0.1'))throw new Error('Authentication requires HTTPS');
  if(!Array.isArray(trustedOrigins)||!trustedOrigins.length||trustedOrigins.includes('*'))throw new Error('Explicit trusted application origins are required');
  if(typeof sendResetPassword!=='function')throw new Error('Password reset delivery must be configured');
  if(!['/api/auth','/independent/api/auth'].includes(basePath))throw new Error('Unexpected authentication path');
  return betterAuth({appName:'Royal Epoxis',telemetry:{enabled:false},baseURL,basePath,secret,
    database:{dialect:new PostgresDialect({pool}),type:'postgres',schemaName:'independent_auth',transaction:true},trustedOrigins,
    databaseHooks:{user:{create:{after:async user=>{await pool.query('SELECT independent_auth.create_employee_profile($1::uuid,$2,$3)',[user.id,user.name,user.email]);}}}},
    logger:{disabled:testMode},advanced:{database:{generateId:'uuid'}},
    emailAndPassword:{enabled:true,disableSignUp:false,minPasswordLength:8,maxPasswordLength:128,revokeSessionsOnPasswordReset:true,sendResetPassword,password:{hash:hashPassword,verify:verifyMigratedPassword}},
    rateLimit:{enabled:true,storage:'database',window:60,max:30},session:{expiresIn:604800,updateAge:86400},
    plugins:[admin({defaultRole:'user',adminRoles:['admin']}),
      passkey({rpID:origin.hostname,rpName:'Royal Epoxis App',origin:origin.origin,authenticatorSelection:{authenticatorAttachment:'platform',residentKey:'required',userVerification:'required'}}),
      jwt({jwt:{audience:'royal-epoxis-data',expirationTime:'5m',definePayload:({user})=>({sub:user.id,role:'authenticated'})}})]});
}
