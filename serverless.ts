import type { AWS } from "@serverless/typescript";
import resources from "./s3-cloudfront";

const config: AWS = {
    service: "photo-sizing",
    frameworkVersion: "3",
    provider: {
        name: "aws",
        runtime: "nodejs14.x",
        region: "ap-northeast-2",
        environment:{
            BUCKET_NAME:process.env.BUCKET_NAME!,
            ROOT_DOMAIN:process.env.ROOT_DOMAIN!,
            ACM_CERTIFICATE_ARN: process.env.ACM_CERTIFICATE_ARN!
        },
        iam:{
            role:{
                statements:[
                    {
                      Action: ['s3:PutObject','s3:GetObject','s3:DeleteObject'],
                      Effect:'Allow',
                      Resource: `arn:aws:s3:::${process.env.BUCKET_NAME}/raw/*`,
                    },
                    {
                        Action:["s3:PutObject","s3:GetObject"],
                        Effect:'Allow',
                        Resource:`arn:aws:s3:::${process.env.BUCKET_NAME}/photo/*`,
                    },
                ]
            },
        },
    },
    custom:{
        scripts:{
            hooks:{
                "webpack:package:packageModules":
                    "cp jpegoptim.tar.gz .webpack/service",
            }
        }
    },
    functions: {
        optimizeAndUpload: {
            handler: "handler.optimizeAndUpload",
            events: [
                {
                    httpApi: {
                        path: "/optimizeAndUpload",
                        method: "put",
                    },
                },
            ],
        },
        getSignedURL:{
            handler:"handler.getSignedURL",
            events:[
                {
                    httpApi:{
                        path:'/getSignedURL',
                        method:'get',
                    }
                }
            ]
        }
    },
    plugins: ["serverless-plugin-scripts","serverless-webpack"],
    resources
};

export = config;