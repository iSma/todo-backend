'use strict';

const Hapi = require('hapi');
const Config = require('./config');

const server = new Hapi.Server();
server.connection(Config.connection);

const plugins = [
    { register: require('./database.js'), options: {db: Config.db} },
    { register: require('./routes.js') },

    { register: require('inert') },
    { register: require('vision') },

    {
        register: require('hapi-swagger'),
        options: {
            info: {
                'title': 'Todo API',
                'version': '1.0',
                'description': 'An enhanced TODO API',
            },
            documentationPath: '/doc',
            tags: [
                {
                    description: 'TODO operations',
                    name: 'todos'
                },
                {
                    description: 'Tag queries',
                    name: 'tags'
                },
            ]
        }
    }
]

server.register(plugins, (err) => {
    if (err) throw err;
    server.start((err) => {
        if (err) throw err;
        console.log(`Server running at: ${server.info.uri}`);
    });
});

