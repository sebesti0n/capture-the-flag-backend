exports.up = function(knex) {
    return knex.schema.alterTable('questions', function(table){
      table.text('riddleImageLink').defaultTo("null");
    })
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.alterTable('questions',function(table){
      table.dropColumns(['riddleImageLink']);
    })
  };