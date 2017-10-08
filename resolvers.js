import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PubSub } from 'graphql-subscriptions';
import joinMonster from 'join-monster';
import _ from 'lodash';
import { requiresAdmin, requiresAuth } from './permissions';
import { refreshTokens, tryLogin } from './auth';

const pubsub = new PubSub();

const USER_ADDED = 'USER_ADDED';

export default {
    Subscription: {
        userAdded: {
            subscribe: () => pubsub.asyncIterator(USER_ADDED)
        }
    },
    User: {
        boards: (parent, args, { models }) => models.Board.findAll({
            where: {
                owner: parent.id
            }
        }),
        suggestions: (parent, args, { models }) => models.Suggestion.findAll({
            where: {
                creatorId: parent.id
            }
        }),
    },
    Board: {
        suggestions: (parent, args, { suggestionLoader }) => {
            return suggestionLoader.load(parent.id)
            // return models.Suggestion.findAll({
            //     where: {
            //         boardId: parent.id
            //     }
            // })
        },
    },
    Suggestion: {
        creator: (parent, args, { models }) => {
            return models.User.findOne({
                where: {
                    id: parent.creatorId
                }
            })
        },
    },
    Query: {
        dummy: (parent, args, { models }, info) => 'dummy',
        allAuthors: (parent, args, { models }, info) =>
        // It doesn't run sql for you, it tells you what should be and then we are going to
        // run using sequlize, just map graphql query into sql statement
            joinMonster(info, args, sql =>
                models.sequelize.query(sql, { type: models.sequelize.QueryTypes.SELECT }),
                { dialect: 'pg' }
            ),
        getBook: (parent, args, { models }, info) =>
            joinMonster(info, args, sql =>
                models.sequelize.query(sql, { type: models.sequelize.QueryTypes.SELECT }),
                { dialect: 'pg' }
            ),
        allBooks: (parent, args, { models }, info) =>
            joinMonster(info, args, sql =>
                models.sequelize.query(sql, { type: models.sequelize.QueryTypes.SELECT }),
                { dialect: 'pg' }
            ),
        allUsers: requiresAuth.createResolver((parent, args, { models }) => models.User.findAll()),
        // allUsers: (parent, args, { models }) => models.User.findAll(),
        me: (parent, args, { models, user }) => {
            if(!user) {
                return null
            }
            return models.User.findOne({ where: {
                id: user.id
            }})
        },
        userBoards: (parent, { owner }, { models }) => {
            return models.Board.findAll({ where: {
                owner
            }})
        },
        userSuggestions: (parent, { creatorId }, { models }) => {
            return models.Suggestion.findAll({ where: {
                creatorId
            }})
        },
        suggestions: (parent, { limit, offset }, { models }) =>
            models.Suggestion.findAll({ limit, offset })
    }
    ,
    Mutation: {
        createUser: async (parent, args, { models }) =>  {
            const user = args;
            user.password = 'fadi'
            // user.password = await bcrypt.hash(user.password, 12);
            const userAdded = await models.User.create(user);
            pubsub.publish(USER_ADDED, {
                userAdded
            })
            return userAdded;
        },
        updateUser: (parent, { newUsername, username }, { models }) => models.User.update({
            username: newUsername
        }, { where: { username }}),
        deleteUser: (parent, args, { models }) => models.User.destroy({ where: args}),
        // createBoard: requiresAuth.createResolver((parent, args, { models }) =>
        //     models.Board.create(args)),
        createBoard: (parent, args, { models }) =>
            models.Board.create(args),
        createSuggestion: (parent, args, { models }) => models.Suggestion.create(args),
        register: async (parent, args, { models }) => {
            const user = _.pick(args, ['username', 'isAdmin']);
            const localAuth = _.pick(args, ['email', 'password']);
            const passwordPromise = bcrypt.hash(localAuth.password, 12);
            const createUserPromise = models.User.create(user);
            const [password, createdUser] = await Promise.all([passwordPromise, createUserPromise]);
            localAuth.password = password;
            return models.LocalAuth.create({
                ...localAuth,
                user_id: createdUser.id,
            });
        },
        login: async (parent, { email, password }, { models, SECRET }) => {
            return  tryLogin(email, password, models, SECRET)
        },
        refreshTokens: (parent, { token, refreshToken }, { models, SECRET }) =>
            refreshTokens(token, refreshToken, models, SECRET),
        createBook: async (parent, args, { models }) => {
            const book = await models.Book.create(args);
            return {
                ...book.dataValues,
                authors: [],
            };
        },
        createAuthor: async (parent, args, { models }) => {
            const author = await models.Author.create(args);
            return {
                ...author.dataValues,
                books: [],
            };
        },
        addBookAuthor: async (parent, args, { models }) => {
            await models.BookAuthor.create(args);
            return true;
        },
        uploadFile: async (parent, args, { models }) => {
            return {}
        }
    }
}