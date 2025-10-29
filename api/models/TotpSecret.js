// models/TotpSecret.js
const { DataTypes } = require("sequelize");
const sequelize = require("../utils/database");

const TotpSecret = sequelize.define(
  "TotpSecret",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    service_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    secret_key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    freezeTableName: true, // <- this ensures Sequelize uses the exact table name
    timestamps: false,     // <- since you already have created_at
  }
);

module.exports = TotpSecret;
