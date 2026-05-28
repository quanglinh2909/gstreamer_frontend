import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("plate whitelist API exposes typed paged JSON CRUD endpoints", () => {
    const interfaceSource = readFileSync("src/interface/plate-white-list.ts", "utf8");
    const apiSource = readFileSync("src/backend-api/plate-white-list-api.ts", "utf8");

    assert.match(interfaceSource, /interface PlateWhiteListEntry/);
    assert.match(interfaceSource, /id:\s*number/);
    assert.match(interfaceSource, /plate_number:\s*string/);
    assert.match(interfaceSource, /name:\s*string/);
    assert.match(interfaceSource, /interface PlateWhiteListPage/);
    assert.match(interfaceSource, /items:\s*PlateWhiteListEntry\[\]/);
    assert.match(interfaceSource, /interface PlateWhiteListPayload/);

    assert.match(apiSource, /plateWhiteListApi/);
    assert.match(apiSource, /list\(params:\s*\{\s*page:\s*number;\s*size:\s*number;\s*plate_number\?:\s*string/);
    assert.match(apiSource, /get<PlateWhiteListPage>\("plate-white-list"/);
    assert.match(apiSource, /get<PlateWhiteListEntry>\(`plate-white-list\/\$\{id\}`\)/);
    assert.match(apiSource, /post<PlateWhiteListEntry>\("plate-white-list", data\)/);
    assert.match(apiSource, /put<PlateWhiteListEntry>\(`plate-white-list\/\$\{id\}`, data\)/);
    assert.match(apiSource, /delete\(`plate-white-list\/\$\{id\}`\)/);
});

test("plate whitelist manager coordinates search pagination and CRUD", () => {
    const hookSource = readFileSync("src/hooks/use-plate-white-list-manager.ts", "utf8");

    assert.match(hookSource, /plateWhiteListApi/);
    assert.match(hookSource, /PLATE_WHITE_LIST_PAGE_SIZE\s*=\s*20/);
    assert.match(hookSource, /submittedPlateNumber/);
    assert.match(hookSource, /plate_number:\s*submittedPlateNumber/);
    assert.match(hookSource, /plateWhiteListApi\.list/);
    assert.match(hookSource, /plateWhiteListApi\.create/);
    assert.match(hookSource, /plateWhiteListApi\.update/);
    assert.match(hookSource, /plateWhiteListApi\.delete/);
    assert.match(hookSource, /buildPlateWhiteListPayload/);
    assert.match(hookSource, /handleFormSubmit/);
    assert.match(hookSource, /confirmDeleteEntry/);
});

test("plate whitelist page renders table management inside the shared layout", () => {
    const pageSource = readFileSync("src/pages/plate-white-list.tsx", "utf8");
    const dashboardSource = readFileSync("src/components/plate-white-list/plate-white-list-dashboard.tsx", "utf8");
    const tableSource = readFileSync("src/components/plate-white-list/plate-white-list-table.tsx", "utf8");
    const formSource = readFileSync("src/components/plate-white-list/plate-white-list-form-modal.tsx", "utf8");
    const deleteSource = readFileSync("src/components/plate-white-list/delete-plate-white-list-modal.tsx", "utf8");
    const paginationSource = readFileSync("src/components/plate-white-list/plate-white-list-pagination.tsx", "utf8");

    assert.match(pageSource, /PlateWhiteListDashboard/);
    assert.match(pageSource, /MainLayout/);
    assert.match(pageSource, /usePlateWhiteListManager/);
    assert.match(dashboardSource, /Thêm biển số/);
    assert.match(dashboardSource, /Tìm theo biển số/);
    assert.match(dashboardSource, /PlateWhiteListTable/);
    assert.match(dashboardSource, /PlateWhiteListFormModal/);
    assert.match(dashboardSource, /DeletePlateWhiteListModal/);
    assert.match(tableSource, /Biển số/);
    assert.match(tableSource, /Tên/);
    assert.match(tableSource, /Thao tác/);
    assert.match(tableSource, /onEdit/);
    assert.match(tableSource, /onDelete/);
    assert.match(formSource, /plateNumber/);
    assert.match(formSource, /name/);
    assert.match(deleteSource, /Xóa biển số/);
    assert.match(paginationSource, /getVisiblePlateWhiteListPages/);
});

test("sidebar links to plate whitelist management", () => {
    const menuSource = readFileSync("src/components/leftmenu/leftmenu.tsx", "utf8");

    assert.match(menuSource, /label:\s*"Plate Whitelist"/);
    assert.match(menuSource, /href:\s*"\/plate-white-list"/);
});
