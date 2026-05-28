import assert from "node:assert/strict";
import test from "node:test";

import {
    buildPlateWhiteListPayload,
    getPlateWhiteListFormError,
    getVisiblePlateWhiteListPages,
} from "../src/lib/plate-white-list-view-model.js";

test("validates required plate whitelist form fields", () => {
    assert.equal(
        getPlateWhiteListFormError({ plateNumber: "", name: "Xe cong ty" }),
        "Vui lòng nhập biển số.",
    );
    assert.equal(
        getPlateWhiteListFormError({ plateNumber: "51a-12345", name: "" }),
        "Vui lòng nhập tên.",
    );
    assert.equal(
        getPlateWhiteListFormError({ plateNumber: " 51a-12345 ", name: " Xe cong ty " }),
        "",
    );
});

test("builds trimmed JSON payload with an uppercased plate number", () => {
    assert.deepEqual(
        buildPlateWhiteListPayload({ plateNumber: " 51a-12345 ", name: " Xe cong ty " }),
        {
            plate_number: "51A-12345",
            name: "Xe cong ty",
        },
    );
});

test("returns compact nearby numbered whitelist pagination", () => {
    assert.deepEqual(getVisiblePlateWhiteListPages(5, 10), [
        1,
        "ellipsis-left",
        4,
        5,
        6,
        "ellipsis-right",
        10,
    ]);
    assert.deepEqual(getVisiblePlateWhiteListPages(1, 3), [1, 2, 3]);
});
