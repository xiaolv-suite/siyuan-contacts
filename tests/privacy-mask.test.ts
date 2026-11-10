import { test } from "node:test";
import assert from "node:assert/strict";
import { maskPhone, maskEmail, maskWechat, maskGeneric } from "../src/domain/privacy-mask.ts";

test("maskPhone：标准 11 位手机号与不同长度电话遮罩", () => {
    assert.equal(maskPhone("13812345678"), "138****5678");
    assert.equal(maskPhone("+86 13987654321"), "+86 139****4321");
    assert.equal(maskPhone("021-88889999"), "021****99");
    assert.equal(maskPhone("12345"), "1****5");
    assert.equal(maskPhone("123"), "****");
    assert.equal(maskPhone(""), "");
    assert.equal(maskPhone(null), "");
    assert.equal(maskPhone(undefined), "");
});

test("maskEmail：电子邮箱用户名安全打码保留域名", () => {
    assert.equal(maskEmail("alexander@example.com"), "al***r@example.com");
    assert.equal(maskEmail("john@test.org"), "j***n@test.org");
    assert.equal(maskEmail("me@siyuan.io"), "m***@siyuan.io");
    assert.equal(maskEmail("invalid-email"), "in****il");
    assert.equal(maskEmail(""), "");
    assert.equal(maskEmail(null), "");
});

test("maskWechat：微信号脱敏保护", () => {
    assert.equal(maskWechat("wx_peter_1234"), "wx****34");
    assert.equal(maskWechat("ponyma"), "po****ma");
    assert.equal(maskWechat("tom"), "t***m");
    assert.equal(maskWechat("ab"), "****");
    assert.equal(maskWechat(""), "");
});

test("maskGeneric：通用文本隐私遮罩", () => {
    assert.equal(maskGeneric("北京市海淀区中关村南大街1号"), "北京****1号");
    assert.equal(maskGeneric("张三"), "***");
    assert.equal(maskGeneric("李四五"), "***");
    assert.equal(maskGeneric("赵钱孙李"), "赵***李");
});
