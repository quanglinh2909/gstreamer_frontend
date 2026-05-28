import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const faceApiSource = readFileSync("src/backend-api/face-recognition-api.ts", "utf8");
const plateApiSource = readFileSync("src/backend-api/plate-recognition-api.ts", "utf8");
const restrictedApiSource = readFileSync("src/backend-api/restricted-area-api.ts", "utf8");

test("recognition event APIs support typed all-camera and filtered requests", () => {
    const eventTypesSource = readFileSync("src/interface/recognition-event.ts", "utf8");

    assert.match(eventTypesSource, /interface RecognitionEventPage/);
    assert.match(eventTypesSource, /plate_number:\s*string/);
    assert.match(eventTypesSource, /name\?:\s*string\s*\|\s*null/);
    assert.match(faceApiSource, /FaceRecognitionEvent/);
    assert.match(faceApiSource, /RecognitionEventPage<FaceRecognitionEvent>/);
    assert.match(faceApiSource, /camera_id\?:\s*string/);
    assert.match(faceApiSource, /face-recognition\/events/);
    assert.match(plateApiSource, /PlateRecognitionEvent/);
    assert.match(plateApiSource, /RecognitionEventPage<PlateRecognitionEvent>/);
    assert.match(plateApiSource, /camera_id\?:\s*string/);
    assert.match(plateApiSource, /plate-recognition\/events/);
    assert.match(eventTypesSource, /RestrictedAreaEvent/);
    assert.match(eventTypesSource, /"restricted"/);
    assert.match(restrictedApiSource, /RestrictedAreaEvent/);
    assert.match(restrictedApiSource, /RecognitionEventPage<RestrictedAreaEvent>/);
    assert.match(restrictedApiSource, /camera_id\?:\s*string/);
    assert.match(restrictedApiSource, /restricted-area\/events/);
});

test("event manager loads tab pages with the optional camera filter", () => {
    const hookSource = readFileSync("src/hooks/use-event-manager.ts", "utf8");

    assert.match(hookSource, /cameraApi\.getCameras/);
    assert.match(hookSource, /plateRecognitionApi\.events/);
    assert.match(hookSource, /faceRecognitionApi\.events/);
    assert.match(hookSource, /restrictedAreaApi\.events/);
    assert.match(hookSource, /EVENT_PAGE_SIZE\s*=\s*20/);
    assert.match(hookSource, /activeTab/);
    assert.match(hookSource, /useState<RecognitionEventTab>\("face"\)/);
    assert.match(hookSource, /selectedCameraId/);
    assert.match(hookSource, /pagesByTab/);
    assert.match(hookSource, /restricted:\s*1/);
    assert.match(hookSource, /camera_id:\s*selectedCameraId/);
});

test("event socket store validates face and plate realtime messages through Zustand", () => {
    const storePath = "src/stores/use-event-socket-store.ts";

    assert.equal(existsSync(storePath), true);

    const storeSource = readFileSync(storePath, "utf8");

    assert.match(storeSource, /from\s+"zustand"/);
    assert.match(storeSource, /create</);
    assert.match(storeSource, /new WebSocket/);
    assert.match(storeSource, /FaceRecognitionEvent/);
    assert.match(storeSource, /PlateRecognitionEvent/);
    assert.match(storeSource, /RestrictedAreaEvent/);
    assert.match(storeSource, /RecognitionEventTab/);
    assert.match(storeSource, /plate_number/);
    assert.match(storeSource, /JSON\.parse/);
    assert.match(storeSource, /sequence/);
    assert.match(storeSource, /receivedEvents/);
    assert.match(storeSource, /connect:/);
    assert.match(storeSource, /disconnect:/);
    assert.match(storeSource, /reconnecting/);
});

test("events page composes the event gallery inside the shared layout", () => {
    const pageSource = readFileSync("src/pages/events.tsx", "utf8");

    assert.match(pageSource, /EventDashboard/);
    assert.match(pageSource, /MainLayout/);
    assert.match(pageSource, /useEventManager/);
});

test("each event tab wires its WebSocket endpoint into live updates", () => {
    const pageSource = readFileSync("src/pages/events.tsx", "utf8");
    const hookSource = readFileSync("src/hooks/use-event-manager.ts", "utf8");
    const dashboardSource = readFileSync("src/components/events/event-dashboard.tsx", "utf8");

    assert.match(pageSource, /getServerSideProps/);
    assert.match(pageSource, /process\.env\.WEBSOCKET_ORIGIN/);
    assert.match(pageSource, /useEventManager\(websocketOrigin\)/);
    assert.match(hookSource, /getEventSocketUrl/);
    assert.match(hookSource, /useEventSocketStore/);
    assert.match(hookSource, /connectSocket/);
    assert.match(hookSource, /disconnectSocket/);
    assert.match(hookSource, /mergeLiveEvents/);
    assert.match(hookSource, /incrementEventPageTotal/);
    assert.match(hookSource, /pendingEvents/);
    assert.match(hookSource, /showLatestEvents/);
    assert.match(dashboardSource, /socketStatus/);
    assert.match(dashboardSource, /Trực tuyến/);
    assert.match(dashboardSource, /Vùng cấm/);
    assert.match(dashboardSource, /pendingEvents/);
    assert.match(dashboardSource, /sự kiện mới/);
});

test("event gallery renders tabs, filters, preview cards, and pagination", () => {
    const dashboardSource = readFileSync("src/components/events/event-dashboard.tsx", "utf8");
    const cardSource = readFileSync("src/components/events/event-card.tsx", "utf8");
    const paginationSource = readFileSync("src/components/events/event-pagination.tsx", "utf8");

    assert.match(dashboardSource, /Biển số/);
    assert.match(dashboardSource, /Khuôn mặt/);
    assert.match(dashboardSource, /Vùng cấm/);
    assert.match(dashboardSource, /Tất cả camera/);
    assert.match(dashboardSource, /EventCard/);
    assert.match(dashboardSource, /EventImageModal/);
    assert.match(dashboardSource, /EventPagination/);
    assert.match(dashboardSource, /grid/);
    assert.match(dashboardSource, /portraitCards/);
    assert.match(dashboardSource, /manager\.activeTab !== "plate"/);
    assert.match(dashboardSource, /aspect-\[5\/6\]/);
    assert.match(dashboardSource, /xl:grid-cols-6/);
    assert.match(dashboardSource, /2xl:grid-cols-7/);
    assert.match(dashboardSource, /lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6/);
    assert.match(dashboardSource, /portrait \? "aspect-\[5\/6\]" : "h-32"/);
    assert.match(cardSource, /image_crop/);
    assert.match(cardSource, /getEventResultLabel/);
    assert.match(cardSource, /aspect-\[5\/6\]/);
    assert.match(cardSource, /compactCard/);
    assert.match(cardSource, /tab === "plate"/);
    assert.match(cardSource, /preserveDetails/);
    assert.match(cardSource, /tab === "restricted"/);
    assert.match(cardSource, /object-contain/);
    assert.match(cardSource, /compactCard \? "h-32"/);
    assert.match(cardSource, /compactCard \? "space-y-2 p-3"/);
    assert.match(paginationSource, /getVisibleEventPages/);
});

test("event preview modal is dismissible and navigation exposes Events", () => {
    const modalSource = readFileSync("src/components/events/event-image-modal.tsx", "utf8");
    const menuSource = readFileSync("src/components/leftmenu/leftmenu.tsx", "utf8");

    assert.match(modalSource, /image_full/);
    assert.match(modalSource, /Escape/);
    assert.match(menuSource, /label:\s*"Events"/);
    assert.match(menuSource, /href:\s*"\/events"/);
});
