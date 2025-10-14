const { DataTypes } = require("sequelize");
const sequelize = require("../utils/database");
const Service = require("./Service");

const ServiceLdapSetting = sequelize.define(
  "ServiceLdapSetting",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    service_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Service,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    ldap_url: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    base_dn: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    bind_dn: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    schema: "public",
    tableName: "service_ldap_settings",
    timestamps: false,
  }
);


module.exports = ServiceLdapSetting;
