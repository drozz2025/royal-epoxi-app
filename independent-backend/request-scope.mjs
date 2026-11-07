const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function requireUuid(value){if(typeof value!=='string'||!UUID.test(value))throw Object.assign(new Error('Identificador inválido'),{status:400});return value;}
export async function inUserScope(pool,userId,operation,{readOnly=false}={}){
  requireUuid(userId);const client=await pool.connect();let failure;
  try{await client.query(readOnly?'BEGIN READ ONLY':'BEGIN');await client.query('SET LOCAL ROLE authenticated');
    await client.query("SELECT set_config('request.jwt.claims',$1,true),set_config('request.jwt.claim.sub',$2,true)",[JSON.stringify({sub:userId,role:'authenticated'}),userId]);
    const result=await operation(client);await client.query('COMMIT');return result;
  }catch(error){try{await client.query('ROLLBACK');}catch(rollbackError){failure=rollbackError;}throw error;}finally{client.release(failure);}
}
