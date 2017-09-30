import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PubSub } from 'graphql-subscriptions';
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
        allUsers: (parent, args, { models }) => models.User.findAll(),
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
        }
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
        createBoard: requiresAuth.createResolver((parent, args, { models }) =>
            models.Board.create(args)),
        createSuggestion: (parent, args, { models }) => models.Suggestion.create(args),
        register: async (parent, args, { models }) => {
            // const user =
            const user = _.pick(args, ['username','isAdmin'])
            const localAuth = _.pick(args, ['email','password']);
            const passwordPromise = bcrypt.hash(localAuth.password, 12);
            const createUserPromise = models.User.create(user);
            // localAuth.password = await bcrypt.hash(localAuth.password, 12)
            // const createdUser = await models.User.create(user);
            const [ password, createdUser ] = Promise.all(passwordPromise, createUserPromise);
            localAuth.password = password;
            return models.LocalAuth.create({
                ...localAuth,
                user_id: createdUser.id
            })
        },
        login: async (parent, { email, password }, { models, SECRET }) => {
            return  tryLogin(email, password, models, SECRET)
        },
        refreshTokens: (parent, { token, refreshToken }, { models, SECRET }) =>
            refreshTokens(token, refreshToken, models, SECRET),
    }
}