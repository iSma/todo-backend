'use strict';

const DB = require('nedb');

module.exports.register = (server, options, next) => {
    server.app.db = new DB(options.db);
    server.app.db.loadDatabase((err) => {
        if (err) throw err;
        else return next();
    });
}

module.exports.register.attributes = {
    name: 'database',
    version: '1.0.0'
}
