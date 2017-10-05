import Sequelize from 'sequelize';

const sequelize = new Sequelize(
    // process.env.DB_NAME,
    // process.env.test_graphql_admin,
    // process.env.DB_PASSWORD,
    'test_graphql_db', 'test_graphql_admin', 'iamapassword',
    {
        host: 'localhost',
        dialect: 'postgres',
    },
);

const db = {
    User: sequelize.import('./user'),
    Board: sequelize.import('./board'),
    Suggestion: sequelize.import('./suggestion'),
    FbAuth: sequelize.import('./fbAuth'),
    LocalAuth: sequelize.import('./localAuth'),
    Author: sequelize.import('./author'),
    Book: sequelize.import('./book'),
    BookAuthor: sequelize.import('./bookAuthor'),
};

Object.keys(db).forEach((modelName) => {
    if ('associate' in db[modelName]) {
        db[modelName].associate(db);
    }
});
// instructions
// createdb test_graphql_db
// psql test_graphql_db
// CREATE USER test_graphql_admin WITH PASSWORD 'iamapassword';
// GRANT ALL PRIVILEGES ON DATABASE "test_graphql_db" to test_graphql_admin;

// Object.keys(db).forEach((modelName) => {
//   if ('associate' in db[modelName]) {
//     db[modelName].associate(db);
//   }
// });

db.sequelize = sequelize;
// db.Sequelize = Sequelize;

export default db;