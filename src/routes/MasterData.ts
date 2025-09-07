import { Hono } from "hono";
import * as AuthMiddleware from "$middlewares/authMiddleware";

import * as ShiftController from "$controllers/rest/master-data/shfit";
import * as RuanganController from "$controllers/rest/master-data/ruangan";
import * as MataKuliahController from "$controllers/rest/master-data/mata-kuliah";
import * as MahasiswaController from "$controllers/rest/master-data/mahasiswa";
import * as DosenController from "$controllers/rest/master-data/dosen";

import * as ShiftValidation from "$validations/master-data/shift";
import * as RuanganValidation from "$validations/master-data/ruangan";
import * as MataKuliahValidation from "$validations/master-data/matakuliah";
import * as DosenValidation from "$validations/master-data/dosen";

const MasterDataRoutes = new Hono();

// ======= Shift =======
MasterDataRoutes.get("/shift", AuthMiddleware.checkJwt, ShiftController.getAll);
MasterDataRoutes.get(
    "/shift/:id",
    AuthMiddleware.checkJwt,
    ShiftController.getById
);
MasterDataRoutes.post(
    "/shift",
    AuthMiddleware.checkJwt,
    ShiftValidation.validateShift,
    ShiftController.create
);
MasterDataRoutes.put(
    "/shift/:id",
    AuthMiddleware.checkJwt,
    ShiftValidation.validateShift,
    ShiftController.update
);
MasterDataRoutes.delete(
    "/shift",
    AuthMiddleware.checkJwt,
    ShiftController.deleteByIds
);
MasterDataRoutes.put(
    "/shift/:id/activate",
    AuthMiddleware.checkJwt,
    ShiftController.activate
);
// =====================

// ======= Ruangan =======
MasterDataRoutes.get(
    "/ruangan",
    AuthMiddleware.checkJwt,
    RuanganController.getAll
);
MasterDataRoutes.get(
    "/ruangan/:id",
    AuthMiddleware.checkJwt,
    RuanganController.getById
);
MasterDataRoutes.post(
    "/ruangan",
    AuthMiddleware.checkJwt,
    RuanganValidation.validateRuangan,
    RuanganController.create
);
MasterDataRoutes.put(
    "/ruangan/:id",
    AuthMiddleware.checkJwt,
    RuanganValidation.validateRuangan,
    RuanganController.update
);
MasterDataRoutes.delete(
    "/ruangan",
    AuthMiddleware.checkJwt,
    RuanganController.deleteByIds
);
MasterDataRoutes.put(
    "/ruangan/:id/activate",
    AuthMiddleware.checkJwt,
    RuanganController.activate
);
// =====================

// ======= MataKuliah =======
MasterDataRoutes.get(
    "/mata-kuliah",
    AuthMiddleware.checkJwt,
    MataKuliahController.getAll
);
MasterDataRoutes.get(
    "/mata-kuliah/:id",
    AuthMiddleware.checkJwt,
    MataKuliahController.getById
);
MasterDataRoutes.post(
    "/mata-kuliah",
    AuthMiddleware.checkJwt,
    MataKuliahValidation.validateMatakuliah,
    MataKuliahController.create
);
MasterDataRoutes.put(
    "/mata-kuliah/:id",
    AuthMiddleware.checkJwt,
    MataKuliahValidation.validateMatakuliah,
    MataKuliahController.update
);
MasterDataRoutes.delete(
    "/mata-kuliah",
    AuthMiddleware.checkJwt,
    MataKuliahController.deleteByIds
);
MasterDataRoutes.post(
    "/mata-kuliah/bulk-upload",
    AuthMiddleware.checkJwt,
    MataKuliahController.bulkUpload
);
// =====================

// ======= Mahasiswa =======
MasterDataRoutes.get(
    "/mahasiswa",
    AuthMiddleware.checkJwt,
    MahasiswaController.getAll
);
MasterDataRoutes.get(
    "/mahasiswa/:id",
    AuthMiddleware.checkJwt,
    MahasiswaController.getById
);
MasterDataRoutes.post(
    "/mahasiswa",
    AuthMiddleware.checkJwt,
    MahasiswaController.create
);
MasterDataRoutes.put(
    "/mahasiswa/:id",
    AuthMiddleware.checkJwt,
    MahasiswaController.update
);
MasterDataRoutes.delete(
    "/mahasiswa",
    AuthMiddleware.checkJwt,
    MahasiswaController.deleteByIds
);
MasterDataRoutes.post(
    "/mahasiswa/bulk-upload",
    AuthMiddleware.checkJwt,
    MahasiswaController.bulkUpload
);
// =====================

// ======= Dosen =======
MasterDataRoutes.get("/dosen", AuthMiddleware.checkJwt, DosenController.getAll);
MasterDataRoutes.get(
    "/dosen/:id",
    AuthMiddleware.checkJwt,
    DosenController.getById
);
MasterDataRoutes.post(
    "/dosen",
    AuthMiddleware.checkJwt,
    DosenValidation.validateDosen,
    DosenController.create
);
MasterDataRoutes.put(
    "/dosen/:id",
    AuthMiddleware.checkJwt,
    DosenValidation.validateDosen,
    DosenController.update
);
MasterDataRoutes.delete(
    "/dosen",
    AuthMiddleware.checkJwt,
    DosenController.deleteByIds
);
MasterDataRoutes.post(
    "/dosen/bulk-upload",
    AuthMiddleware.checkJwt,
    DosenController.bulkUpload
);
// =====================

export default MasterDataRoutes;
