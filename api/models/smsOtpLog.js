// models/smsOtpLog.js
const { DataTypes } = require("sequelize");
const sequelize = require("../utils/database"); // make sure path is correct

const SmsOtpLog = sequelize.define(
  "SmsOtpLog",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // optional if you don’t track users
    },
    service_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    mobile_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    otp_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    provider_message_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending", // pending, sent, used, failed
    },
    error_message: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    attempt_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    is_used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    schema: "public",
    tableName: "sms_otp_logs",
    timestamps: false,
  }
);

module.exports = SmsOtpLog;
