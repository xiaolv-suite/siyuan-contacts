import test from "node:test";
import assert from "node:assert/strict";
import {registerHooks} from "node:module";
import {existsSync, readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import ts from "typescript";
const hooks=registerHooks({
    resolve(specifier,context,next){
        if(specifier==="siyuan")return {shortCircuit:true,url:"data:text/javascript,"+encodeURIComponent("export function fetchPost(){throw Error('unexpected host request')}")};
        if(specifier.startsWith(".")&&context.parentURL?.startsWith("file:")){const candidate=new URL(specifier+".ts",context.parentURL);if(existsSync(fileURLToPath(candidate)))return next(candidate.href,context);}
        return next(specifier,context);
    },
    load(url,context,next){if(url.endsWith('.ts'))return {shortCircuit:true,format:'module',source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText};return next(url,context);}
});
const {listAllExchanges, createExchangesLedgerDoc}=await import("../src/services/exchanges.ts");
test.after(()=>hooks.deregister());
test("人情总账：读取失败/损坏不能返回空统计或发起导出", async()=>{
    for (const raw of [new Error("disk failure"), {schemaVersion:1,records:"broken"}]) {
        const plugin={loadData:async()=>{if(raw instanceof Error)throw raw;return raw;}} as any;
        await assert.rejects(()=>listAllExchanges(plugin));
        await assert.rejects(()=>createExchangesLedgerDoc(plugin,{notebookId:"fixture"} as any));
    }
});
test("人情总账：真正不存在的库仍返回空，恢复数据不受影响",async()=>{
    assert.deepEqual(await listAllExchanges({loadData:async()=>null} as any),[]);
});
