import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("identity API exposes typed paged CRUD endpoints using multipart payloads", () => {
    const interfaceSource = readFileSync("src/interface/identity.ts", "utf8");
    const apiSource = readFileSync("src/backend-api/identity-api.ts", "utf8");

    assert.match(interfaceSource, /interface Identity/);
    assert.match(interfaceSource, /id:\s*number/);
    assert.match(interfaceSource, /name:\s*string/);
    assert.match(interfaceSource, /image_full:\s*string/);
    assert.match(interfaceSource, /image_crop:\s*string/);
    assert.match(interfaceSource, /interface IdentityPage/);
    assert.match(interfaceSource, /items:\s*Identity\[\]/);

    assert.match(apiSource, /IdentityPage/);
    assert.match(apiSource, /list\(params:\s*\{\s*page:\s*number;\s*size:\s*number;\s*name\?:\s*string/);
    assert.match(apiSource, /detail\(id:\s*number\)/);
    assert.match(apiSource, /create\(data:\s*FormData\)/);
    assert.match(apiSource, /update\(id:\s*number,\s*data:\s*FormData\)/);
    assert.match(apiSource, /delete\(id:\s*number\)/);
    assert.match(apiSource, /get<IdentityPage>\("identities"/);
    assert.match(apiSource, /get<Identity>\(`identities\/\$\{id\}`\)/);
    assert.match(apiSource, /post<Identity>\("identities", data\)/);
    assert.match(apiSource, /put<Identity>\(`identities\/\$\{id\}`, data\)/);
    assert.match(apiSource, /delete\(`identities\/\$\{id\}`\)/);
});

test("identity manager coordinates search, pagination, detail and mutations", () => {
    const hookSource = readFileSync("src/hooks/use-identity-manager.ts", "utf8");

    assert.match(hookSource, /identityApi/);
    assert.match(hookSource, /IDENTITY_PAGE_SIZE\s*=\s*20/);
    assert.match(hookSource, /submittedName/);
    assert.match(hookSource, /currentPage/);
    assert.match(hookSource, /identityApi\.list/);
    assert.match(hookSource, /name:\s*submittedName/);
    assert.match(hookSource, /identityApi\.detail/);
    assert.match(hookSource, /identityApi\.create/);
    assert.match(hookSource, /identityApi\.update/);
    assert.match(hookSource, /identityApi\.delete/);
    assert.match(hookSource, /buildIdentityFormData/);
    assert.match(hookSource, /handleFormSubmit/);
    assert.match(hookSource, /confirmDeleteIdentity/);
});

test("identities page composes a gallery management dashboard in the shared layout", () => {
    const pageSource = readFileSync("src/pages/identities.tsx", "utf8");
    const dashboardSource = readFileSync("src/components/identities/identity-dashboard.tsx", "utf8");
    const cardSource = readFileSync("src/components/identities/identity-card.tsx", "utf8");
    const imageSource = readFileSync("src/components/identities/identity-image.tsx", "utf8");
    const paginationSource = readFileSync("src/components/identities/identity-pagination.tsx", "utf8");

    assert.match(pageSource, /IdentityDashboard/);
    assert.match(pageSource, /MainLayout/);
    assert.match(pageSource, /useIdentityManager/);
    assert.match(dashboardSource, /Thêm identity/);
    assert.match(dashboardSource, /Tìm theo tên/);
    assert.match(dashboardSource, /IdentityCard/);
    assert.match(dashboardSource, /IdentityPagination/);
    assert.match(dashboardSource, /IdentityDetailModal/);
    assert.match(dashboardSource, /IdentityFormModal/);
    assert.match(dashboardSource, /DeleteIdentityModal/);
    assert.match(dashboardSource, /aspect-\[5\/6\]/);
    assert.match(dashboardSource, /xl:grid-cols-6/);
    assert.match(dashboardSource, /2xl:grid-cols-7/);
    assert.match(cardSource, /image_crop/);
    assert.match(cardSource, /aspect-\[5\/6\]/);
    assert.match(imageSource, /getIdentityImageUrl/);
    assert.match(paginationSource, /getVisibleIdentityPages/);
});

test("identity dialogs provide full-image preview, multipart editing, and delete confirmation", () => {
    const detailSource = readFileSync("src/components/identities/identity-detail-modal.tsx", "utf8");
    const formSource = readFileSync("src/components/identities/identity-form-modal.tsx", "utf8");
    const deleteSource = readFileSync("src/components/identities/delete-identity-modal.tsx", "utf8");

    assert.match(detailSource, /image_full/);
    assert.match(detailSource, /Escape/);
    assert.match(detailSource, /onEdit/);
    assert.match(detailSource, /onDelete/);
    assert.match(formSource, /type="file"/);
    assert.match(formSource, /mode === "create"/);
    assert.match(formSource, /form\.previewUrl/);
    assert.match(formSource, /aspect-\[5\/6\]/);
    assert.match(readFileSync("src/hooks/use-identity-manager.ts", "utf8"), /URL\.createObjectURL/);
    assert.match(deleteSource, /Xóa identity/);
    assert.match(deleteSource, /onConfirm/);
});

test("sidebar links to identity management", () => {
    const menuSource = readFileSync("src/components/leftmenu/leftmenu.tsx", "utf8");

    assert.match(menuSource, /label:\s*"Identities"/);
    assert.match(menuSource, /href:\s*"\/identities"/);
});
