import * as fs from 'fs-extra'
// import * as path from 'path'
import * as _ from 'lodash'
import * as replace from 'replace'

const typeMap = {
  INTEGER: 'integer',
  'INTEGER(11)': 'integer',
  BIGINT: 'integer',
  FLOAT: 'number',
  DOUBLE: 'number',
  BOOLEAN: 'boolean',
  TINYINT: 'boolean',
  VARCHAR: 'string',
  'VARCHAR(255)': 'string',
  CHAR: 'string',
  TIME: 'string',
  STRING: 'string',
  TEXT: 'string',

  JSON: 'object',
  JSONTYPE: 'object',
  JSONB: 'object',

  ARRAY: 'array',
  ENUM: 'string',
  DATE: 'string',
  DATETIME: 'string',
  DATEONLY: 'string',
}

export const cliTypesToSqlTypesMap: {[key: string]: any} = {
  integer: 'DataTypes.INTEGER',
  number: 'DataTypes.FLOAT',
  boolean: 'DataTypes.BOOLEAN',
  datetime: 'DataTypes.DATE',
  date: 'DataTypes.DATEONLY',
  string: 'DataTypes.STRING',
  text: 'DataTypes.TEXT',
  longtext: 'DataTypes.TEXT',
}

export const cliTypesToSchemaTypesMap: {[key: string]: any} = {
  integer: 'integer',
  number: 'number',
  boolean: 'boolean',
  datetime: 'string',
  date: 'string',
  string: 'string',
  text: 'string',
  longtext: 'string',
}
export function cliFieldToSequelizeField(field: {[key: string]: any}) {
  field.type = cliTypesToSqlTypesMap[field.type as any] || field.type
  return field
}
export function sequelizeFieldToSchemaField(fieldName: string, field: {[key: string]: any}) {
  if (!field.type) {
    console.error('field.type missing for', fieldName)
    throw new Error('missing_type_for field' + fieldName)
  }
  let type = field.type.toString()
  type = type.replace(/\(\d+\)/, '').replace(/(Sequelize|DataTypes)/i, '').replace('.', '')
  // @ts-ignore
  if (!typeMap[type]) {
    console.error('field.type', field.type, type)
    throw new Error('unkown_type_' + type)
  }

  const schema: any = {
    // @ts-ignore
    type: typeMap[type],
    column: {},
    field: {},
  }

  if (!field.allowNull && fieldName !== 'id') {
    if (!field.defaultValue) {
      schema.field.required = true
    }
  }
  if (field.defaultValue) {
    schema.default = field.defaultValue
    schema.field.default = field.defaultValue
  }

  switch (type) {
  case 'VARCHAR':
    schema.enum = field.type.values
    break
  case 'ENUM':
    schema.enum = field.type.values
    break
  case 'TEXT':
    schema.field.type = 'textArea'
    break
  case 'DATE':
    schema.field.format = 'date-time'
    schema.column.type = 'date'
    schema.field.type = 'dateTime'
    break
  case 'DATEONLY':
    schema.field.format = 'date-time'
    schema.column.type = 'datetime'
    schema.field.type = 'dateTime'
    schema.field.fieldOptions = {
      type: 'date',
    }
    break
  case 'TIME':
    schema.field.format = 'date-time'
    schema.field.type = 'dateTime'
    schema.field.fieldOptions = {
      type: 'time',
    }
    break
  case 'INTEGER':
    if (field.type.options) {
      schema.maxLength = field.type.options.length
    }
  }
  return schema
}

export function generateSchemaFromModel(
  file: string,
  target: string,
  options: any = {}
) {
  if (file.endsWith('.js') || file.endsWith('.js')) {
    const model = require(file)

    if (!model.entity) {
      console.error(file, model)
      throw new Error('missing_tablename_' + file)
    }
    const tableName = model.entity.options.tableName
    if (!tableName) {
      throw new Error('missing_tablename_' + tableName)
    }
    const destination: { [key: string]: any } = {
      identity: tableName,
      apiUrl: '/' + tableName,
      additionalProperties: false,
      autoValidate: true,
      automaticApi: false,
      primaryKeyField: null,
      displayField: null,
      schema: {
        $id: `http://acme.com/schemas/${tableName}.json`,
        type: 'object',
        properties: {},
        required: [],
      },
    }

    Object.keys(model.entity.attributes).forEach(key => {
      const field = model.entity.attributes[key]

      const schema: any = sequelizeFieldToSchemaField(key, field)

      if (!field.allowNull && key !== 'id') {
        destination.schema.required.push(key)
        if (!field.defaultValue) {
          schema.field.required = true
        }
      }
      console.log('schema', key, schema)
      destination.schema.properties[key] = schema
    })

    destination.admin = {
      name: null,
      namePlural: null,
      pageTitle: null,
      routerPath: null,
      options: null,
      actions: null,
      formOptions: null,
      listOptions: null,
      kanbanOptions: null,
      tableOptions: null,
      nestedModels: [],
    }
    if (
      model.entity &&
      model.entity.options &&
      model.entity.options.timestamps
    ) {
      ['createdOn', 'lastModifiedOn'].forEach((field: string) => {
        if (!destination.schema.properties[field]) {
          destination.schema.properties[field] = {
            type: 'string',
            format: 'date-time',
            column: {
              type: 'datetime',
            },
            field: {
              format: 'date-time',
              type: 'dateTime',
              readonly: true,
              disabled: true,
            },
          }
        }
      })
    }

    try {
      fs.writeFileSync(
        target,
        `

      module.exports = ${JSON.stringify(destination, null, 2)}`,
        {flag: options.force ? 'w' : 'wx'}
      )
    } catch (error) {
      console.warn('[MIGRATON]', `${tableName}.ts`, error.message)
    }
  }
}

export const migrateSequelizeModels = async (
  file: string,
  options: any = {}
) => {
  await replace({
    regex: /.*jshint indent: 1.*/,
    replacement: `
    const sequelize = require('sequelize');
    const { DataTypes } = sequelize;

    `,
    paths: [file],
    recursive: true,
    silent: true,
  })

  await replace({
    regex: 'module.exports = function.+\n.+\\(',
    replacement: `
    module.exports = {\n\tidentity:`,
    paths: [file],
    recursive: true,
    silent: true,
  })

  await replace({
    regex: /identity:(.+), {/,
    replacement: '\n\tidentity: $1,\n\tentity: {\n\t\tattributes:{\n\t\t',
    paths: [file],
    recursive: true,
    silent: true,
  })

  await replace({
    regex: `identity: '${options.tableName}'`,
    replacement: `identity: '${options.identity || _.lowerFirst(_.camelCase(options.tableName))}'`,
    paths: [file],
    recursive: true,
    silent: true,
  })

  await replace({
    regex: /}\);/,
    replacement: `}
  }
  `,
    paths: [file],
    recursive: true,
    silent: true,
  })

  await replace({
    regex: /DataTypes.INTEGER\(1\)/g,
    replacement: 'DataTypes.BOOLEAN',
    paths: [file],
    recursive: true,
    silent: true,
  })

  await replace({
    regex: /DataTypes.INTEGER\(.+\)/g,
    replacement: 'DataTypes.INTEGER',
    paths: [file],
    recursive: true,
    silent: true,
  })

  await replace({
    regex: /}, {/,
    replacement: `
    },
    associations: (models) => {
      // models.address.belongsTo(models.user, {
        //     foreignKey: 'userId',
        //     targetKey: 'id',
        // });
      },
      options: {
        `,
    paths: [file],
    recursive: true,
    silent: true,
  })
  if (options.schemas) {
    generateSchemaFromModel(file, file.replace('sequelize', 'schema'), options)
  }
  //   replace({
  //     regex: 'tableName',
  //     replacement: `
  //       freezeTableName: true,
  //       timestamps: true,
  //       createdAt: 'createdOn',
  //       updatedAt: 'lastModifiedOn',
  //       tableName`,
  //     paths: [file],
  //     recursive: true,
  //     silent: options.silent,
  //   });

  // replace({
  //   regex: "DataTypes",
  //   replacement: `Sequelize`,
  //   paths: [file],
  //   recursive: true,
  //   silent: false,
  // });
}
