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
import * as MahasiswaValidation from "$validations/master-data/mahasiswa";

const MasterDataRoutes = new Hono();

// ======= Shift =======
MasterDataRoutes.get(
    "/shift",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("SHIFT", "VIEW"),
    ShiftController.getAll
);
MasterDataRoutes.get(
    "/shift/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("SHIFT", "VIEW"),
    ShiftController.getById
);
MasterDataRoutes.post(
    "/shift",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("SHIFT", "CREATE"),
    ShiftValidation.validateShift,
    ShiftController.create
);
MasterDataRoutes.put(
    "/shift/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("SHIFT", "UPDATE"),
    ShiftValidation.validateShift,
    ShiftController.update
);
MasterDataRoutes.delete(
    "/shift",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("SHIFT", "DELETE"),
    ShiftController.deleteByIds
);
MasterDataRoutes.put(
    "/shift/:id/activate",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("SHIFT", "DELETE"),
    ShiftController.activate
);
// =====================

// ======= Ruangan =======
MasterDataRoutes.get(
    "/ruangan",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("RUANGAN", "VIEW"),
    RuanganController.getAll
);
MasterDataRoutes.post(
    "/ruangan",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("RUANGAN", "CREATE"),
    RuanganValidation.validateRuangan,
    RuanganController.create
);
MasterDataRoutes.get(
    "/ruangan/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("RUANGAN", "VIEW"),
    RuanganController.getById
);
MasterDataRoutes.put(
    "/ruangan/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("RUANGAN", "UPDATE"),
    RuanganValidation.validateRuangan,
    RuanganController.update
);
MasterDataRoutes.put(
    "/ruangan/:id/assign-kepala-lab",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("RUANGAN", "UPDATE"),
    RuanganValidation.validateAssignKepalaLab,
    RuanganController.assignKepalaRuangan
);

MasterDataRoutes.put(
    "/ruangan/:id/activate",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("RUANGAN", "DELETE"),
    RuanganController.activate
);
// =====================

// ======= MataKuliah =======
MasterDataRoutes.get(
    "/mata-kuliah",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MATA_KULIAH", "VIEW"),
    MataKuliahController.getAll
);
MasterDataRoutes.get(
    "/mata-kuliah/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MATA_KULIAH", "VIEW"),
    MataKuliahController.getById
);
MasterDataRoutes.post(
    "/mata-kuliah",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MATA_KULIAH", "CREATE"),
    MataKuliahValidation.validateMatakuliah,
    MataKuliahController.create
);
MasterDataRoutes.put(
    "/mata-kuliah/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MATA_KULIAH", "UPDATE"),
    MataKuliahValidation.validateMatakuliah,
    MataKuliahController.update
);
MasterDataRoutes.delete(
    "/mata-kuliah",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MATA_KULIAH", "DELETE"),
    MataKuliahController.deleteByIds
);
MasterDataRoutes.post(
    "/mata-kuliah/bulk-upload",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MATA_KULIAH", "BULK"),
    MataKuliahController.bulkUpload
);
// =====================

// ======= Mahasiswa =======
MasterDataRoutes.get(
    "/mahasiswa",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MAHASISWA", "VIEW"),
    MahasiswaController.getAll
);
MasterDataRoutes.get(
    "/mahasiswa/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MAHASISWA", "VIEW"),
    MahasiswaController.getById
);
MasterDataRoutes.post(
    "/mahasiswa",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MAHASISWA", "CREATE"),
    MahasiswaValidation.validateMahasiswa,
    MahasiswaController.create
);
MasterDataRoutes.put(
    "/mahasiswa/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MAHASISWA", "UPDATE"),
    MahasiswaValidation.validateMahasiswa,
    MahasiswaController.update
);
MasterDataRoutes.delete(
    "/mahasiswa",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MAHASISWA", "DELETE"),
    MahasiswaController.deleteByIds
);
MasterDataRoutes.post(
    "/mahasiswa/bulk-upload",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MAHASISWA", "BULK"),
    MahasiswaController.bulkUpload
);
// =====================

// ======= Dosen =======
MasterDataRoutes.get(
    "/dosen",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("DOSEN", "VIEW"),
    DosenController.getAll
);
MasterDataRoutes.get(
    "/dosen/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("DOSEN", "VIEW"),
    DosenController.getById
);
MasterDataRoutes.post(
    "/dosen",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("DOSEN", "CREATE"),
    DosenValidation.validateDosen,
    DosenController.create
);
MasterDataRoutes.put(
    "/dosen/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("DOSEN", "UPDATE"),
    DosenValidation.validateDosenUpdate,
    DosenController.update
);
MasterDataRoutes.delete(
    "/dosen",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("DOSEN", "DELETE"),
    DosenController.deleteByIds
);
MasterDataRoutes.post(
    "/dosen/bulk-upload",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("DOSEN", "BULK"),
    DosenController.bulkUpload
);
// =====================

export default MasterDataRoutes;
