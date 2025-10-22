const { DataTypes } = require("sequelize");
const sequelize = require("../utils/database");
const Service = require("./Service"); // import Service for foreign key association

const LoginToken = sequelize.define(
  "LoginToken",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    service_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Service,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    access_token: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    ip_address: {
      type: DataTypes.STRING(50),
    },
    user_agent: {
      type: DataTypes.TEXT,
    },
    login_time: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    logout_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: "ACTIVE",
    },
  },
  {
    schema: "public",
    tableName: "login_tokens",
    timestamps: false,
  }
);

module.exports = LoginToken;
