'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Verification extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // 定义与 User 的一对一关联关系
      Verification.belongsTo(models.User, {
        foreignKey: {
          name: 'userId',
          allowNull: false
        },
        as: 'user',
        unique: true // 一个用户只能有一条认证记录
      });
    }
  }
  Verification.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: '用户ID，关联User表'
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '企业名称'
    },
    licenseNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: '营业执照号'
    },
    contactName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '联系人姓名'
    },
    contactPhone: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '联系人电话'
    },
    licenseImage: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '营业执照图片URL'
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '所在城市'
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '企业地址'
    },
    industry: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '所属行业'
    },
    scale: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '企业规模'
    },
    website: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '企业官网'
    },
    otherQualifications: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '其他资质'
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
      allowNull: false,
      comment: '认证状态：pending-待审核，approved-已通过，rejected-已拒绝'
    },
    rejectionReason: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '拒绝原因'
    },
    submittedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
      comment: '提交时间'
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '审核时间'
    }
  }, {
    sequelize,
    modelName: 'Verification',
    tableName: 'Verifications',
    timestamps: true,
    createdAt: 'submittedAt',
    updatedAt: 'reviewedAt',
    comment: '企业认证表'
  });
  return Verification;
};