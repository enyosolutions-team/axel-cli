/**
 * <%= filename %>
 *
 * @description :: This is model file that connects with sequelize.
 *                 TODO: You might write a short summary of
 *                 how this model works and what it represents here.
 */

const Sequelize = require('sequelize');

/*
  // event hooks => http://docs.sequelizejs.com/manual/tutorial/hooks.html
  const eventCallback = () => { // items, options
    // do something like stringifying data...
  };
*/

const <%= entityClass %> = {
  identity: '<%= entity %>',
  entity: {
    attributes: {
      _id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      <% for (var i = 0; i < fields.length; i++) { %>
      <%=fields[i] %>: {
        type: Sequelize.STRING,
      },<% } %>

      createdBy: {
        type: Sequelize.INTEGER,
      },
      lastModifiedBy: {
        type: Sequelize.INTEGER,
      }
    },
    options: {
      // disable the modification of tablenames; By default, sequelize will automatically
      // transform all passed model names (first parameter of define) into plural.
      // if you don't want that, set the following
      freezeTableName: true,
      // Table Name
      tableName: '<%= entity %>',
      // Enable TimeStamp
      timestamps: true,
      // createdAt should be createdOn
      createdAt: 'createdOn',
      // updatedAt should be lastModifiedOn
      updatedAt: 'lastModifiedOn',
      // Hooks. see => http://docs.sequelizejs.com/manual/tutorial/hooks.html
      hooks: {
        // beforeSave: eventCallback,
        // beforeValidate: eventCallback,
        // afterFind: eventCallback,
        // beforeBulkCreate: eventCallback,
        // beforeBulkUpdate: eventCallback,
      },
      indexes: [
      // {
      //  unique: false,
      //  fields: ['userId'],
      // },
      ]
    },
    // Create relations
    // @ts-ignore
    associations: (models) => {
      //  models.user.hasMany(models.<%= entity %>, {
      //   foreignKey: 'createdBy',
      //   targetKey: 'id'
      // });
    },
    // define default join
    // @ts-ignore
    defaultScope: (models) => ({

    }),
  }
};

export default <%= entityClass %>;