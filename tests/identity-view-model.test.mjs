import assert from "node:assert/strict";
import test from "node:test";

import {
    buildIdentityFormData,
    getIdentityFormError,
    getIdentityImageUrl,
    getVisibleIdentityPages,
} from "../src/lib/identity-view-model.js";

test("requires name and a create image but allows image-less edits", () => {
    assert.equal(
        getIdentityFormError({ name: "", image: null }, "create"),
        "Vui lòng nhập tên.",
    );
    assert.equal(
        getIdentityFormError({ name: "Hau", image: null }, "create"),
        "Vui lòng chọn ảnh.",
    );
    assert.equal(getIdentityFormError({ name: " Hau ", image: null }, "edit"), "");
});

test("routes identity images through the backend proxy", () => {
    assert.equal(
        getIdentityImageUrl("/uploads/identities/1/crop.jpg"),
        "/api/backend/uploads/identities/1/crop.jpg",
    );
    assert.equal(
        getIdentityImageUrl("/api/backend/uploads/identities/1/full.jpg"),
        "/api/backend/uploads/identities/1/full.jpg",
    );
    assert.equal(getIdentityImageUrl(""), "");
});

test("builds multipart updates without an unchanged image", () => {
    const payload = buildIdentityFormData({ name: " Hau ", image: null });

    assert.equal(payload.get("name"), "Hau");
    assert.equal(payload.has("image"), false);
});

test("includes a selected image in multipart payloads", () => {
    const image = new Blob(["identity"], { type: "image/jpeg" });
    const payload = buildIdentityFormData({ name: "Hau", image });
    const payloadImage = payload.get("image");

    assert.equal(payload.get("name"), "Hau");
    assert.equal(payloadImage.type, "image/jpeg");
    assert.equal(payloadImage.size, image.size);
});

test("returns compact nearby numbered pagination", () => {
    assert.deepEqual(getVisibleIdentityPages(5, 10), [
        1,
        "ellipsis-left",
        4,
        5,
        6,
        "ellipsis-right",
        10,
    ]);
    assert.deepEqual(getVisibleIdentityPages(1, 3), [1, 2, 3]);
});
