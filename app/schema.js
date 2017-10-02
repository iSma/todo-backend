const Joi = require('joi');

module.exports.Todo = Joi.object({
    _id: Joi.string(),
    title: Joi.string(),
    completed: Joi.boolean().default(false),
    order: Joi.number().integer().default(0),
    url: Joi.string(),
    tags: Joi.array().items(Joi.string())
});

module.exports.TodoPost = Joi.object({
    title: Joi.string().required(),
    completed: Joi.boolean().default(false),
    order: Joi.number().integer().default(0),
    url: Joi.string(),
    tags: Joi.array().items(Joi.string())
});

module.exports.Tag = Joi.object({
    tag: Joi.string().min(1).required()
});
