
exports.up = function(knex) {
    console.log('Creating users table...');
    return knex.schema.createTable('backupWebsite', function (table) {
        table.increments('user_id').primary();
        table.text('link').notNullable();
      });
};

exports.down = function(knex) {
    return knex.schema.dropTable('backupWebsite');
};

