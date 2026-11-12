import { test } from "node:test";
import assert from "node:assert/strict";
import {
    isValidAvatarUrl,
    AVATAR_TARGET_SIZE,
    CARD_MAX_EDGE,
    MAX_RAW_IMAGE_SIZE,
    calculateAspectRatioFit,
} from "../src/shared/avatar-processor.ts";

test("isValidAvatarUrl: 校验合法与非法的头像图片链接", () => {
    assert.equal(isValidAvatarUrl(""), false);
    assert.equal(isValidAvatarUrl("   "), false);
    assert.equal(isValidAvatarUrl("bad-url"), false);

    // 合法 http / https 链接
    assert.equal(isValidAvatarUrl("https://example.com/avatar.jpg"), true);
    assert.equal(isValidAvatarUrl("http://localhost:6806/assets/photo.png"), true);
    assert.equal(isValidAvatarUrl("assets/20261031120000-xxxx.png"), true);

    // 合法 base64 data URL
    assert.equal(isValidAvatarUrl("data:image/webp;base64,UklGRkAAAABXRUJQVlA4"), true);
    assert.equal(isValidAvatarUrl("data:image/jpeg;base64,/9j/4AAQSkZJRg=="), true);
    assert.equal(isValidAvatarUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="), true);

    // 非法 data URL
    assert.equal(isValidAvatarUrl("data:text/plain;base64,hello"), false);
    assert.equal(isValidAvatarUrl("data:image/webp;base64,invalid!@#"), false);
});

test("avatar & card constants: 目标尺寸与大小上限受控", () => {
    assert.equal(AVATAR_TARGET_SIZE, 160);
    assert.equal(CARD_MAX_EDGE, 1200);
    assert.equal(MAX_RAW_IMAGE_SIZE, 15 * 1024 * 1024);
});

test("calculateAspectRatioFit: 名片等比例缩放保留原图比例与文字清晰度", () => {
    // 未超过上限：保持原尺寸
    assert.deepEqual(calculateAspectRatioFit(800, 500, 1200), { width: 800, height: 500 });
    assert.deepEqual(calculateAspectRatioFit(600, 900, 1200), { width: 600, height: 900 });

    // 超高像素大图（4000x2400）等比例缩放到长边 1200
    const scaledHorizontal = calculateAspectRatioFit(4000, 2400, 1200);
    assert.equal(scaledHorizontal.width, 1200);
    assert.equal(scaledHorizontal.height, 720);

    // 竖版大图（1800x3600）
    const scaledVertical = calculateAspectRatioFit(1800, 3600, 1200);
    assert.equal(scaledVertical.width, 600);
    assert.equal(scaledVertical.height, 1200);
});
