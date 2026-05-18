const express = require('express');
const { body } = require('express-validator');

const verificationController = require('../controllers/verificationController');
const { authenticateToken: auth } = require('../middlewares/auth');
const { roleGuard, adminGuard } = require('../middlewares/roleGuard');
const { handleValidationErrors } = require('../middlewares/validate');

const router = express.Router();

router.get('/status', auth, verificationController.getStatus);

router.post(
  '/apply',
  auth,
  roleGuard('employer'),
  [
    body('companyName')
      .trim()
      .notEmpty()
      .withMessage('企业名称不能为空')
      .isLength({ max: 100 })
      .withMessage('企业名称不能超过 100 个字符'),
    body('licenseNumber')
      .trim()
      .notEmpty()
      .withMessage('营业执照号不能为空')
      .isLength({ max: 50 })
      .withMessage('营业执照号不能超过 50 个字符'),
    body('contactName')
      .trim()
      .notEmpty()
      .withMessage('联系人姓名不能为空')
      .isLength({ max: 50 })
      .withMessage('联系人姓名不能超过 50 个字符'),
    body('contactPhone')
      .trim()
      .notEmpty()
      .withMessage('联系人电话不能为空')
      .matches(/^1[3-9]\d{9}$/)
      .withMessage('联系人电话格式不正确'),
    body('licenseImage')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 1000 })
      .withMessage('营业执照图片地址不能超过 1000 个字符'),
    body('licenseImageUpload')
      .optional({ checkFalsy: true })
      .isString()
      .withMessage('营业执照图片上传数据格式不正确'),
    body('address')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('地址不能超过 200 个字符'),
    body('city')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('城市不能超过 50 个字符'),
    body('industry')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('行业不能超过 50 个字符'),
    body('scale')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('规模不能超过 50 个字符'),
    body('website')
      .optional({ checkFalsy: true })
      .trim()
      .isURL()
      .withMessage('官网 URL 格式不正确'),
    body('otherQualifications')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('其他资质不能超过 1000 个字符')
  ],
  handleValidationErrors,
  verificationController.applyVerification
);

router.get('/stats', auth, adminGuard, verificationController.getAdminStats);
router.get('/pending', auth, adminGuard, verificationController.getPendingList);
router.get('/all', auth, adminGuard, verificationController.getAllVerifications);
router.get('/:id', auth, adminGuard, verificationController.getVerificationById);
router.post('/:id/approve', auth, adminGuard, verificationController.approveVerification);
router.post(
  '/:id/reject',
  auth,
  adminGuard,
  [
    body('reason')
      .trim()
      .notEmpty()
      .withMessage('拒绝原因不能为空')
      .isLength({ max: 500 })
      .withMessage('拒绝原因不能超过 500 个字符')
  ],
  handleValidationErrors,
  verificationController.rejectVerification
);
router.get('/:id/ai-audit', auth, adminGuard, verificationController.getAiAudit);

module.exports = router;
