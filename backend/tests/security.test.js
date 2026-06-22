import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import app from "../app.js";
import {
    authAccountRateLimiter,createRateLimiter,requestContext,securityHeaders,
} from "../middleware/securityMiddleware.js";
import {
    cleanText,finiteNumber,isPlainObject,positiveId,validEmail,validHex,
} from "../libs/validation.js";

const mockResponse=()=>{
    const headers=new Map();
    return {
        statusCode:200,body:null,
        setHeader:(name,value)=>headers.set(name.toLowerCase(),String(value)),
        getHeader:name=>headers.get(name.toLowerCase()),
        status(code){this.statusCode=code;return this;},
        json(body){this.body=body;return this;},
    };
};

test("security headers and request ID are attached",()=>{
    const req={headers:{}};
    const res=mockResponse();
    requestContext(req,res,()=>{});
    securityHeaders(req,res,()=>{});
    assert.match(req.requestId,/^[0-9a-f-]{36}$/);
    assert.equal(res.getHeader("x-request-id"),req.requestId);
    assert.equal(res.getHeader("x-content-type-options"),"nosniff");
    assert.equal(res.getHeader("x-frame-options"),"DENY");
    assert.match(res.getHeader("content-security-policy"),/frame-ancestors 'none'/);
});

test("rate limiter blocks requests above configured maximum",()=>{
    const limiter=createRateLimiter({windowMs:60_000,max:2,keyGenerator:()=> "client"});
    const req={headers:{},requestId:"test-request"};
    const first=mockResponse(),second=mockResponse(),third=mockResponse();
    let allowed=0;
    limiter(req,first,()=>allowed++);
    limiter(req,second,()=>allowed++);
    limiter(req,third,()=>allowed++);
    assert.equal(allowed,2);
    assert.equal(third.statusCode,429);
    assert.equal(third.body.status,"rate_limited");
    assert.equal(third.getHeader("retry-after"),"60");
});

test("account limiter groups e-mail addresses case-insensitively",()=>{
    authAccountRateLimiter.reset();
    let allowed=0;
    for(let index=0;index<11;index++){
        const req={
            body:{email:index%2?"USER@example.com":"user@example.com"},
            headers:{},requestId:"account-limit",
        };
        authAccountRateLimiter(req,mockResponse(),()=>allowed++);
    }
    assert.equal(allowed,10);
    authAccountRateLimiter.reset();
});

test("validation helpers reject unsafe or malformed values",()=>{
    assert.equal(validEmail("user@example.com"),true);
    assert.equal(validEmail("not-an-email"),false);
    assert.equal(validHex("#7C3AED"),true);
    assert.equal(validHex("javascript:alert(1)"),false);
    assert.equal(positiveId("42"),true);
    assert.equal(positiveId("-1"),false);
    assert.equal(finiteNumber("12.5"),true);
    assert.equal(finiteNumber("Infinity"),false);
    assert.equal(isPlainObject({name:"safe"}),true);
    assert.equal(isPlainObject([]),false);
    assert.equal(cleanText("  abcdef  ",4),"abcd");
});

const request=({method="GET",path="/",body,headers={}})=>new Promise((resolve,reject)=>{
    const server=app.listen(0,"127.0.0.1",()=>{
        const payload=body===undefined?null:JSON.stringify(body);
        const req=http.request({
            hostname:"127.0.0.1",port:server.address().port,path,method,
            headers:{
                ...(payload?{"Content-Type":"application/json","Content-Length":Buffer.byteLength(payload)}:{}),
                ...headers,
            },
        },res=>{
            let data="";
            res.on("data",chunk=>data+=chunk);
            res.on("end",()=>{
                server.close();
                resolve({status:res.statusCode,headers:res.headers,body:data?JSON.parse(data):null});
            });
        });
        req.on("error",error=>{server.close();reject(error);});
        if(payload)req.write(payload);
        req.end();
    });
});

test("invalid sign-in is rejected before database access",async()=>{
    const response=await request({
        method:"POST",path:"/api-v1/auth/sign-in",
        body:{email:"invalid",password:"x"},
    });
    assert.equal(response.status,400);
    assert.equal(response.headers["x-content-type-options"],"nosniff");
    assert.ok(response.headers["x-request-id"]);
    assert.equal(response.body.status,"Failed");
});

test("malformed JSON returns a controlled 400 response",async()=>{
    const response=await new Promise((resolve,reject)=>{
        const server=app.listen(0,"127.0.0.1",()=>{
            const req=http.request({
                hostname:"127.0.0.1",port:server.address().port,
                path:"/api-v1/auth/sign-in",method:"POST",
                headers:{"Content-Type":"application/json"},
            },res=>{
                let data="";
                res.on("data",chunk=>data+=chunk);
                res.on("end",()=>{server.close();resolve({status:res.statusCode,body:JSON.parse(data)});});
            });
            req.on("error",error=>{server.close();reject(error);});
            req.end('{"email":');
        });
    });
    assert.equal(response.status,400);
    assert.equal(response.body.message,"Invalid request body");
    assert.ok(response.body.request_id);
});
