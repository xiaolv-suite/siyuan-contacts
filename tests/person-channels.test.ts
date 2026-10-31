import test from "node:test";
import assert from "node:assert/strict";
import {
    normalizeChannels,
    alignChannelsWithContact,
    getChannelActionHref,
    CHANNEL_TYPES,
    type ContactChannel,
} from "../src/domain/person-channels.ts";

test("person-channels: CHANNEL_TYPES 包含常用通讯分类", () => {
    assert.ok(CHANNEL_TYPES.some((t) => t.type === "phone"));
    assert.ok(CHANNEL_TYPES.some((t) => t.type === "wechat"));
    assert.ok(CHANNEL_TYPES.some((t) => t.type === "email"));
    assert.ok(CHANNEL_TYPES.some((t) => t.type === "landline"));
    assert.ok(CHANNEL_TYPES.some((t) => t.type === "im"));
    assert.ok(CHANNEL_TYPES.some((t) => t.type === "social"));
    assert.ok(CHANNEL_TYPES.some((t) => t.type === "address"));
    assert.ok(CHANNEL_TYPES.some((t) => t.type === "custom"));
});

test("person-channels: normalizeChannels 过滤空值与非法条目，规范化格式", () => {
    assert.deepEqual(normalizeChannels(null), []);
    assert.deepEqual(normalizeChannels("not-an-array"), []);
    assert.deepEqual(normalizeChannels([null, undefined, {}, { value: "" }]), []);

    const input = [
        { id: "c1", type: "phone", label: "工作手机", value: "13800138000", isPrimary: true },
        { id: "c2", type: "phone", label: "个人手机", value: "13900139000" },
        { id: "c3", type: "wechat", label: "主微信", value: "wx_work" },
        { id: "c4", type: "wechat", label: "生活小号", value: "wx_life" },
    ];
    const normalized = normalizeChannels(input);
    assert.equal(normalized.length, 4);
    assert.equal(normalized[0].label, "工作手机");
    assert.equal(normalized[0].value, "13800138000");
    assert.equal(normalized[0].isPrimary, true);
    assert.equal(normalized[1].label, "个人手机");
    assert.equal(normalized[1].value, "13900139000");
    assert.equal(normalized[2].label, "主微信");
    assert.equal(normalized[3].label, "生活小号");
});

test("person-channels: alignChannelsWithContact 将单值联系方式无缝补充为初始条目", () => {
    const contact = {
        phone: "13800001111",
        wechat: "wx_original",
        email: "test@domain.com",
    };
    const emptyChannels: ContactChannel[] = [];
    const aligned = alignChannelsWithContact(contact, emptyChannels);

    assert.equal(aligned.length, 3);
    assert.equal(aligned[0].type, "phone");
    assert.equal(aligned[0].value, "13800001111");
    assert.equal(aligned[0].isPrimary, true);
    assert.equal(aligned[1].type, "wechat");
    assert.equal(aligned[1].value, "wx_original");
    assert.equal(aligned[2].type, "email");
    assert.equal(aligned[2].value, "test@domain.com");

    // 若已经有副手机，原主手机仍应一并保留在列表中
    const existing: ContactChannel[] = [
        { id: "existing-p", type: "phone", label: "备用手机", value: "13999999999" },
    ];
    const aligned2 = alignChannelsWithContact(contact, existing);
    assert.equal(aligned2.some((c) => c.value === "13999999999"), true);
    assert.equal(aligned2.some((c) => c.value === "13800001111"), true);
    assert.equal(aligned2.filter((c) => c.type === "phone").length, 2);

    // 若 channels 中已有同值的主手机，则不重复插入
    const existingSame: ContactChannel[] = [
        { id: "same-p", type: "phone", label: "主手机", value: "13800001111", isPrimary: true },
        { id: "existing-p2", type: "phone", label: "工作手机", value: "13999999999" },
    ];
    const aligned3 = alignChannelsWithContact(contact, existingSame);
    assert.equal(aligned3.filter((c) => c.type === "phone").length, 2);
});

test("person-channels: getChannelActionHref 产出正确的呼叫与跳转动作协议", () => {
    assert.equal(
        getChannelActionHref({ id: "1", type: "phone", label: "手机", value: "138-0013-8000" }),
        "tel:13800138000",
    );
    assert.equal(
        getChannelActionHref({ id: "2", type: "landline", label: "座机", value: "010-88888888" }),
        "tel:01088888888",
    );
    assert.equal(
        getChannelActionHref({ id: "3", type: "email", label: "邮箱", value: "user@example.com" }),
        "mailto:user@example.com",
    );
    assert.equal(
        getChannelActionHref({ id: "4", type: "social", label: "网站", value: "github.com/someone" }),
        "https://github.com/someone",
    );
    assert.equal(
        getChannelActionHref({ id: "5", type: "social", label: "网站", value: "https://example.com" }),
        "https://example.com",
    );
    assert.equal(
        getChannelActionHref({ id: "6", type: "wechat", label: "微信", value: "wechat_id" }),
        null,
    );
});
