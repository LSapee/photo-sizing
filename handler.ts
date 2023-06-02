import * as AWS from "aws-sdk";
import * as childProcess from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";

import {APIGatewayProxyHandlerV2, S3Handler} from "aws-lambda";
import getStream from "get-stream";
import tar from "tar";
import path from "path";

const s3 = new AWS.S3();
const cloudfront = new AWS.CloudFront();

export const getSignedURL: APIGatewayProxyHandlerV2<unknown> =async ()=>{
    const photoKey = `${new Date().getTime()}${Math.random()}`;
    const uploadURL = await s3.getSignedUrlPromise("putObject",{
        Bucket:process.env.BUCKET_NAME!,
        Key: `raw/${photoKey}.jpg`,
        Expires: 5 * 60,
    });
    const cdnURL = `https://${process.env.SUB_DOMAIN}.${process.env.ROOT_DOMAIN}/photo/${photoKey}.jpg`;
    return {cdnURL,uploadURL};
};
export const optimizeAndUpload: S3Handler = async (event) => {

    await unpackJpegoptim();
    const resultKeys : string[] = [];
    for(const record of event.Records){
        const rawKey = record.s3.object.key;
        const resultKey = await downloadAndOptimizerAndUpload(rawKey);
        resultKeys.push(resultKey);
    }
    await cloudfront
        .createInvalidation({
            DistributionId: process.env.DISTRIBUTION_ID!,
            InvalidationBatch:{
                Paths:{
                    Items:resultKeys.map((resultKey)=>`/${resultKey}`),
                    Quantity: resultKeys.length,
                },
                CallerReference: Date.now().toString(),
            },
        })
        .promise();
};

async function s3Exists(bucketName:string,key:string):Promise<boolean>{
    try{
        await s3.headObject({Bucket: bucketName , Key: key}).promise();
        return true;
    }catch (error:any){
        if(error.code==='Forbidden'){
            return false;
        }
        throw error;
    }
}


const jpegoptimPath = "/tmp/bin/jpegoptim";
const jpegoptimPackFile = "jpegoptim.tar.gz";

async function unpackJpegoptim(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (fs.existsSync(jpegoptimPath)) {
            return resolve();
        }
        fs.createReadStream(jpegoptimPackFile)
            .pipe(
                tar.x({ strip: 1, C: "/tmp" }).on("error", reject).on("close", resolve)
            )
            .on("error", reject);
    });
}

async function downloadBucketObject(
    bucketName:string,
    key:string,
    localPath:string
):Promise<void>{
    return new Promise<void>((resolve,reject)=>{
        s3
            .getObject({Bucket:bucketName, Key:key})
            .createReadStream()
            .on("error",reject)
            .pipe(
                fs.createWriteStream(localPath).on("error",reject).on("close",resolve)
            )
    });
}

async function downloadAndOptimizerAndUpload(rawKey:string): Promise<string>{
    const photoKeyWithJpg =path.basename(rawKey);
    const filePath = `/tmp/${photoKeyWithJpg}`;
    await downloadBucketObject(process.env.BUCKET_NAME!, rawKey, filePath);

    const resultKey = `photo/${photoKeyWithJpg}`;
    try{
        childProcess.execSync(`${jpegoptimPath} -o -s -m80 ${filePath}`);
        await s3
            .upload({
                Bucket: process.env.BUCKET_NAME!,
                Key:resultKey,
                Body: fs.createReadStream(filePath),
                ContentType:"image/jpeg",
            })
            .promise();
        return resultKey;
    }finally {
        fs.unlinkSync(filePath);
        await s3
            .deleteObject({Bucket:process.env.BUCKET_NAME!,Key:rawKey})
            .promise();
    }
}
