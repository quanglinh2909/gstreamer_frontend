import assert from "node:assert/strict";
import test from "node:test";

import {
    formatEventConfidence,
    formatEventTimestamp,
    getEventImageUrl,
    getEventResultLabel,
    getVisibleEventPages,
    incrementEventPageTotal,
    mergeLiveFaceEvents,
} from "../src/lib/event-view-model.js";
import * as eventViewModel from "../src/lib/event-view-model.js";

test("labels recognized results and unknown faces", () => {
    assert.equal(getEventResultLabel({ name: "" }, "face"), "Không xác định");
    assert.equal(getEventResultLabel({ name: null }, "face"), "Không xác định");
    assert.equal(getEventResultLabel({ plate_number: "61M-10352" }, "plate"), "61M-10352");
    assert.equal(getEventResultLabel({ id: 6 }, "restricted"), "Vùng cấm #6");
});

test("formats confidence and handles missing timestamps", () => {
    assert.equal(formatEventConfidence(0.2961), "29.6%");
    assert.equal(formatEventConfidence(0.5), "50%");
    assert.equal(formatEventTimestamp(null), "--");
});

test("routes backend images through the frontend proxy", () => {
    assert.equal(getEventImageUrl("/uploads/plates/a.jpg"), "/api/backend/uploads/plates/a.jpg");
    assert.equal(getEventImageUrl("/api/backend/uploads/plates/a.jpg"), "/api/backend/uploads/plates/a.jpg");
    assert.equal(getEventImageUrl(""), "");
});

test("builds tab websocket endpoint URLs from the configured base URL", () => {
    assert.equal(typeof eventViewModel.getEventSocketUrl, "function");
    assert.equal(
        eventViewModel.getEventSocketUrl("ws://192.168.103.97:8010/ws", "face"),
        "ws://192.168.103.97:8010/ws/face-events",
    );
    assert.equal(
        eventViewModel.getEventSocketUrl("ws://192.168.103.97:8010/ws/", "plate"),
        "ws://192.168.103.97:8010/ws/plate-events",
    );
    assert.equal(
        eventViewModel.getEventSocketUrl("ws://192.168.103.97:8010/ws/", "restricted"),
        "ws://192.168.103.97:8010/ws/restricted-area-events",
    );
    assert.equal(eventViewModel.getEventSocketUrl("", "face"), "");
});

test("returns compact nearby numbered pagination", () => {
    assert.deepEqual(getVisibleEventPages(5, 10), [
        1,
        "ellipsis-left",
        4,
        5,
        6,
        "ellipsis-right",
        10,
    ]);
    assert.deepEqual(getVisibleEventPages(1, 3), [1, 2, 3]);
    assert.deepEqual(getVisibleEventPages(99, 1), [1]);
});

test("prepends matching live face events, caps items and ignores duplicate totals", () => {
    const page = {
        items: [{ id: 2, camera_id: "camera-1" }, { id: 1, camera_id: "camera-1" }],
        total: 2,
        page: 1,
        size: 2,
        pages: 1,
    };
    const incoming = { id: 3, camera_id: "camera-1", name: "Hau" };

    const withIncoming = mergeLiveFaceEvents(page, [incoming], "camera-1");
    const withDuplicate = mergeLiveFaceEvents(withIncoming, [incoming], "camera-1");

    assert.deepEqual(withIncoming.items.map((event) => event.id), [3, 2]);
    assert.equal(withIncoming.total, 3);
    assert.equal(withIncoming.pages, 2);
    assert.equal(withDuplicate.total, 3);
    assert.deepEqual(mergeLiveFaceEvents(page, [incoming], "camera-2"), page);
});

test("keeps newest buffered live faces first and can update totals without changing older-page cards", () => {
    const page = {
        items: [{ id: 10, camera_id: "camera-1" }],
        total: 20,
        page: 2,
        size: 20,
        pages: 1,
    };
    const events = [
        { id: 22, camera_id: "camera-1" },
        { id: 21, camera_id: "camera-1" },
    ];

    assert.deepEqual(mergeLiveFaceEvents({ ...page, page: 1 }, events, "").items.map((event) => event.id), [22, 21, 10]);

    const updatedPage = incrementEventPageTotal(page, 2);

    assert.deepEqual(updatedPage.items, page.items);
    assert.equal(updatedPage.total, 22);
    assert.equal(updatedPage.pages, 2);
});

test("merges live plate events with the same pagination behavior", () => {
    assert.equal(typeof eventViewModel.mergeLiveEvents, "function");

    const page = {
        items: [{ id: 4, camera_id: "camera-1", plate_number: "51A-11111" }],
        total: 1,
        page: 1,
        size: 20,
        pages: 1,
    };
    const incoming = { id: 5, camera_id: "camera-1", plate_number: "61M-10352" };
    const updatedPage = eventViewModel.mergeLiveEvents(page, [incoming], "camera-1");
    const duplicatePage = eventViewModel.mergeLiveEvents(updatedPage, [incoming], "camera-1");

    assert.deepEqual(updatedPage.items.map((event) => event.plate_number), ["61M-10352", "51A-11111"]);
    assert.equal(updatedPage.total, 2);
    assert.equal(duplicatePage.total, 2);
});
