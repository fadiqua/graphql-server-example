import express from 'express';
import bodyParser from 'body-parser';
import { graphiqlExpress, graphqlExpress } from 'graphql-server-express';
import { makeExecutableSchema } from 'graphql-tools';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import _ from 'lodash';
import { createServer } from 'http';
import { execute, subscribe } from 'graphql';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import DataLoader from 'dataloader';
import passport from 'passport';
import FacebookStrategy from 'passport-facebook';

import typeDefs from './schema';
import resolvers from './resolvers';
import models from './models';
import { refreshTokens } from './auth';

const SECRET = 'fadiquader';

const app = express();

passport.use(new FacebookStrategy({
    clientID: '158671718005040',
    clientSecret: 'd77d4d987465ffe867cebaea592f57b2',
    callbackURL: 'http://localhost:3091/auth/facebook/callback'
}, async (accessToken, refreshToken, profile, cb) => {
    const { id, displayName } = profile;
    const fbUsers = await models.FbAuth.findAll({ limit: 1, where: { fb_id: id }});
    if(!fbUsers.length){
        const user = await models.User.create();
        await models.FbAuth.create({
            fb_id: id,
            display_name: displayName,
            user_id: user.id,
        });
    }
    cb(null, {})
}));
app.use(passport.initialize())
app.get('/flogin', passport.authenticate('facebook'));
app.get('/auth/facebook/callback', passport.authenticate('facebook', {
    failureRedirect: '/login',
    session: false
}), (req, res) => {
    res.send('Auth was good')
})
const addUser = async (req, res, next) => {
    const token = req.headers['x-token'];
    if (token) {
        try {
            const { user } = jwt.verify(token, SECRET);
            req.user = user;
        } catch (err) {
            const refreshToken = req.headers['x-refresh-token'];
            const newTokens = await refreshTokens(
                token,
                refreshToken,
                models,
                SECRET,
            );
            if (newTokens.token && newTokens.refreshToken) {
                res.set('Access-Control-Expose-Headers', 'x-token, x-refresh-token');
                res.set('x-token', newTokens.token);
                res.set('x-refresh-token', newTokens.refreshToken);
            }
            req.user = newTokens.user;
        }
    }
    next();
};
app.use(cors('*'));
app.use(addUser);

const schema = makeExecutableSchema({
    typeDefs,
    resolvers
});

app.use(
    '/graphiql',
    graphiqlExpress({
        endpointURL: '/graphql',
    }),
);

const batchSuggestions = async (keys, { Suggestion }) => {
    const suggestions = Suggestion.findAll({
        raw: true,
        where: {
            boardId: {
                $in: keys
            }
        }
    })
    const qs = _.groupBy(suggestions, 'boardId')
    return keys.map(k => qs[k] || [])
}
app.use(
    '/graphql',
    bodyParser.json(),
    graphqlExpress(req => ({
        schema,
        context: {
            models,
            SECRET,
            user: req.user || null,
            suggestionLoader: new DataLoader(keys => batchSuggestions(keys, models))
        },
    })),
);

const server = createServer(app);

models.sequelize.sync().then(() => {
    server.listen(3091, () => {
        new SubscriptionServer({
            execute,
            subscribe,
            schema,
        }, {
            server,
            path: '/subscriptions',
        });
    })
});
