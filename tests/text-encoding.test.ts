import assert from "node:assert/strict";
import test from "node:test";
import { documentHPath, markdownHeading, validateDocumentTitle } from "../src/domain/format.ts";
import { emptyDraft, validateDraft } from "../src/domain/person.ts";
import { occasionDiaryPath, occasionPlacePath } from "../src/domain/occasion-links.ts";
import { buildTaskMarkdown, parseTaskMarkdown } from "../src/domain/followup-doc.ts";

test("文档路径保留支持的原文标点，不做会改变标题的 URL 编码", () => {
    const title = "中文 空格 [甲](乙)#%\\名字";
    assert.equal(documentHPath("人脉", title), `/人脉/${title}`);
    assert.equal(validateDraft({ ...emptyDraft(), name: title }).length, 0);
    assert.equal(markdownHeading(title), "# 中文 空格 \\[甲\\](乙)\\#%\\\\名字\n\n");
});

test("控制字符在路径或草稿阶段拒绝，不静默破坏换行或不可见字符", () => {
    for (const title of ["甲\n乙", "甲\r乙", "甲\t乙", "甲\0乙"]) {
        assert.ok(validateDocumentTitle(title));
        assert.throws(() => documentHPath("人脉", title), /无法原文保留/);
        assert.ok(validateDraft({ ...emptyDraft(), name: title }).length);
    }
    assert.throws(() => occasionPlacePath("人\n脉", "会议室"));
    assert.throws(() => documentHPath(""));
});

test("思源 3.8.8+ 复合命名：姓名允许包含斜杠，路径段安全转义为全角斜杠防止层级分裂", () => {
    const complexTitle = "张三 / 某某科技CTO";
    assert.equal(validateDocumentTitle(complexTitle), null, "允许复合斜杠命名");
    assert.equal(validateDraft({ ...emptyDraft(), name: complexTitle }).length, 0, "草稿校验通过");
    assert.equal(documentHPath("人脉", complexTitle), "/人脉/张三 ／ 某某科技CTO", "路径段自动转为安全全角斜杠");
});

test("受控日期只解析任务行末尾标记，不从标题与普通文本猜测", () => {
    assert.throws(() => buildTaskMarkdown("回电", "2026-02-30", false));
    assert.equal(parseTaskMarkdown("普通说明 📅2026-10-04").dueDate, null);
    assert.equal(parseTaskMarkdown("- [ ] 提到 📅2026-10-01 后续说明").dueDate, null);
    assert.equal(parseTaskMarkdown("* [x] 回电 📅2026-10-04").done, true);
    assert.deepEqual(parseTaskMarkdown(buildTaskMarkdown("讨论 📅2026-10-01", "2026-10-04", false)), {
        done: false, title: "讨论 📅2026-10-01", dueDate: "2026-10-04",
    });
});
