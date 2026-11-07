import {S3Client,GetObjectCommand,PutObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
export function createPrivateAttachmentStorage({endpoint,region,accessKeyId,secretAccessKey}){
  const origin=new URL(endpoint);if(origin.protocol!=='https:'||origin.username||origin.password||origin.search||origin.hash||origin.pathname!=='/'||!region||!accessKeyId||!secretAccessKey)throw new Error('Private storage configuration required');
  const client=new S3Client({endpoint:origin.origin,region,credentials:{accessKeyId,secretAccessKey},forcePathStyle:true,requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'});
  const command=key=>new GetObjectCommand({Bucket:'royal-files',Key:key});
  return{async write(key,bytes,contentType,sha256,upsert=false){await client.send(new PutObjectCommand({Bucket:'royal-files',Key:key,Body:bytes,ContentLength:bytes.length,ContentType:contentType,...(upsert?{}:{IfNoneMatch:'*'}),Metadata:{sha256}}));},
    async read(key){const result=await client.send(command(key));return{body:result.Body.transformToWebStream()};},
    async sign(key,expiresIn){if(!Number.isInteger(expiresIn)||expiresIn<1||expiresIn>3600)throw new Error('Invalid signed URL lifetime');return getSignedUrl(client,command(key),{expiresIn});}};
}
