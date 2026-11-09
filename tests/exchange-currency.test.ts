import test from "node:test";
import assert from "node:assert/strict";
import {computeExchangesSummary, buildExchangesLedgerMarkdown, formatExchangeAmount} from "../src/domain/exchanges-summary.ts";
import {parseExchangeStore} from "../src/domain/exchanges.ts";
const record=(id:string,currency?:string)=>({id,personDocId:"20261109000000-person1",kind:"money" as const,direction:"receivable" as const,description:"款项",amount:100,...(currency===undefined?{}:{currency}),occurredOn:"2026-11-09",dueOn:"",status:"open" as const,settledOn:"",note:"",createdAt:1,updatedAt:1});
test("different currencies retain independent totals and per-row units; no conversion",()=>{
    const summary=computeExchangesSummary([record("usd","USD"),record("cny","CNY"),record("usd2","usd")] as any);
    assert.deepEqual(summary.moneySummary.byCurrency,[{currency:"CNY",receivableTotal:100,payableTotal:0},{currency:"USD",receivableTotal:200,payableTotal:0}]);
    assert.equal(summary.moneySummary.receivableTotal,100);
    const md=buildExchangesLedgerMarkdown(summary);
    assert.ok(md.includes("收到 200.00 USD"));assert.ok(md.includes("收到 ¥100.00"));
    assert.ok(md.includes("| 100 USD |"));assert.ok(!md.includes("¥300"));
    assert.equal(formatExchangeAmount(0,"EUR"),"0 EUR");
});
test("legacy missing/blank currency reads as CNY without mutating raw records",()=>{
    const raw={schemaVersion:1,records:[record("20261109000000-record1"),record("20261109000000-record2","")]};
    const store=parseExchangeStore(raw);
    assert.equal(store.records[0].currency,"CNY");assert.equal(store.records[1].currency,"CNY");
    assert.equal('currency' in raw.records[0],false);assert.equal(raw.records[1].currency,"");
});
