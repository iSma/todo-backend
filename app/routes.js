'use strict';

const Joi = require('joi');
const Schema = require('./schema');

module.exports.register = (server, options, next) => {
    const db = server.app.db;

    const addDefaults = (todo) => {
        return {
            title: todo.title,
            order: todo.order || 0,
            completed: todo.completed || false,
            tags: todo.tags || []
        };
    };

    const clean = (todo) => {
        const clean = {};
        ['title', 'order', 'completed', 'tags'].forEach((key) => {
            if(todo[key] !== undefined)
                clean[key] = todo[key];
        });

        return clean;
    }

    const addUrl = (todo) => {
        todo.url = `${server.info.uri}/todos/${todo._id}`;
        return todo;
    };

    server.route({
        method: 'GET',
        path: '/todos',
        handler: (request, reply) => {
            const query = request.query.tag === undefined
                ? {}
                : {tags: {$elemMatch: request.query.tag}}

            db.find(query).sort({order: 1}).exec((err, docs) => {
                if (err) reply(err).code(500);
                else reply(docs.map(addUrl)).code(200);
            });
        },

        config: {
            tags: ['api'],
            description: 'List all todos',

            plugins: {
                validate: {
                    query: { tag: Joi.string().min(1) }
                },
                'hapi-swagger': {
                    'responses': {
                        200: {
                            description: 'Success',
                            schema: Joi.array().items(Schema.Todo.label('Result'))
                        }
                    }
                }
            }
        }
    });

    server.route({
        method: 'DELETE',
        path: '/todos',
        handler: (request, reply) => {
            db.remove({}, {multi: true}, (err, n) => {
                if (err) reply(err).code(500);
                else reply();
            });
        },

        config: {
            tags: ['api'],
            description: 'Delete all todos',

            plugins: {
                validate: {
                    query: { tag: Joi.string() }
                },
                'hapi-swagger': {
                    'responses': {
                        204: {description: 'Todos deleted'}
                    }
                }
            }
        }

    });

    server.route({
        method: 'POST',
        path: '/todos',
        handler: (request, reply) => {
            const todo = addDefaults(request.payload);

            db.insert(todo, (err, doc) => {
                if (err) reply(err).code(500);
                else reply(addUrl(doc)).code(201);
            });
        },

        config: {
            tags: ['api'],
            description: 'Create a todo',

            validate: {
                payload: Schema.TodoPost
            },

            plugins: {
                'hapi-swagger': {
                    'responses': {
                        201: {
                            description: 'Created',
                            schema: Schema.Todo.label('Result')
                        }
                    }
                }
            }
        }

    });

    server.route({
        method: 'GET',
        path: '/todos/{id}',
        handler: (request, reply) => {
            const id = request.params.id;
            db.findOne({_id: id}, (err, doc) => {
                if (err) reply(err).code(500);
                else if (doc === null) reply(`Todo '${id}' not found`).code(404);
                else reply(addUrl(doc)).code(200);
            });
        },

        config: {
            tags: ['api'],
            description: 'Get a specific todo',

            validate: {
                params: { id: Joi.string() }
            },

            plugins: {
                'hapi-swagger': {
                    'responses': {
                        200: {
                            description: 'Success',
                            schema: Schema.Todo.label('Result')
                        },
                        404: {description: 'Todo not found'}
                    }
                }
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/todos/{id}/tags',
        handler: (request, reply) => {
            const id = request.params.id;
            db.findOne({_id: id}, (err, doc) => {
                if (err) reply(err).code(500);
                else if (doc === null) reply(`Todo '${id}' not found`).code(404);
                else reply(doc.tags).code(200);
            });
        },

        config: {
            tags: ['api'],
            description: 'Get the tags of a specific todo',

            validate: {
                params: { id: Joi.string() }
            },

            plugins: {
                'hapi-swagger': {
                    'responses': {
                        200: {
                            description: 'Success',
                            schema: Joi.array().items(Joi.string()).label('Result')
                        },
                        404: {description: 'Todo not found'}
                    }
                }
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/todos/{id}/tags',
        handler: (request, reply) => {
            const id = request.params.id;
            db.update({_id: id},
                      {$addToSet: {tags: request.payload.tag}},
                      {returnUpdatedDocs: true},
                      (err, doc) => {
                          if (err) reply(err).code(500);
                          else if (doc === null) reply(`Todo '${id}' not found`).code(404);
                          else reply(doc.tags).code(200);
                      });
        },

        config: {
            tags: ['api'],
            description: 'Add a tag to a todo',

            validate: {
                params: { id: Joi.string() },
                payload: { tag: Joi.string().min(1).required() }
            },

            plugins: {
                'hapi-swagger': {
                    'responses': {
                        200: {
                            description: 'Success',
                            schema: Joi.array().items(Joi.string()).label('Result')
                        },
                        404: {description: 'Todo not found'}
                    }
                }
            }
        }
    });

    server.route({
        method: 'DELETE',
        path: '/todos/{id}/tags/{tag}',
        handler: (request, reply) => {
            const id = request.params.id;
            db.update({_id: id},
                      {$pull: {tags: request.params.tag}},
                      {returnUpdatedDocs: true},
                      (err, doc) => {
                          if (err) reply(err).code(500);
                          else if (doc === null) reply(`Todo '${id}' not found`).code(404);
                          else reply(doc.tags).code(200);
                      });
        },

        config: {
            tags: ['api'],
            description: 'Remove a tag from a todo',

            validate: {
                params: { id: Joi.string(), tag: Joi.string().min(1) }
            },

            plugins: {
                'hapi-swagger': {
                    'responses': {
                        200: {
                            description: 'Success',
                            schema: Joi.array().items(Joi.string()).label('Result')
                        },
                        404: {description: 'Todo not found'}
                    }
                }
            }
        }
    });

    server.route({
        method: 'PATCH',
        path: '/todos/{id}',
        handler: (request, reply) => {
            const id = request.params.id;
            const update = clean(request.payload);

            db.update({_id: id},
                      {$set: update},
                      {returnUpdatedDocs: true},
                      (err, n, doc) => {
                          if (err) reply(err).code(500);
                          else if (doc === null) reply(`Todo '${id}' not found`).code(404);
                          else reply(addUrl(doc)).code(200);
                      });
        },

        config: {
            tags: ['api'],
            description: 'Update a todo',

            validate: {
                params: { id: Joi.string() },
                payload: Schema.Todo
            },

            plugins: {
                'hapi-swagger': {
                    'responses': {
                        200: {
                            description: 'Success',
                            schema: Schema.Todo.label('Result')
                        },
                        404: {description: 'Todo not found'}
                    }
                }
            }
        }

    });

    server.route({
        method: 'DELETE',
        path: '/todos/{id}',
        handler: (request, reply) => {
            const id = request.params.id;
            db.remove({_id: id}, {}, (err, n) => {
                if (err) reply(err).code(500);
                else if (n === 0) reply(`Todo '${id}' not found`).code(404);
                else reply().code(204);
            });
        },

        config: {
            tags: ['api'],
            description: 'Delete a todo',

            validate: {
                params: { id: Joi.string() },
            },

            plugins: {
                'hapi-swagger': {
                    'responses': {
                        204: {description: 'Todo deleted'},
                        404: {description: 'Todo not found'}
                    }
                }
            }
        }

    });

    server.route({
        method: 'GET',
        path: '/tags',
        handler: (request, reply) => {
            db.find({}, (err, docs) => {
                if (err) {
                    reply(err).code(500);
                    return;
                }

                const tags = docs.map((doc) => doc.tags)
                .reduce((tags, i) => tags.concat(i))
                .reduce((tags, i) => tags.add(i), new Set());

                reply(Array.from(tags).sort()).code(200);
            });
        },

        config: {
            tags: ['api'],
            description: 'List all tags',

            plugins: {
                'hapi-swagger': {
                    'responses': {
                        200: {
                            description: 'Success',
                            schema: Joi.array().items(Joi.string().lowercase()).unique()
                        }
                    }
                }
            }
        }

    });

    server.route({
        method: 'GET',
        path: '/tags/{tag}',
        handler: (request, reply) => {
            const tag = request.params.tag
            db.find({tags: {$elemMatch: tag}}, (err, docs) => {
                if (err) reply(err).code(500);
                else if (docs.length === 0) reply(`Tag '${tag}' not found`).code(404);
                else reply({tag}).code(200);
            });
        },

        config: {
            tags: ['api'],
            description: 'Get a specific tag',

            validate: {
                params: { tag: Joi.string() }
            },

            plugins: {
                'hapi-swagger': {
                    'responses': {
                        200: {
                            description: 'Success',
                            schema: {tag: Joi.string().lowercase()}
                        }
                    }
                }
            }
        }

    });

    server.route({
        method: 'GET',
        path: '/tags/{tag}/todos',
        handler: (request, reply) => {
            const tag = request.params.tag
            db.find({tags: {$elemMatch: tag}}, (err, docs) => {
                if (err) reply(err).code(500);
                else if (docs.length === 0) reply(`Tag '${tag}' not found`).code(404);
                else reply(docs.map(addUrl)).code(200);
            });
        },

        config: {
            tags: ['api'],
            description: 'List all todos with the given tag',

            validate: {
                params: { tag: Joi.string() }
            },

            plugins: {
                'hapi-swagger': {
                    'responses': {
                        200: {
                            description: 'Success',
                            schema: Joi.array().items(Schema.Todo.label('Result'))
                        }
                    }
                }
            }
        }

    });

    return next();
}

module.exports.register.attributes = {
    name: 'routes',
    version: '1.0.0',
    dependencies: 'database'
}
